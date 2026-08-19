import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const AUTHORIZE_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const SCOPES = [
	"offline",
	"read:profile",
	"read:body_measurement",
	"read:cycles",
	"read:recovery",
	"read:sleep",
	"read:workout",
];

export function GET() {
	const clientId = process.env.WHOOP_CLIENT_ID;
	if (!clientId) {
		return NextResponse.json(
			{ error: "WHOOP_CLIENT_ID is not configured" },
			{ status: 503 },
		);
	}

	const state = randomBytes(6).toString("base64url");
	const redirectUri =
		process.env.WHOOP_REDIRECT_URI ??
		"http://localhost:3000/api/whoop/callback";
	const authorizeUrl = URL.parse(AUTHORIZE_URL);
	if (!authorizeUrl) {
		return NextResponse.json(
			{ error: "WHOOP authorization URL is invalid" },
			{ status: 500 },
		);
	}
	authorizeUrl.search = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: SCOPES.join(" "),
		state,
	}).toString();

	const response = NextResponse.redirect(authorizeUrl);
	response.cookies.set("whoop_oauth_state", state, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 10 * 60,
	});
	return response;
}
