import { getCoachDayData } from "@/lib/dashboard/day";
import { saveDailyInsight } from "@/lib/coach/insights";
import {
	DailySummaryError,
	generateDailySummary,
} from "@/lib/coach/daily-summary";
import { ensureDatabase } from "@/lib/db";

function isDashboardDate(value: unknown): value is string {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	return new Date(`${value}T12:00:00Z`).toISOString().startsWith(value);
}

export async function POST(request: Request) {
	let body: { date?: unknown };
	try {
		body = await request.json();
	} catch {
		return Response.json(
			{ error: "A dashboard date is required." },
			{ status: 400 },
		);
	}

	if (!isDashboardDate(body.date)) {
		return Response.json(
			{ error: "A valid dashboard date is required." },
			{ status: 400 },
		);
	}

	try {
		await ensureDatabase();
		const records = await getCoachDayData(body.date);
		const summary = await generateDailySummary({ date: body.date, records });
		await saveDailyInsight(body.date, summary);

		return Response.json({ summary });
	} catch (error) {
		const message =
			error instanceof DailySummaryError
				? error.message
				: "The daily insight could not be created. Please try again.";
		return Response.json({ error: message }, { status: 503 });
	}
}
