import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { syncWhoop } from "@/lib/whoop/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	const destination = new URL("/", request.url);

	try {
		const result = await syncWhoop(90);
		destination.searchParams.set("whoop", "synced");
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
