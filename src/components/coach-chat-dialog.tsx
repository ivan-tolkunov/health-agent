"use client";

import {
	AssistantRuntimeProvider,
	type ChatModelAdapter,
	useLocalRuntime,
} from "@assistant-ui/react";
import { MessageCircle } from "lucide-react";
import { useMemo } from "react";

import { Thread } from "@/components/assistant-ui/thread";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

export function CoachChatDialog({ date }: { date: string }) {
	const adapter = useMemo<ChatModelAdapter>(
		() => ({
			async run({ messages, abortSignal }) {
				const chatMessages = messages
					.filter(
						(message) =>
							message.role === "user" || message.role === "assistant",
					)
					.map((message) => ({
						role: message.role,
						content: message.content
							.filter((content) => content.type === "text")
							.map((content) => content.text)
							.join("\n"),
					}))
					.filter((message) => message.content.trim());
				const response = await fetch("/api/coach/chat", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ date, messages: chatMessages }),
					signal: abortSignal,
				});
				const data: { message?: string; error?: string } = await response.json();
				if (!response.ok || !data.message) {
					throw new Error(data.error ?? "Pi could not respond.");
				}
				return { content: [{ type: "text", text: data.message }] };
			},
		}),
		[date],
	);
	const runtime = useLocalRuntime(adapter);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<button className="button secondary" type="button">
					<MessageCircle aria-hidden="true" size={15} />
					Chat
				</button>
			</DialogTrigger>
			<DialogContent className="h-[min(720px,calc(100dvh-2rem))] max-w-[calc(100%-1rem)] gap-0 p-0 sm:max-w-3xl">
				<DialogHeader className="border-b px-5 py-4 pr-12">
					<DialogTitle>Pi Coach</DialogTitle>
					<DialogDescription>
						Ask about your health data for {date}. Pi can read it but cannot
						change it.
					</DialogDescription>
				</DialogHeader>
				<AssistantRuntimeProvider runtime={runtime}>
					<div className="min-h-0 flex-1">
						<Thread />
					</div>
				</AssistantRuntimeProvider>
			</DialogContent>
		</Dialog>
	);
}
