"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import Markdown from "react-markdown";
import { useState } from "react";

export function DailySummaryPanel({
	date,
	initialSummary,
}: {
	date: string;
	initialSummary?: string;
}) {
	const [summary, setSummary] = useState(initialSummary);
	const [error, setError] = useState<string>();
	const [isLoading, setIsLoading] = useState(false);

	async function generateSummary() {
		setIsLoading(true);
		setError(undefined);
		try {
			const response = await fetch("/api/coach/daily-summary", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ date }),
			});
			const result: { summary?: string; error?: string } =
				await response.json();
			if (!response.ok || !result.summary) {
				throw new Error(result.error ?? "Pi could not create an insight.");
			}
			setSummary(result.summary);
		} catch (caughtError) {
			setError(
				caughtError instanceof Error
					? caughtError.message
					: "Pi could not create an insight.",
			);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<article className="panel coach-panel">
			<div className="coach-heading">
				<div>
					<p className="eyebrow">PI COACH · READ ONLY</p>
					<h2>Insight for {date}</h2>
				</div>
				<button
					className="coach-button"
					disabled={isLoading}
					onClick={generateSummary}
					type="button"
				>
					<Sparkles aria-hidden="true" size={15} />
					{isLoading
						? "Creating…"
						: summary
							? "Regenerate"
							: "Generate insight"}
				</button>
			</div>
			<div className={`coach-insight ${isLoading ? "is-loading" : ""}`}>
				<div className="coach-insight-content" aria-live="polite">
					{summary ? (
						<div className="coach-summary">
							<Markdown>{summary}</Markdown>
						</div>
					) : (
						<p className="empty-state">
							Generate an insight from every database record available for this
							day. The latest insight is saved here.
						</p>
					)}
				</div>
				{isLoading ? (
					<div className="coach-loading" role="status">
						<LoaderCircle
							aria-hidden="true"
							className="animate-spin"
							size={22}
						/>
						<span>Pi is reviewing your day…</span>
					</div>
				) : null}
			</div>
			{error ? (
				<p className="coach-error" role="alert">
					{error}
				</p>
			) : null}
		</article>
	);
}
