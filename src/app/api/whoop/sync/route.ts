import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { appUrl } from "@/lib/app-url";
import { syncWhoop } from "@/lib/whoop/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	const destination = appUrl(request);
	const formData = await request.formData();
	const range = formData.get("range") === "90d" ? "90d" : "24h";

	try {
		const result = await syncWhoop(range === "90d" ? 90 * 24 : 24);
		destination.searchParams.set(
			"whoop",
			range === "90d" ? "synced_90d" : "synced_24h",
		);
		destination.searchParams.set(
			"records",
			String(
				result.cycles + result.recoveries + result.sleeps + result.workouts,
			),
		);
	} catch (error) {
		console.error("WHOOP sync failed", error);
		destination.searchParams.set("whoop", "sync_failed");
	}

	return NextResponse.redirect(destination, 303);
}
