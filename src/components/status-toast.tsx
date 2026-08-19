"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function StatusToast({
	message,
	variant,
}: {
	message: string;
	variant: "success" | "error";
}) {
	useEffect(() => {
		const url = new URL(window.location.href);
		url.searchParams.delete("whoop");
		url.searchParams.delete("records");
		window.history.replaceState(
			null,
			"",
			`${url.pathname}${url.search}${url.hash}`,
		);

		if (variant === "error") {
			toast.error(message, { duration: 5_000 });
		} else {
			toast.success(message, { duration: 5_000 });
		}
	}, [message, variant]);

	return null;
}
