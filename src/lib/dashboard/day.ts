import { and, desc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { torontoDateForInstant } from "@/lib/dashboard/date";
import {
	nutritionFoods,
	nutritionImports,
	weightEntries,
	whoopCycles,
	whoopRecoveries,
	whoopSleeps,
	whoopWorkouts,
} from "@/lib/db/schema";

export async function getCalorieProgress() {
	const [imports, cycles] = await Promise.all([
		db
			.select({
				reportDate: nutritionImports.reportDate,
				calories: nutritionImports.calories,
			})
			.from(nutritionImports)
			.orderBy(
				desc(nutritionImports.reportDate),
				desc(nutritionImports.importedAt),
			),
		db
			.select({ end: whoopCycles.end, kilojoule: whoopCycles.kilojoule })
			.from(whoopCycles)
			.where(and(isNotNull(whoopCycles.end), isNotNull(whoopCycles.kilojoule)))
			.orderBy(desc(whoopCycles.end)),
	]);

	const latestCalories = new Map<string, number>();
	for (const nutrition of imports) {
		if (!latestCalories.has(nutrition.reportDate)) {
			latestCalories.set(nutrition.reportDate, nutrition.calories);
		}
	}

	const burnedCalories = new Map<string, number>();
	for (const cycle of cycles) {
		if (!cycle.end || cycle.kilojoule === null) continue;
		const date = torontoDateForInstant(cycle.end);
		if (!burnedCalories.has(date)) {
			burnedCalories.set(date, Math.round(cycle.kilojoule / 4.184));
		}
	}

	let caloriesSaved = 0;
	let trackedDays = 0;
	for (const [date, consumed] of latestCalories) {
		const burned = burnedCalories.get(date);
		if (burned === undefined) continue;
		caloriesSaved += burned - consumed;
		trackedDays += 1;
	}

	return { caloriesSaved, trackedDays };
}

export async function getLatestWeight() {
	const [weight] = await db
		.select()
		.from(weightEntries)
		.orderBy(desc(weightEntries.measuredDate), desc(weightEntries.measuredAt))
		.limit(1);
	return weight;
}

export async function getCoachDayData(date: string) {
	const selectedDate = sql`CAST(${date} AS date)`;
	const [cycles, sleeps, workouts, imports, weights] = await Promise.all([
		db
			.select()
			.from(whoopCycles)
			.where(
				sql`DATE(COALESCE(${whoopCycles.end}, ${whoopCycles.start} + interval '1 day') AT TIME ZONE 'America/Toronto') = ${selectedDate}`,
			)
			.orderBy(desc(whoopCycles.start)),
		db
			.select()
			.from(whoopSleeps)
			.where(
				sql`DATE(${whoopSleeps.end} AT TIME ZONE 'America/Toronto') = ${selectedDate}`,
			)
			.orderBy(desc(whoopSleeps.end)),
		db
			.select()
			.from(whoopWorkouts)
			.where(
				sql`DATE(${whoopWorkouts.start} AT TIME ZONE 'America/Toronto') = ${selectedDate}`,
			)
			.orderBy(desc(whoopWorkouts.start)),
		db
			.select()
			.from(nutritionImports)
			.where(eq(nutritionImports.reportDate, date))
			.orderBy(desc(nutritionImports.importedAt)),
		db
			.select()
			.from(weightEntries)
			.where(eq(weightEntries.measuredDate, date))
			.orderBy(desc(weightEntries.measuredAt)),
	]);

	const cycleIds = [
		...new Set([
			...cycles.map((cycle) => cycle.id),
			...sleeps.map((sleep) => sleep.cycleId),
		]),
	];
	const importIds = imports.map((nutritionImport) => nutritionImport.id);
	const [recoveries, foods] = await Promise.all([
		cycleIds.length
			? db
					.select()
					.from(whoopRecoveries)
					.where(inArray(whoopRecoveries.cycleId, cycleIds))
					.orderBy(desc(whoopRecoveries.syncedAt))
			: Promise.resolve([]),
		importIds.length
			? db
					.select()
					.from(nutritionFoods)
					.where(inArray(nutritionFoods.importId, importIds))
					.orderBy(
						nutritionFoods.importId,
						nutritionFoods.meal,
						nutritionFoods.position,
					)
			: Promise.resolve([]),
	]);

	return {
		date,
		cycles,
		recoveries,
		sleeps,
		workouts,
		nutritionImports: imports,
		foods,
		weightEntries: weights,
	};
}

export async function getDashboardDay(date: string) {
	const selectedDate = sql`CAST(${date} AS date)`;
	const [cycles, sleeps, workouts, nutritionImportsForDay, weights] =
		await Promise.all([
			db
				.select()
				.from(whoopCycles)
				.where(
					sql`DATE(COALESCE(${whoopCycles.end}, ${whoopCycles.start} + interval '1 day') AT TIME ZONE 'America/Toronto') = ${selectedDate}`,
				)
				.orderBy(desc(whoopCycles.start))
				.limit(1),
			db
				.select()
				.from(whoopSleeps)
				.where(
					and(
						eq(whoopSleeps.nap, false),
						sql`DATE(${whoopSleeps.end} AT TIME ZONE 'America/Toronto') = ${selectedDate}`,
					),
				)
				.orderBy(desc(whoopSleeps.end))
				.limit(1),
			db
				.select()
				.from(whoopWorkouts)
				.where(
					sql`DATE(${whoopWorkouts.start} AT TIME ZONE 'America/Toronto') = ${selectedDate}`,
				)
				.orderBy(desc(whoopWorkouts.start)),
			db
				.select()
				.from(nutritionImports)
				.where(eq(nutritionImports.reportDate, date))
				.orderBy(desc(nutritionImports.importedAt))
				.limit(1),
			db
				.select()
				.from(weightEntries)
				.where(lte(weightEntries.measuredDate, date))
				.orderBy(
					desc(weightEntries.measuredDate),
					desc(weightEntries.measuredAt),
				)
				.limit(1),
		]);

	const sleep = sleeps[0];
	const nutrition = nutritionImportsForDay[0];
	const [recoveries, foods] = await Promise.all([
		sleep
			? db
					.select()
					.from(whoopRecoveries)
					.where(eq(whoopRecoveries.cycleId, sleep.cycleId))
					.limit(1)
			: Promise.resolve([]),
		nutrition
			? db
					.select()
					.from(nutritionFoods)
					.where(eq(nutritionFoods.importId, nutrition.id))
					.orderBy(nutritionFoods.meal, nutritionFoods.position)
			: Promise.resolve([]),
	]);

	return {
		cycle: cycles[0],
		recovery: recoveries[0],
		sleep,
		workouts,
		nutrition,
		foods,
		weight: weights[0],
	};
}
