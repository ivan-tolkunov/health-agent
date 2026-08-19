"use client";

import {
	AssistantRuntimeProvider,
	type ChatModelAdapter,
	useLocalRuntime,
} from "@assistant-ui/react";
import { Bot, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Thread } from "@/components/assistant-ui/thread";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

type CoachModel = {
	provider: string;
	id: string;
	name: string;
};

type CoachChatMessage = {
	role: "user" | "assistant";
	content: string;
};

function CoachChatThread({
	date,
	initialMessages,
	selectedModelRef,
	modelSelector,
}: {
	date: string;
	initialMessages: CoachChatMessage[];
	selectedModelRef: { current: CoachModel | undefined };
	modelSelector: ReactNode;
}) {
	const adapter = useMemo<ChatModelAdapter>(
		() => ({
			async *run({ messages, abortSignal }) {
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
					body: JSON.stringify({
						date,
						messages: chatMessages,
						model: selectedModelRef.current,
					}),
					signal: abortSignal,
				});
				if (!response.ok || !response.body) {
					const data: { error?: string } = await response
						.json()
						.catch(() => ({}));
					throw new Error(data.error ?? "Pi could not respond.");
				}

				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let text = "";
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						text += decoder.decode(value, { stream: true });
						yield { content: [{ type: "text", text }] };
					}
					const tail = decoder.decode();
					if (tail) {
						text += tail;
						yield { content: [{ type: "text", text }] };
					}
				} finally {
					reader.releaseLock();
				}
			},
		}),
		[date, selectedModelRef],
	);
	const runtime = useLocalRuntime(adapter, { initialMessages });

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<div className="min-h-0 flex-1">
				<Thread composerLeading={modelSelector} />
			</div>
		</AssistantRuntimeProvider>
	);
}

export function CoachChatDialog({ date }: { date: string }) {
	const [models, setModels] = useState<CoachModel[]>([]);
	const [selectedModel, setSelectedModel] = useState<CoachModel>();
	const [messages, setMessages] = useState<CoachChatMessage[]>([]);
	const [loaded, setLoaded] = useState(false);
	const [clearing, setClearing] = useState(false);
	const [chatVersion, setChatVersion] = useState(0);
	const selectedModelRef = useRef<CoachModel | undefined>(undefined);

	useEffect(() => {
		selectedModelRef.current = selectedModel;
	}, [selectedModel]);

	useEffect(() => {
		let cancelled = false;
		void fetch(`/api/coach/chat?date=${encodeURIComponent(date)}`)
			.then(async (response) => {
				const data: {
					models?: CoachModel[];
					messages?: CoachChatMessage[];
				} = await response.json();
				if (cancelled) return;
				setModels(data.models ?? []);
				setSelectedModel((current) => current ?? data.models?.[0]);
				setMessages(data.messages ?? []);
			})
			.catch(() => {})
			.finally(() => {
				if (!cancelled) setLoaded(true);
			});
		return () => {
			cancelled = true;
		};
	}, [date]);

	async function startNewChat() {
		setClearing(true);
		try {
			const response = await fetch(
				`/api/coach/chat?date=${encodeURIComponent(date)}`,
				{ method: "DELETE" },
			);
			if (!response.ok) return;
			setMessages([]);
			setChatVersion((version) => version + 1);
		} finally {
			setClearing(false);
		}
	}

	const modelSelector = (
		<select
			aria-label="Chat model"
			className="h-7 max-w-36 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-wait disabled:opacity-60"
			disabled={models.length === 0}
			value={
				selectedModel ? `${selectedModel.provider}/${selectedModel.id}` : ""
			}
			onChange={(event) =>
				setSelectedModel(
					models.find(
						(model) => `${model.provider}/${model.id}` === event.target.value,
					) ?? selectedModel,
				)
			}
		>
			{models.length === 0 ? <option>Loading models…</option> : null}
			{models.map((model) => (
				<option
					key={`${model.provider}/${model.id}`}
					value={`${model.provider}/${model.id}`}
				>
					{model.name}
				</option>
			))}
		</select>
	);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<button className="coach-chat-trigger" type="button">
					<Sparkles aria-hidden="true" size={18} strokeWidth={2.25} />
					<span className="sr-only">Ask Pi</span>
				</button>
			</DialogTrigger>
			<DialogContent className="flex h-[min(680px,calc(100dvh-2rem))] w-[min(42rem,calc(100%-1.5rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(42rem,calc(100%-2rem))]">
				<DialogHeader className="shrink-0 border-b bg-muted/30 px-5 py-4 pr-12 sm:px-6">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2.5">
							<span className="flex size-7 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
								<Bot aria-hidden="true" size={16} strokeWidth={2.25} />
							</span>
							<DialogTitle>Pi Coach</DialogTitle>
						</div>
						<button
							aria-label="Start a new chat"
							className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
							disabled={clearing}
							onClick={startNewChat}
							title="Start a new chat"
							type="button"
						>
							<RotateCcw aria-hidden="true" size={15} />
						</button>
					</div>
					<DialogDescription>
						Ask about your health data for {date}. Pi can read it but cannot
						change it.
					</DialogDescription>
				</DialogHeader>
				{loaded ? (
					<CoachChatThread
						key={chatVersion}
						date={date}
						initialMessages={messages}
						selectedModelRef={selectedModelRef}
						modelSelector={modelSelector}
					/>
				) : (
					<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
						Loading chat…
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
