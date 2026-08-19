import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Privacy Policy · Health Agent",
};

export default function PrivacyPage() {
	return (
		<main className="app-shell">
			<article className="panel privacy-policy">
				<p className="eyebrow">HEALTH AGENT</p>
				<h1>Privacy policy</h1>
				<p className="muted">Last updated: August 19, 2026</p>

				<h2>Purpose</h2>
				<p>
					Health Agent is a private, single-user dashboard that combines the
					owner&apos;s WHOOP, nutrition, and weight data for personal review and
					analysis.
				</p>

				<h2>Data collected</h2>
				<p>
					With explicit authorization, the application retrieves WHOOP profile,
					body measurement, physiological cycle, recovery, sleep, and workout
					data. It may also store nutrition exports and manually entered weight
					measurements.
				</p>

				<h2>Storage and use</h2>
				<p>
					Data is stored on the owner&apos;s private server and is used only to
					display personal metrics, calculate trends, and produce requested AI
					summaries. Health data is not sold or used for advertising.
				</p>

				<h2>Sharing</h2>
				<p>
					Data is not shared with third parties except when the owner explicitly
					requests analysis by a configured AI provider. Only the information
					needed for that request is sent to the provider.
				</p>

				<h2>Access and deletion</h2>
				<p>
					The owner can disconnect WHOOP access and delete imported data from
					the private server. Revoking WHOOP authorization stops future API
					access.
				</p>

				<h2>Security</h2>
				<p>
					OAuth credentials are kept server-side, access and refresh tokens are
					encrypted at rest, and private health files are excluded from version
					control.
				</p>
			</article>
		</main>
	);
}
