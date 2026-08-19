import type { ReactNode } from "react";

import { CoachChatDialog } from "@/components/coach-chat-dialog";
import { DailySummaryPanel } from "@/components/daily-summary-panel";
import { DayNavigator } from "@/components/day-navigator";
import { FitBeeImportDialog } from "@/components/fitbee-import-dialog";
import { LogWeightDialog } from "@/components/log-weight-dialog";
import { NutritionPanel } from "@/components/nutrition-panel";
import { StatusToast } from "@/components/status-toast";
import { getDailyInsight } from "@/lib/coach/insights";
import { ensureDatabase } from "@/lib/db";
import {
	getCalorieProgress,
	getDashboardDay,
	getLatestWeight,
} from "@/lib/dashboard/day";
import { selectedDashboardDate, torontoToday } from "@/lib/dashboard/date";
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
	action,
}: {
	label: string;
	value: string;
	detail: string;
	accent: string;
	action?: ReactNode;
}) {
	return (
		<article className="metric-card">
			<div className="metric-accent" style={{ backgroundColor: accent }} />
			{action ? <div className="metric-action">{action}</div> : null}
			<p className="metric-label">{label}</p>
			<p className="metric-value">{value}</p>
			<p className="metric-detail">{detail}</p>
		</article>
	);
}

export default async function Home({ searchParams }: PageProps<"/">) {
	await ensureDatabase();
	const params = await searchParams;
	const today = torontoToday();
	const selectedDate = selectedDashboardDate(params.date);
	const [connected, day, calorieProgress, latestWeight, dailyInsight] =
		await Promise.all([
			isWhoopConnected(),
			getDashboardDay(selectedDate),
			getCalorieProgress(),
			getLatestWeight(),
			getDailyInsight(selectedDate),
		]);
	const { cycle, recovery, sleep, workouts, nutrition, foods, weight } = day;
	const currentWeight = latestWeight?.weightKg ?? 82;
	const selectedWeight = weight?.weightKg ?? currentWeight;
	const kilogramsToGoal = Math.max(selectedWeight - 70, 0);
	const sleepDuration = sleep
		? (sleep.totalLightSleepTimeMilli ?? 0) +
			(sleep.totalSlowWaveSleepTimeMilli ?? 0) +
			(sleep.totalRemSleepTimeMilli ?? 0)
		: null;
	const status = typeof params.whoop === "string" ? params.whoop : undefined;
	const statusNotification =
		status && statusMessages[status]
			? `${statusMessages[status]}${params.records ? ` ${params.records} records processed.` : ""}`
			: undefined;

	return (
		<main className="app-shell">
			<header className="health-hero">
				<div className="hero-topline">
					<div className="hero-brand">
						<strong>Health Agent</strong>
						<span>Private dashboard · Toronto</span>
					</div>
					<div className={`source-pill ${connected ? "live" : ""}`}>
						<span className="status-dot" />
						{connected ? "WHOOP LIVE" : "WHOOP OFFLINE"}
					</div>
				</div>

				<div className="hero-main">
					<div className="hero-goal">
						<p>Good morning</p>
						<h1>
							{Math.max(currentWeight - 70, 0).toFixed(1)} kg to your goal
						</h1>
						<div className="goal-route">
							<strong>{currentWeight.toFixed(1)} kg</strong>
							<span aria-hidden="true" />
							<strong>70 kg</strong>
						</div>
					</div>

					<div
						className={`hero-calorie-bank ${calorieProgress.caloriesSaved < 0 ? "over" : ""}`}
					>
						<span>CALORIE BANK</span>
						{calorieProgress.trackedDays ? (
							<>
								<strong>
									{calorieProgress.caloriesSaved >= 0 ? "+" : "−"}
									{Math.abs(calorieProgress.caloriesSaved).toLocaleString(
										"en-CA",
									)}
								</strong>
								<small>
									kcal {calorieProgress.caloriesSaved >= 0 ? "saved" : "over"} ·{" "}
									{calorieProgress.trackedDays}{" "}
									{calorieProgress.trackedDays === 1 ? "day" : "days"}
								</small>
							</>
						) : (
							<>
								<strong>—</strong>
								<small>Import FitBee to begin</small>
							</>
						)}
					</div>
				</div>

				<div className="hero-actions">
					<span>Latest {currentWeight.toFixed(1)} kg · Target 70 kg</span>
					<div>
						{connected ? (
							<form action="/api/whoop/sync" method="post">
								<button className="button secondary" type="submit">
									Sync
								</button>
							</form>
						) : (
							<form action="/api/whoop/connect" method="get">
								<button className="button" type="submit">
									Connect WHOOP
								</button>
							</form>
						)}
						<CoachChatDialog key={selectedDate} date={selectedDate} />
						<FitBeeImportDialog />
					</div>
				</div>
			</header>

			{statusNotification ? (
				<StatusToast
					message={statusNotification}
					variant={
						status === "connected" || status === "synced" ? "success" : "error"
					}
				/>
			) : null}

			<section className="section-heading day-heading">
				<DayNavigator date={selectedDate} today={today} />
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
					label="Weight"
					value={`${selectedWeight.toFixed(1)} kg`}
					detail={
						weight?.measuredDate === selectedDate
							? "Logged this day"
							: `${kilogramsToGoal.toFixed(1)} kg to goal`
					}
					accent="#d288e8"
					action={
						<LogWeightDialog
							date={selectedDate}
							currentWeight={selectedWeight}
						/>
					}
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
					label="Energy burned"
					value={calories(cycle?.kilojoule ?? null)}
					detail="kcal from WHOOP"
					accent="#ec665f"
				/>
			</section>

			<section className="panel-grid">
				<NutritionPanel nutrition={nutrition} foods={foods} />
				<article className="panel activity-panel">
					<p className="eyebrow">ACTIVITY</p>
					<h2>Workouts</h2>
					{workouts.length ? (
						<ul className="workout-list">
							{workouts.map((workout) => (
								<li key={workout.id}>
									<div>
										<strong>{workout.sportName}</strong>
										<span>
											{new Intl.DateTimeFormat("en-CA", {
												timeZone: "America/Toronto",
												hour: "numeric",
												minute: "2-digit",
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

				<DailySummaryPanel
					key={selectedDate}
					date={selectedDate}
					initialSummary={dailyInsight?.summary}
				/>
			</section>
		</main>
	);
}
