import {
	bigint,
	boolean,
	date,
	integer,
	jsonb,
	pgTable,
	real,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

const auditColumns = {
	sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
	syncedAt: timestamp("synced_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	raw: jsonb("raw").notNull(),
};

export const weightEntries = pgTable("weight_entries", {
	id: text("id").primaryKey(),
	measuredDate: date("measured_date", { mode: "string" }).notNull(),
	weightKg: real("weight_kg").notNull(),
	measuredAt: timestamp("measured_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const dailyInsights = pgTable("daily_insights", {
	date: date("date", { mode: "string" }).primaryKey(),
	summary: text("summary").notNull(),
	generatedAt: timestamp("generated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const coachChats = pgTable("coach_chats", {
	date: date("date", { mode: "string" }).primaryKey(),
	messages: jsonb("messages")
		.$type<Array<{ role: "user" | "assistant"; content: string }>>()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const nutritionImports = pgTable("nutrition_imports", {
	id: text("id").primaryKey(),
	reportDate: date("report_date", { mode: "string" }).notNull(),
	importedAt: timestamp("imported_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	calories: integer("calories").notNull(),
	targetCalories: integer("target_calories").notNull(),
	proteinGrams: real("protein_grams").notNull(),
	carbsGrams: real("carbs_grams").notNull(),
	fatGrams: real("fat_grams").notNull(),
	steps: integer("steps"),
	rawText: text("raw_text").notNull(),
});

export const nutritionFoods = pgTable("nutrition_foods", {
	id: text("id").primaryKey(),
	importId: text("import_id").notNull(),
	meal: text("meal").notNull(),
	position: integer("position").notNull(),
	description: text("description").notNull(),
	calories: real("calories").notNull(),
	proteinGrams: real("protein_grams").notNull(),
	carbsGrams: real("carbs_grams").notNull(),
	fatGrams: real("fat_grams").notNull(),
});

export const whoopConnection = pgTable("whoop_connection", {
	id: text("id").primaryKey(),
	accessToken: text("access_token").notNull(),
	refreshToken: text("refresh_token").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	scopes: text("scopes").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const whoopProfile = pgTable("whoop_profile", {
	userId: bigint("user_id", { mode: "number" }).primaryKey(),
	email: text("email").notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	syncedAt: timestamp("synced_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	raw: jsonb("raw").notNull(),
});

export const whoopCycles = pgTable("whoop_cycles", {
	id: bigint("id", { mode: "number" }).primaryKey(),
	start: timestamp("start_at", { withTimezone: true }).notNull(),
	end: timestamp("end_at", { withTimezone: true }),
	timezoneOffset: text("timezone_offset").notNull(),
	scoreState: text("score_state").notNull(),
	strain: real("strain"),
	kilojoule: real("kilojoule"),
	averageHeartRate: integer("average_heart_rate"),
	maxHeartRate: integer("max_heart_rate"),
	...auditColumns,
});

export const whoopRecoveries = pgTable("whoop_recoveries", {
	cycleId: bigint("cycle_id", { mode: "number" }).primaryKey(),
	sleepId: text("sleep_id").notNull(),
	scoreState: text("score_state").notNull(),
	recoveryScore: integer("recovery_score"),
	restingHeartRate: integer("resting_heart_rate"),
	hrvRmssdMilli: real("hrv_rmssd_milli"),
	spo2Percentage: real("spo2_percentage"),
	skinTempCelsius: real("skin_temp_celsius"),
	...auditColumns,
});

export const whoopSleeps = pgTable("whoop_sleeps", {
	id: text("id").primaryKey(),
	cycleId: bigint("cycle_id", { mode: "number" }).notNull(),
	start: timestamp("start_at", { withTimezone: true }).notNull(),
	end: timestamp("end_at", { withTimezone: true }).notNull(),
	timezoneOffset: text("timezone_offset").notNull(),
	nap: boolean("nap").notNull(),
	scoreState: text("score_state").notNull(),
	sleepPerformancePercentage: integer("sleep_performance_percentage"),
	sleepEfficiencyPercentage: real("sleep_efficiency_percentage"),
	sleepConsistencyPercentage: integer("sleep_consistency_percentage"),
	respiratoryRate: real("respiratory_rate"),
	totalInBedTimeMilli: bigint("total_in_bed_time_milli", { mode: "number" }),
	totalAwakeTimeMilli: bigint("total_awake_time_milli", { mode: "number" }),
	totalLightSleepTimeMilli: bigint("total_light_sleep_time_milli", {
		mode: "number",
	}),
	totalSlowWaveSleepTimeMilli: bigint("total_slow_wave_sleep_time_milli", {
		mode: "number",
	}),
	totalRemSleepTimeMilli: bigint("total_rem_sleep_time_milli", {
		mode: "number",
	}),
	...auditColumns,
});

export const whoopWorkouts = pgTable("whoop_workouts", {
	id: text("id").primaryKey(),
	start: timestamp("start_at", { withTimezone: true }).notNull(),
	end: timestamp("end_at", { withTimezone: true }).notNull(),
	timezoneOffset: text("timezone_offset").notNull(),
	sportName: text("sport_name").notNull(),
	scoreState: text("score_state").notNull(),
	strain: real("strain"),
	kilojoule: real("kilojoule"),
	averageHeartRate: integer("average_heart_rate"),
	maxHeartRate: integer("max_heart_rate"),
	...auditColumns,
});
