"use client";

import { useActionState, useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { logWeight, type WeightLogState } from "@/app/actions/weight";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: WeightLogState = { status: "idle", message: "" };

function WeightForm({
	date,
	currentWeight,
	onSaved,
}: {
	date: string;
	currentWeight: number;
	onSaved: (message: string) => void;
}) {
	const [state, formAction, pending] = useActionState(logWeight, initialState);

	useEffect(() => {
		if (state.status === "success") onSaved(state.message);
	}, [state.status, state.message, onSaved]);

	return (
		<form action={formAction} className="grid gap-4">
			<input name="date" type="hidden" value={date} />
			<div className="grid gap-2">
				<Label htmlFor="weightKg">Weight in kilograms</Label>
				<div className="relative">
					<Input
						id="weightKg"
						name="weightKg"
						type="number"
						inputMode="decimal"
						min="30"
						max="300"
						step="0.1"
						defaultValue={currentWeight.toFixed(1)}
						autoFocus
						required
						className="pr-10 text-lg font-semibold"
					/>
					<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
						kg
					</span>
				</div>
			</div>
			{state.status === "error" ? (
				<p className="text-sm text-destructive" role="alert">
					{state.message}
				</p>
			) : null}
			<DialogFooter className="mx-0 mb-0 px-0 pb-0">
				<Button type="submit" disabled={pending}>
					{pending ? "Saving…" : "Save weight"}
				</Button>
			</DialogFooter>
		</form>
	);
}

export function LogWeightDialog({
	date,
	currentWeight,
}: {
	date: string;
	currentWeight: number;
}) {
	const [open, setOpen] = useState(false);
	const [formKey, setFormKey] = useState(0);
	const router = useRouter();

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		if (nextOpen) setFormKey((key) => key + 1);
	}

	function handleSaved(message: string) {
		setOpen(false);
		toast.success(message, { duration: 5_000 });
		router.refresh();
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon-xs"
					aria-label={`Log weight for ${date}`}
					title="Log weight"
				>
					<PlusIcon />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Log weight</DialogTitle>
					<DialogDescription>
						Add a manual measurement for {date}. The latest entry for the day is
						displayed.
					</DialogDescription>
				</DialogHeader>
				<WeightForm
					key={formKey}
					date={date}
					currentWeight={currentWeight}
					onSaved={handleSaved}
				/>
			</DialogContent>
		</Dialog>
	);
}
