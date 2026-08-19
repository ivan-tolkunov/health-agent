"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { importFitBeeText, type FitBeeImportState } from "@/app/actions/fitbee";

const initialState: FitBeeImportState = { status: "idle", message: "" };

function ImportButton() {
	const { pending } = useFormStatus();
	return (
		<button className="button" disabled={pending} type="submit">
			{pending ? "Parsing…" : "Import FitBee"}
		</button>
	);
}

export function FitBeeImportDialog() {
	const dialog = useRef<HTMLDialogElement>(null);
	const router = useRouter();
	const [state, formAction] = useActionState(importFitBeeText, initialState);

	function closeDialog() {
		dialog.current?.close();
		router.refresh();
	}

	return (
		<>
			<button
				className="button secondary"
				type="button"
				onClick={() => dialog.current?.showModal()}
			>
				Add FitBee
			</button>
			<dialog className="fitbee-dialog" ref={dialog}>
				<form action={formAction} className="fitbee-form">
					<div className="dialog-heading">
						<div>
							<p className="eyebrow">NUTRITION IMPORT</p>
							<h2>Paste FitBee text</h2>
						</div>
						<button
							aria-label="Close FitBee importer"
							className="dialog-close"
							type="button"
							onClick={closeDialog}
						>
							×
						</button>
					</div>

					<p className="muted">
						In FitBee, export the selected day as text and paste the complete
						report below. Re-importing the same day creates a newer snapshot.
					</p>
					<label className="textarea-label" htmlFor="fitbeeText">
						FitBee export
					</label>
					<textarea
						autoFocus
						id="fitbeeText"
						name="fitbeeText"
						placeholder="18 August 2026&#10;&#10;DAILY SUMMARY&#10;Calories: …"
						required
						rows={16}
					/>

					{state.message ? (
						<p className={`form-message ${state.status}`} aria-live="polite">
							{state.message}
						</p>
					) : null}

					<div className="dialog-actions">
						<button
							className="button secondary"
							type="button"
							onClick={closeDialog}
						>
							{state.status === "success" ? "Done" : "Cancel"}
						</button>
						{state.status === "success" ? null : <ImportButton />}
					</div>
				</form>
			</dialog>
		</>
	);
}
