import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import * as schema from "./schema";

const dataDirectory = process.env.PGLITE_DATA_DIR ?? "./storage/pglite";
if (!dataDirectory.includes("://")) {
	mkdirSync(dirname(dataDirectory), { recursive: true });
}

const globalForDatabase = globalThis as unknown as {
	pglite?: PGlite;
	databaseReady?: Promise<void>;
};

const client = globalForDatabase.pglite ?? new PGlite(dataDirectory);

if (process.env.NODE_ENV !== "production") {
	globalForDatabase.pglite = client;
}

export const db = drizzle(client, { schema });

export function ensureDatabase(): Promise<void> {
	globalForDatabase.databaseReady ??= initializeDatabase();
	return globalForDatabase.databaseReady;
}

async function initializeDatabase(): Promise<void> {
	await client.exec(`
    CREATE TABLE IF NOT EXISTS nutrition_imports (
      id text PRIMARY KEY,
      report_date date NOT NULL,
      imported_at timestamptz NOT NULL DEFAULT now(),
      calories integer NOT NULL,
      target_calories integer NOT NULL,
      protein_grams real NOT NULL,
      carbs_grams real NOT NULL,
      fat_grams real NOT NULL,
      steps integer,
      raw_text text NOT NULL
    );

    CREATE INDEX IF NOT EXISTS nutrition_imports_date_idx
      ON nutrition_imports (report_date DESC, imported_at DESC);

    CREATE TABLE IF NOT EXISTS nutrition_foods (
      id text PRIMARY KEY,
      import_id text NOT NULL REFERENCES nutrition_imports(id) ON DELETE CASCADE,
      meal text NOT NULL,
      position integer NOT NULL,
      description text NOT NULL,
      calories real NOT NULL,
      protein_grams real NOT NULL,
      carbs_grams real NOT NULL,
      fat_grams real NOT NULL
    );

    CREATE INDEX IF NOT EXISTS nutrition_foods_import_idx
      ON nutrition_foods (import_id, meal, position);

    CREATE TABLE IF NOT EXISTS whoop_connection (
      id text PRIMARY KEY,
      access_token text NOT NULL,
      refresh_token text NOT NULL,
      expires_at timestamptz NOT NULL,
      scopes text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS whoop_profile (
      user_id bigint PRIMARY KEY,
      email text NOT NULL,
      first_name text NOT NULL,
      last_name text NOT NULL,
      synced_at timestamptz NOT NULL DEFAULT now(),
      raw jsonb NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whoop_cycles (
      id bigint PRIMARY KEY,
      start_at timestamptz NOT NULL,
      end_at timestamptz,
      timezone_offset text NOT NULL,
      score_state text NOT NULL,
      strain real,
      kilojoule real,
      average_heart_rate integer,
      max_heart_rate integer,
      source_updated_at timestamptz,
      synced_at timestamptz NOT NULL DEFAULT now(),
      raw jsonb NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whoop_recoveries (
      cycle_id bigint PRIMARY KEY,
      sleep_id text NOT NULL,
      score_state text NOT NULL,
      recovery_score integer,
      resting_heart_rate integer,
      hrv_rmssd_milli real,
      spo2_percentage real,
      skin_temp_celsius real,
      source_updated_at timestamptz,
      synced_at timestamptz NOT NULL DEFAULT now(),
      raw jsonb NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whoop_sleeps (
      id text PRIMARY KEY,
      cycle_id bigint NOT NULL,
      start_at timestamptz NOT NULL,
      end_at timestamptz NOT NULL,
      timezone_offset text NOT NULL,
      nap boolean NOT NULL,
      score_state text NOT NULL,
      sleep_performance_percentage integer,
      sleep_efficiency_percentage real,
      sleep_consistency_percentage integer,
      respiratory_rate real,
      total_in_bed_time_milli bigint,
      total_awake_time_milli bigint,
      total_light_sleep_time_milli bigint,
      total_slow_wave_sleep_time_milli bigint,
      total_rem_sleep_time_milli bigint,
      source_updated_at timestamptz,
      synced_at timestamptz NOT NULL DEFAULT now(),
      raw jsonb NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whoop_workouts (
      id text PRIMARY KEY,
      start_at timestamptz NOT NULL,
      end_at timestamptz NOT NULL,
      timezone_offset text NOT NULL,
      sport_name text NOT NULL,
      score_state text NOT NULL,
      strain real,
      kilojoule real,
      average_heart_rate integer,
      max_heart_rate integer,
      source_updated_at timestamptz,
      synced_at timestamptz NOT NULL DEFAULT now(),
      raw jsonb NOT NULL
    );
  `);
}
