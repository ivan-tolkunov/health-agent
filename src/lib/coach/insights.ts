import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { dailyInsights } from "@/lib/db/schema";

export async function getDailyInsight(date: string) {
	const [insight] = await db
		.select()
		.from(dailyInsights)
		.where(eq(dailyInsights.date, date))
		.limit(1);
	return insight;
}

export async function saveDailyInsight(date: string, summary: string) {
	const generatedAt = new Date();
	await db
		.insert(dailyInsights)
		.values({ date, summary, generatedAt })
		.onConflictDoUpdate({
			target: dailyInsights.date,
			set: { summary, generatedAt },
		});
}
