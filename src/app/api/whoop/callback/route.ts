import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { exchangeAuthorizationCode } from "@/lib/whoop/client";

export const runtime = "nodejs";

function validState(expected: string | undefined, received: string | null) {
	if (!expected || !received || expected.length !== received.length)
		return false;
	return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function GET(request: NextRequest) {
	const state = request.nextUrl.searchParams.get("state");
	const code = request.nextUrl.searchParams.get("code");
	const expectedState = request.cookies.get("whoop_oauth_state")?.value;
	const destination = new URL("/", request.url);

	if (!code || !validState(expectedState, state)) {
		destination.searchParams.set("whoop", "invalid_oauth_response");
		return NextResponse.redirect(destination);
	}

	try {
		await exchangeAuthorizationCode(code);
		destination.searchParams.set("whoop", "connected");
	} catch (error) {
		console.error("WHOOP OAuth callback failed", error);
		destination.searchParams.set("whoop", "connection_failed");
	}

	const response = NextResponse.redirect(destination);
	response.cookies.delete("whoop_oauth_state");
	return response;
}
