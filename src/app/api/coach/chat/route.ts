import {
	DailySummaryError,
	generateCoachChatResponse,
	type CoachChatMessage,
} from "@/lib/coach/daily-summary";
import { getCoachDayData } from "@/lib/dashboard/day";
import { ensureDatabase } from "@/lib/db";

function isDashboardDate(value: unknown): value is string {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	return new Date(`${value}T12:00:00Z`).toISOString().startsWith(value);
}

function parseMessages(value: unknown): CoachChatMessage[] | undefined {
	if (!Array.isArray(value) || value.length === 0) return undefined;

	const messages = value
		.slice(-12)
		.map((message): CoachChatMessage | undefined => {
			if (!message || typeof message !== "object") return undefined;
			const { role, content } = message as Record<string, unknown>;
			if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
				return undefined;
			}
			const text = content.trim().slice(0, 4_000);
			return text ? { role, content: text } : undefined;
		});

	return messages.every((message) => message !== undefined)
		? messages
		: undefined;
}

export async function POST(request: Request) {
	let body: { date?: unknown; messages?: unknown };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "A chat request is required." }, { status: 400 });
	}

	const messages = parseMessages(body.messages);
	if (!isDashboardDate(body.date) || !messages || messages.at(-1)?.role !== "user") {
		return Response.json({ error: "A valid chat message and date are required." }, { status: 400 });
	}

	try {
		await ensureDatabase();
		const records = await getCoachDayData(body.date);
		const message = await generateCoachChatResponse(
			{ date: body.date, records },
			messages,
		);
		return Response.json({ message });
	} catch (error) {
		const message =
			error instanceof DailySummaryError
				? error.message
				: "The coach could not respond. Please try again.";
		return Response.json({ error: message }, { status: 503 });
	}
}
