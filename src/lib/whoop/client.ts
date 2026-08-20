import { eq } from "drizzle-orm";
import type { z } from "zod";

import { db, ensureDatabase } from "@/lib/db";
import {
	whoopConnection,
	whoopCycles,
	whoopProfile,
	whoopRecoveries,
	whoopSleeps,
	whoopWorkouts,
} from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/secrets";

import {
	collectionSchema,
	cycleSchema,
	profileSchema,
	recoverySchema,
	sleepSchema,
	tokenResponseSchema,
	workoutSchema,
} from "./schemas";

const API_BASE_URL = "https://api.prod.whoop.com/developer/v2";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const CONNECTION_ID = "whoop";
const EXPIRY_BUFFER_MS = 60_000;

type TokenResponse = z.infer<typeof tokenResponseSchema>;

let refreshInProgress: Promise<string> | undefined;

function requiredCredential(name: "WHOOP_CLIENT_ID" | "WHOOP_CLIENT_SECRET") {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is not configured`);
	return value;
}

export async function saveWhoopTokens(tokens: TokenResponse): Promise<void> {
	await ensureDatabase();

	const values = {
		id: CONNECTION_ID,
		accessToken: encryptSecret(tokens.access_token),
		refreshToken: encryptSecret(tokens.refresh_token),
		expiresAt: new Date(Date.now() + tokens.expires_in * 1_000),
		scopes: tokens.scope,
		updatedAt: new Date(),
	};

	await db.insert(whoopConnection).values(values).onConflictDoUpdate({
		target: whoopConnection.id,
		set: values,
	});
}

export async function exchangeAuthorizationCode(code: string): Promise<void> {
	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			client_id: requiredCredential("WHOOP_CLIENT_ID"),
			client_secret: requiredCredential("WHOOP_CLIENT_SECRET"),
			redirect_uri:
				process.env.WHOOP_REDIRECT_URI ??
				"http://localhost:3000/api/whoop/callback",
		}),
		cache: "no-store",
	});

	await saveWhoopTokens(
		tokenResponseSchema.parse(await responseJson(response)),
	);
}

export async function isWhoopConnected(): Promise<boolean> {
	await ensureDatabase();
	const rows = await db
		.select({ id: whoopConnection.id })
		.from(whoopConnection)
		.limit(1);
	return rows.length > 0;
}

async function accessToken(forceRefresh = false): Promise<string> {
	await ensureDatabase();
	const [connection] = await db
		.select()
		.from(whoopConnection)
		.where(eq(whoopConnection.id, CONNECTION_ID))
		.limit(1);

	if (!connection) throw new Error("WHOOP is not connected");

	if (
		!forceRefresh &&
		connection.expiresAt.getTime() > Date.now() + EXPIRY_BUFFER_MS
	) {
		return decryptSecret(connection.accessToken);
	}

	refreshInProgress ??= refreshWhoopToken().finally(() => {
		refreshInProgress = undefined;
	});
	return refreshInProgress;
}

async function refreshWhoopToken(): Promise<string> {
	const [connection] = await db
		.select()
		.from(whoopConnection)
		.where(eq(whoopConnection.id, CONNECTION_ID))
		.limit(1);

	if (!connection) throw new Error("WHOOP is not connected");

	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: decryptSecret(connection.refreshToken),
			client_id: requiredCredential("WHOOP_CLIENT_ID"),
			client_secret: requiredCredential("WHOOP_CLIENT_SECRET"),
			scope: connection.scopes,
		}),
		cache: "no-store",
	});
	const tokens = tokenResponseSchema.parse(await responseJson(response));
	await saveWhoopTokens(tokens);
	return tokens.access_token;
}

async function whoopFetch(path: string, retry = true): Promise<unknown> {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		headers: { authorization: `Bearer ${await accessToken()}` },
		cache: "no-store",
	});

	if (response.status === 401 && retry) {
		await accessToken(true);
		return whoopFetch(path, false);
	}

	return responseJson(response);
}

async function responseJson(response: Response): Promise<unknown> {
	const body: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		const detail = body ? JSON.stringify(body) : response.statusText;
		throw new Error(`WHOOP request failed (${response.status}): ${detail}`);
	}
	return body;
}

async function fetchCollection<T extends z.ZodType>(
	path: string,
	recordSchema: T,
	start: string,
): Promise<z.infer<T>[]> {
	const records: z.infer<T>[] = [];
	let nextToken: string | undefined;

	do {
		const query = new URLSearchParams({ limit: "25", start });
		if (nextToken) query.set("nextToken", nextToken);
		const page = collectionSchema(recordSchema).parse(
			await whoopFetch(`${path}?${query}`),
		);
		records.push(...page.records);
		nextToken = page.next_token ?? undefined;
	} while (nextToken);

	return records;
}

export async function syncWhoop(historyHours = 24) {
	await ensureDatabase();
	const start = new Date(
		Date.now() - historyHours * 60 * 60 * 1_000,
	).toISOString();

	const [profile, cycles, recoveries, sleeps, workouts] = await Promise.all([
		profileSchema.parseAsync(await whoopFetch("/user/profile/basic")),
		fetchCollection("/cycle", cycleSchema, start),
		fetchCollection("/recovery", recoverySchema, start),
		fetchCollection("/activity/sleep", sleepSchema, start),
		fetchCollection("/activity/workout", workoutSchema, start),
	]);

	await upsertProfile(profile);
	await Promise.all([
		upsertCycles(cycles),
		upsertRecoveries(recoveries),
		upsertSleeps(sleeps),
		upsertWorkouts(workouts),
	]);

	return {
		cycles: cycles.length,
		recoveries: recoveries.length,
		sleeps: sleeps.length,
		workouts: workouts.length,
	};
}

async function upsertProfile(profile: z.infer<typeof profileSchema>) {
	const values = {
		userId: profile.user_id,
		email: profile.email,
		firstName: profile.first_name,
		lastName: profile.last_name,
		syncedAt: new Date(),
		raw: profile,
	};
	await db.insert(whoopProfile).values(values).onConflictDoUpdate({
		target: whoopProfile.userId,
		set: values,
	});
}

async function upsertCycles(records: z.infer<typeof cycleSchema>[]) {
	for (const record of records) {
		const values = {
			id: record.id,
			start: new Date(record.start),
			end: record.end ? new Date(record.end) : null,
			timezoneOffset: record.timezone_offset,
			scoreState: record.score_state,
			strain: record.score?.strain ?? null,
			kilojoule: record.score?.kilojoule ?? null,
			averageHeartRate: record.score?.average_heart_rate ?? null,
			maxHeartRate: record.score?.max_heart_rate ?? null,
			sourceUpdatedAt: new Date(record.updated_at),
			syncedAt: new Date(),
			raw: record,
		};
		await db.insert(whoopCycles).values(values).onConflictDoUpdate({
			target: whoopCycles.id,
			set: values,
		});
	}
}

async function upsertRecoveries(records: z.infer<typeof recoverySchema>[]) {
	for (const record of records) {
		const values = {
			cycleId: record.cycle_id,
			sleepId: record.sleep_id,
			scoreState: record.score_state,
			recoveryScore: record.score?.recovery_score ?? null,
			restingHeartRate: record.score?.resting_heart_rate ?? null,
			hrvRmssdMilli: record.score?.hrv_rmssd_milli ?? null,
			spo2Percentage: record.score?.spo2_percentage ?? null,
			skinTempCelsius: record.score?.skin_temp_celsius ?? null,
			sourceUpdatedAt: new Date(record.updated_at),
			syncedAt: new Date(),
			raw: record,
		};
		await db.insert(whoopRecoveries).values(values).onConflictDoUpdate({
			target: whoopRecoveries.cycleId,
			set: values,
		});
	}
}

async function upsertSleeps(records: z.infer<typeof sleepSchema>[]) {
	for (const record of records) {
		const stage = record.score?.stage_summary;
		const values = {
			id: record.id,
			cycleId: record.cycle_id,
			start: new Date(record.start),
			end: new Date(record.end),
			timezoneOffset: record.timezone_offset,
			nap: record.nap,
			scoreState: record.score_state,
			sleepPerformancePercentage:
				record.score?.sleep_performance_percentage ?? null,
			sleepEfficiencyPercentage:
				record.score?.sleep_efficiency_percentage ?? null,
			sleepConsistencyPercentage:
				record.score?.sleep_consistency_percentage ?? null,
			respiratoryRate: record.score?.respiratory_rate ?? null,
			totalInBedTimeMilli: stage?.total_in_bed_time_milli ?? null,
			totalAwakeTimeMilli: stage?.total_awake_time_milli ?? null,
			totalLightSleepTimeMilli: stage?.total_light_sleep_time_milli ?? null,
			totalSlowWaveSleepTimeMilli:
				stage?.total_slow_wave_sleep_time_milli ?? null,
			totalRemSleepTimeMilli: stage?.total_rem_sleep_time_milli ?? null,
			sourceUpdatedAt: new Date(record.updated_at),
			syncedAt: new Date(),
			raw: record,
		};
		await db.insert(whoopSleeps).values(values).onConflictDoUpdate({
			target: whoopSleeps.id,
			set: values,
		});
	}
}

async function upsertWorkouts(records: z.infer<typeof workoutSchema>[]) {
	for (const record of records) {
		const values = {
			id: record.id,
			start: new Date(record.start),
			end: new Date(record.end),
			timezoneOffset: record.timezone_offset,
			sportName: record.sport_name,
			scoreState: record.score_state,
			strain: record.score?.strain ?? null,
			kilojoule: record.score?.kilojoule ?? null,
			averageHeartRate: record.score?.average_heart_rate ?? null,
			maxHeartRate: record.score?.max_heart_rate ?? null,
			sourceUpdatedAt: new Date(record.updated_at),
			syncedAt: new Date(),
			raw: record,
		};
		await db.insert(whoopWorkouts).values(values).onConflictDoUpdate({
			target: whoopWorkouts.id,
			set: values,
		});
	}
}
