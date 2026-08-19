import { desc, eq } from "drizzle-orm";

import { FitBeeImportDialog } from "@/components/fitbee-import-dialog";
import { NutritionPanel } from "@/components/nutrition-panel";
import { db, ensureDatabase } from "@/lib/db";
import {
	nutritionFoods,
	nutritionImports,
	whoopCycles,
	whoopRecoveries,
	whoopSleeps,
	whoopWorkouts,
} from "@/lib/db/schema";
import { isWhoopConnected } from "@/lib/whoop/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
	connected: "WHOOP connected. Run the first sync to import your data.",
	synced: "WHOOP data synchronized successfully.",
	invalid_oauth_response:
		"WHOOP rejected the OAuth response. Please try again.",
	connection_failed: "WHOOP connection failed. Check the server log.",
	sync_failed: "WHOOP sync failed. Check the server log.",
};

function hours(milliseconds: number | null) {
	if (milliseconds === null) return "—";
	return `${(milliseconds / 3_600_000).toFixed(1)}h`;
}

function calories(kilojoule: number | null) {
	if (kilojoule === null) return "—";
	return Math.round(kilojoule / 4.184).toLocaleString("en-CA");
}

function MetricCard({
	label,
	value,
	detail,
	accent,
}: {
	label: string;
	value: string;
	detail: string;
	accent: string;
}) {
	return (
		<article className="metric-card">
			<div className="metric-accent" style={{ backgroundColor: accent }} />
			<p className="metric-label">{label}</p>
			<p className="metric-value">{value}</p>
			<p className="metric-detail">{detail}</p>
		</article>
	);
}

export default async function Home({ searchParams }: PageProps<"/">) {
	await ensureDatabase();
	const params = await searchParams;
	const [
		connected,
		latestCycles,
		latestRecoveries,
		latestSleeps,
		workouts,
		latestNutrition,
	] = await Promise.all([
		isWhoopConnected(),
		db.select().from(whoopCycles).orderBy(desc(whoopCycles.start)).limit(1),
		db
			.select()
			.from(whoopRecoveries)
			.orderBy(desc(whoopRecoveries.sourceUpdatedAt))
			.limit(1),
		db.select().from(whoopSleeps).orderBy(desc(whoopSleeps.start)).limit(1),
		db.select().from(whoopWorkouts).orderBy(desc(whoopWorkouts.start)).limit(3),
		db
			.select()
			.from(nutritionImports)
			.orderBy(
				desc(nutritionImports.reportDate),
				desc(nutritionImports.importedAt),
			)
			.limit(1),
	]);

	const nutrition = latestNutrition[0];
	const foods = nutrition
		? await db
				.select()
				.from(nutritionFoods)
				.where(eq(nutritionFoods.importId, nutrition.id))
				.orderBy(nutritionFoods.meal, nutritionFoods.position)
		: [];
	const cycle = latestCycles[0];
	const recovery = latestRecoveries[0];
	const sleep = latestSleeps[0];
	const sleepDuration = sleep
		? (sleep.totalLightSleepTimeMilli ?? 0) +
			(sleep.totalSlowWaveSleepTimeMilli ?? 0) +
			(sleep.totalRemSleepTimeMilli ?? 0)
		: null;
	const status = typeof params.whoop === "string" ? params.whoop : undefined;

	return (
		<main className="app-shell">
			<header className="topbar">
				<div>
					<p className="eyebrow">PERSONAL HEALTH</p>
					<h1>Good morning</h1>
					<p className="muted">Toronto · Goal 70 kg · Current baseline 82 kg</p>
				</div>
				<div className="connection-actions">
					<span className={`status-dot ${connected ? "connected" : ""}`} />
					<span>{connected ? "WHOOP connected" : "WHOOP not connected"}</span>
					{connected ? (
						<form action="/api/whoop/sync" method="post">
							<button className="button secondary" type="submit">
								Sync 90 days
							</button>
						</form>
					) : (
						<form action="/api/whoop/connect" method="get">
							<button className="button" type="submit">
								Connect WHOOP
							</button>
						</form>
					)}
					<FitBeeImportDialog />
				</div>
			</header>

			{status && statusMessages[status] ? (
				<div className="notice" role="status">
					{statusMessages[status]}
					{params.records ? ` ${params.records} records processed.` : ""}
				</div>
			) : null}

			<section className="section-heading">
				<div>
					<p className="eyebrow">TODAY</p>
					<h2>Your daily overview</h2>
				</div>
				<p className="muted">Data appears after your first WHOOP sync.</p>
			</section>

			<section className="metric-grid">
				<MetricCard
					label="Recovery"
					value={
						recovery?.recoveryScore == null ? "—" : `${recovery.recoveryScore}%`
					}
					detail={
						recovery
							? `HRV ${Math.round(recovery.hrvRmssdMilli ?? 0)} ms · RHR ${recovery.restingHeartRate ?? "—"}`
							: "Waiting for WHOOP"
					}
					accent="#35c979"
				/>
				<MetricCard
					label="Sleep"
					value={hours(sleepDuration)}
					detail={
						sleep?.sleepPerformancePercentage == null
							? "Waiting for WHOOP"
							: `${sleep.sleepPerformancePercentage}% performance`
					}
					accent="#7b73ff"
				/>
				<MetricCard
					label="Day strain"
					value={cycle?.strain == null ? "—" : cycle.strain.toFixed(1)}
					detail={
						cycle
							? `Average HR ${cycle.averageHeartRate ?? "—"}`
							: "Waiting for WHOOP"
					}
					accent="#f4a340"
				/>
				<MetricCard
					label="Energy burned"
					value={calories(cycle?.kilojoule ?? null)}
					detail="kcal from WHOOP"
					accent="#ec665f"
				/>
				<MetricCard
					label="Nutrition"
					value={
						nutrition
							? `${nutrition.calories.toLocaleString("en-CA")} kcal`
							: "—"
					}
					detail={
						nutrition
							? `P ${nutrition.proteinGrams}g · C ${nutrition.carbsGrams}g · F ${nutrition.fatGrams}g`
							: "Add a FitBee text export"
					}
					accent="#49a9d8"
				/>
				<MetricCard
					label="Weight"
					value="82 kg"
					detail="12 kg to goal"
					accent="#d288e8"
				/>
			</section>

			<section className="panel-grid">
				<NutritionPanel nutrition={nutrition} foods={foods} />
				<article className="panel">
					<p className="eyebrow">LATEST ACTIVITY</p>
					<h2>Recent workouts</h2>
					{workouts.length ? (
						<ul className="workout-list">
							{workouts.map((workout) => (
								<li key={workout.id}>
									<div>
										<strong>{workout.sportName}</strong>
										<span>
											{new Intl.DateTimeFormat("en-CA", {
												timeZone: "America/Toronto",
												month: "short",
												day: "numeric",
											}).format(workout.start)}
										</span>
									</div>
									<strong>{workout.strain?.toFixed(1) ?? "—"} strain</strong>
								</li>
							))}
						</ul>
					) : (
						<p className="empty-state">No synchronized workouts yet.</p>
					)}
				</article>

				<article className="panel coach-panel">
					<p className="eyebrow">AI COACH</p>
					<h2>Daily insight</h2>
					<p className="empty-state">
						Once WHOOP and nutrition data are available, Pi will summarize your
						day and answer questions using read-only tools.
					</p>
					<button className="button secondary" disabled>
						Chat coming next
					</button>
				</article>
			</section>
		</main>
	);
}
