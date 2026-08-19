import { eq, sql } from "drizzle-orm";

import type { CoachChatMessage } from "@/lib/coach/daily-summary";
import { db } from "@/lib/db";
import { coachChats } from "@/lib/db/schema";

let coachChatTableReady: Promise<void> | undefined;

function ensureCoachChatTable() {
	coachChatTableReady ??= db
		.execute(sql`
			CREATE TABLE IF NOT EXISTS coach_chats (
				date date PRIMARY KEY,
				messages jsonb NOT NULL,
				updated_at timestamptz NOT NULL DEFAULT now()
			)
		`)
		.then(() => undefined);
	return coachChatTableReady;
}

export async function getCoachChat(date: string) {
	await ensureCoachChatTable();
	const [chat] = await db
		.select()
		.from(coachChats)
		.where(eq(coachChats.date, date))
		.limit(1);
	return chat;
}

export async function saveCoachChat(
	date: string,
	messages: CoachChatMessage[],
) {
	await ensureCoachChatTable();
	const updatedAt = new Date();
	await db
		.insert(coachChats)
		.values({ date, messages, updatedAt })
		.onConflictDoUpdate({
			target: coachChats.date,
			set: { messages, updatedAt },
		});
}

export async function clearCoachChat(date: string) {
	await ensureCoachChatTable();
	await db.delete(coachChats).where(eq(coachChats.date, date));
}
