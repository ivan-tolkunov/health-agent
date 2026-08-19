"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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

function FitBeeImportForm({
	onCancel,
	onImported,
}: {
	onCancel: () => void;
	onImported: (reportDate: string) => void;
}) {
	const form = useRef<HTMLFormElement>(null);
	const [state, formAction] = useActionState(importFitBeeText, initialState);

	useEffect(() => {
		if (state.status !== "success" || !state.reportDate) return;
		form.current?.reset();
		onImported(state.reportDate);
	}, [state.status, state.reportDate, onImported]);

	return (
		<form action={formAction} className="fitbee-form" ref={form}>
			<div className="dialog-heading">
				<div>
					<p className="eyebrow">NUTRITION IMPORT</p>
					<h2>Paste FitBee text</h2>
				</div>
				<button
					aria-label="Close FitBee importer"
					className="dialog-close"
					type="button"
					onClick={onCancel}
				>
					×
				</button>
			</div>

			<p className="muted">
				In FitBee, export the selected day as text and paste the complete report
				below. Re-importing the same day creates a newer snapshot.
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

			{state.status === "error" ? (
				<p className="form-message error" aria-live="polite">
					{state.message}
				</p>
			) : null}

			<div className="dialog-actions">
				<button className="button secondary" type="button" onClick={onCancel}>
					Cancel
				</button>
				<ImportButton />
			</div>
		</form>
	);
}

export function FitBeeImportDialog() {
	const dialog = useRef<HTMLDialogElement>(null);
	const router = useRouter();
	const [formKey, setFormKey] = useState(0);

	function closeDialog() {
		dialog.current?.close();
	}

	function finishImport(reportDate: string) {
		dialog.current?.close();
		setFormKey((key) => key + 1);
		router.push(`/?date=${reportDate}`);
	}

	function openDialog() {
		setFormKey((key) => key + 1);
		dialog.current?.showModal();
	}

	return (
		<>
			<button className="button secondary" type="button" onClick={openDialog}>
				Add FitBee
			</button>
			<dialog className="fitbee-dialog" ref={dialog}>
				<FitBeeImportForm
					key={formKey}
					onCancel={closeDialog}
					onImported={finishImport}
				/>
			</dialog>
		</>
	);
}
