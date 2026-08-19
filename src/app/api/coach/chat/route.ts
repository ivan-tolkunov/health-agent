import { clearCoachChat, getCoachChat, saveCoachChat } from "@/lib/coach/chat";
import {
	DailySummaryError,
	getCoachModels,
	streamCoachChatResponse,
	type CoachChatMessage,
	type CoachModel,
} from "@/lib/coach/daily-summary";
import { getCoachDayData } from "@/lib/dashboard/day";
import { ensureDatabase } from "@/lib/db";

function isDashboardDate(value: unknown): value is string {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	return new Date(`${value}T12:00:00Z`).toISOString().startsWith(value);
}

function getRequestDate(request: Request) {
	try {
		return new URL(request.url).searchParams.get("date");
	} catch {
		return null;
	}
}

function parseModel(value: unknown): CoachModel | undefined {
	if (!value || typeof value !== "object") return undefined;
	const { provider, id, name } = value as Record<string, unknown>;
	if (
		typeof provider !== "string" ||
		typeof id !== "string" ||
		typeof name !== "string" ||
		!provider ||
		!id
	) {
		return undefined;
	}
	return { provider, id, name };
}

function parseMessages(value: unknown): CoachChatMessage[] | undefined {
	if (!Array.isArray(value) || value.length === 0) return undefined;

	const messages = value
		.slice(-12)
		.map((message): CoachChatMessage | undefined => {
			if (!message || typeof message !== "object") return undefined;
			const { role, content } = message as Record<string, unknown>;
			if (
				(role !== "user" && role !== "assistant") ||
				typeof content !== "string"
			) {
				return undefined;
			}
			const text = content.trim().slice(0, 4_000);
			return text ? { role, content: text } : undefined;
		});

	return messages.every((message) => message !== undefined)
		? messages
		: undefined;
}

export async function GET(request: Request) {
	const date = getRequestDate(request);
	if (date !== null && !isDashboardDate(date)) {
		return Response.json(
			{ error: "A valid dashboard date is required." },
			{ status: 400 },
		);
	}

	try {
		const models = await getCoachModels().catch(() => []);
		if (!date) return Response.json({ models, messages: [] });
		await ensureDatabase();
		const chat = await getCoachChat(date);
		return Response.json({ models, messages: chat?.messages ?? [] });
	} catch {
		return Response.json(
			{ error: "Pi chat could not be loaded." },
			{ status: 503 },
		);
	}
}

export async function DELETE(request: Request) {
	const date = getRequestDate(request);
	if (!isDashboardDate(date)) {
		return Response.json(
			{ error: "A valid dashboard date is required." },
			{ status: 400 },
		);
	}

	try {
		await ensureDatabase();
		await clearCoachChat(date);
		return new Response(null, { status: 204 });
	} catch {
		return Response.json(
			{ error: "The chat could not be cleared. Please try again." },
			{ status: 503 },
		);
	}
}

export async function POST(request: Request) {
	let body: { date?: unknown; messages?: unknown; model?: unknown };
	try {
		body = await request.json();
	} catch {
		return Response.json(
			{ error: "A chat request is required." },
			{ status: 400 },
		);
	}

	const messages = parseMessages(body.messages);
	const model = body.model === undefined ? undefined : parseModel(body.model);
	if (
		!isDashboardDate(body.date) ||
		!messages ||
		messages.at(-1)?.role !== "user" ||
		(body.model !== undefined && !model)
	) {
		return Response.json(
			{ error: "A valid chat message and date are required." },
			{ status: 400 },
		);
	}

	const date = body.date;
	try {
		await ensureDatabase();
		const records = await getCoachDayData(date);
		const encoder = new TextEncoder();
		let answer = "";
		const response = streamCoachChatResponse(
			{ date, records },
			messages,
			model,
			request.signal,
		);
		return new Response(
			new ReadableStream({
				async pull(controller) {
					try {
						const chunk = await response.next();
						if (chunk.done) {
							if (answer.trim()) {
								await saveCoachChat(date, [
									...messages,
									{ role: "assistant", content: answer.trim() },
								]);
							}
							controller.close();
						} else {
							answer += chunk.value;
							controller.enqueue(encoder.encode(chunk.value));
						}
					} catch (error) {
						controller.error(error);
					}
				},
			}),
			{
				headers: {
					"Content-Type": "text/plain; charset=utf-8",
					"Cache-Control": "no-cache, no-transform",
				},
			},
		);
	} catch (error) {
		const message =
			error instanceof DailySummaryError
				? error.message
				: "The coach could not respond. Please try again.";
		return Response.json({ error: message }, { status: 503 });
	}
}
