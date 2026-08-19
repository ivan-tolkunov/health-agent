"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db, ensureDatabase } from "@/lib/db";
import { weightEntries } from "@/lib/db/schema";

const weightSchema = z.object({
	date: z.iso.date(),
	weightKg: z.coerce.number().min(30).max(300),
});

export type WeightLogState = {
	status: "idle" | "error" | "success";
	message: string;
	date?: string;
	weightKg?: number;
};

export async function logWeight(
	_previousState: WeightLogState,
	formData: FormData,
): Promise<WeightLogState> {
	const result = weightSchema.safeParse({
		date: formData.get("date"),
		weightKg: formData.get("weightKg"),
	});
	if (!result.success) {
		return {
			status: "error",
			message: "Enter a valid weight between 30 and 300 kg.",
		};
	}

	await ensureDatabase();
	await db.insert(weightEntries).values({
		id: randomUUID(),
		measuredDate: result.data.date,
		weightKg: Math.round(result.data.weightKg * 10) / 10,
	});
	revalidatePath("/");

	return {
		status: "success",
		message: `Logged ${result.data.weightKg.toFixed(1)} kg.`,
		date: result.data.date,
		weightKg: result.data.weightKg,
	};
}
