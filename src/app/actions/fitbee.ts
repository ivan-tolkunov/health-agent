"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { db, ensureDatabase } from "@/lib/db";
import { nutritionFoods, nutritionImports } from "@/lib/db/schema";
import { FitBeeParseError, parseFitBeeText } from "@/lib/fitbee/parser";

export type FitBeeImportState = {
	status: "idle" | "error" | "success";
	message: string;
	reportDate?: string;
};

export async function importFitBeeText(
	_previousState: FitBeeImportState,
	formData: FormData,
): Promise<FitBeeImportState> {
	const value = formData.get("fitbeeText");
	if (typeof value !== "string") {
		return { status: "error", message: "Paste a FitBee text export first." };
	}
	if (value.length > 100_000) {
		return {
			status: "error",
			message: "The FitBee export is unexpectedly large.",
		};
	}

	let report;
	try {
		report = parseFitBeeText(value);
	} catch (error) {
		if (error instanceof FitBeeParseError) {
			return { status: "error", message: error.message };
		}
		throw error;
	}

	await ensureDatabase();
	const importId = randomUUID();
	await db.transaction(async (transaction) => {
		await transaction.insert(nutritionImports).values({
			id: importId,
			reportDate: report.reportDate,
			calories: Math.round(report.calories),
			targetCalories: Math.round(report.targetCalories),
			proteinGrams: report.proteinGrams,
			carbsGrams: report.carbsGrams,
			fatGrams: report.fatGrams,
			steps: report.steps === null ? null : Math.round(report.steps),
			rawText: value,
		});

		await transaction.insert(nutritionFoods).values(
			report.foods.map((food) => ({
				id: randomUUID(),
				importId,
				meal: food.meal,
				position: food.position,
				description: food.description,
				calories: food.calories,
				proteinGrams: food.proteinGrams,
				carbsGrams: food.carbsGrams,
				fatGrams: food.fatGrams,
			})),
		);
	});

	revalidatePath("/");
	return {
		status: "success",
		message: `Imported ${report.calories} kcal and ${report.foods.length} foods for ${report.reportDate}.`,
		reportDate: report.reportDate,
	};
}
