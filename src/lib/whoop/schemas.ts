import { z } from "zod";

const scoredState = z.string();
const nullableNumber = z.number().nullish();

export const tokenResponseSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string(),
	expires_in: z.number(),
	scope: z.string().default(""),
	token_type: z.string(),
});

export const profileSchema = z.object({
	user_id: z.number(),
	email: z.string(),
	first_name: z.string(),
	last_name: z.string(),
});

export const cycleSchema = z.object({
	id: z.number(),
	created_at: z.string(),
	updated_at: z.string(),
	start: z.string(),
	end: z.string().nullish(),
	timezone_offset: z.string(),
	score_state: scoredState,
	score: z
		.object({
			strain: nullableNumber,
			kilojoule: nullableNumber,
			average_heart_rate: nullableNumber,
			max_heart_rate: nullableNumber,
		})
		.nullish(),
});

export const recoverySchema = z.object({
	cycle_id: z.number(),
	sleep_id: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
	score_state: scoredState,
	score: z
		.object({
			recovery_score: nullableNumber,
			resting_heart_rate: nullableNumber,
			hrv_rmssd_milli: nullableNumber,
			spo2_percentage: nullableNumber,
			skin_temp_celsius: nullableNumber,
		})
		.nullish(),
});

export const sleepSchema = z.object({
	id: z.string(),
	cycle_id: z.number(),
	created_at: z.string(),
	updated_at: z.string(),
	start: z.string(),
	end: z.string(),
	timezone_offset: z.string(),
	nap: z.boolean(),
	score_state: scoredState,
	score: z
		.object({
			stage_summary: z
				.object({
					total_in_bed_time_milli: nullableNumber,
					total_awake_time_milli: nullableNumber,
					total_light_sleep_time_milli: nullableNumber,
					total_slow_wave_sleep_time_milli: nullableNumber,
					total_rem_sleep_time_milli: nullableNumber,
				})
				.nullish(),
			respiratory_rate: nullableNumber,
			sleep_performance_percentage: nullableNumber,
			sleep_consistency_percentage: nullableNumber,
			sleep_efficiency_percentage: nullableNumber,
		})
		.nullish(),
});

export const workoutSchema = z.object({
	id: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
	start: z.string(),
	end: z.string(),
	timezone_offset: z.string(),
	sport_name: z.string(),
	score_state: scoredState,
	score: z
		.object({
			strain: nullableNumber,
			kilojoule: nullableNumber,
			average_heart_rate: nullableNumber,
			max_heart_rate: nullableNumber,
		})
		.nullish(),
});

export function collectionSchema<T extends z.ZodType>(recordSchema: T) {
	return z.object({
		records: z.array(recordSchema),
		next_token: z.string().nullish(),
	});
}
