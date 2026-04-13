"use client";

import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Bot, MessageSquarePlus, Send, Sparkles, Trash2, User } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  typing?: boolean;
  createdAt?: string;
};

type ChatSession = {
  id: string;
  title: string;
  lastMessagePreview: string;
  lastMessageAt: string;
};

type ChatHistoryRow = {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
};

const NEW_CHAT_PREVIEW = "Start a new conversation";

function createWelcomeMessage(): ChatMessage {
  return {
    id: globalThis.crypto.randomUUID(),
    role: "assistant",
    content:
      "Tell me what flavor you want, or tap Surprise me and I will work with what you have.",
    createdAt: new Date().toISOString(),
  };
}

function trimPreview(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();

  if (!compact) {
    return NEW_CHAT_PREVIEW;
  }

  return compact.length > 72 ? `${compact.slice(0, 69)}...` : compact;
}

function buildSessionSummary(sessionId: string, sessionMessages: ChatMessage[]): ChatSession {
  const userPrompt = sessionMessages.find((message) => message.role === "user" && message.content.trim());
  const lastMessage = [...sessionMessages]
    .reverse()
    .find((message) => !message.typing && message.content.trim());

  return {
    id: sessionId,
    title: userPrompt ? trimPreview(userPrompt.content) : "New chat",
    lastMessagePreview: lastMessage ? trimPreview(lastMessage.content) : NEW_CHAT_PREVIEW,
    lastMessageAt: lastMessage?.createdAt ?? new Date().toISOString(),
  };
}

function messageIcon(role: ChatRole) {
  return role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />;
}

export function ChatClient({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail?: string;
}) {
  const [supabase] = useState(() => createClient());
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messagesBySession, setMessagesBySession] = useState<Record<string, ChatMessage[]>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([createWelcomeMessage()]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>([createWelcomeMessage()]);

  const ensureProfileExists = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const metadataUsername =
      typeof authData.user?.user_metadata?.username === "string"
        ? authData.user.user_metadata.username.trim()
        : "";
    const fallbackNameSource = userEmail?.split("@")[0]?.trim() || "bargenie";
    const metadataSafe = metadataUsername
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24);
    const fallbackSafe = fallbackNameSource
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24) || "bargenie";
    const safeSuffix = userId.replace(/-/g, "").slice(0, 12);
    const suffixedFallback = `${fallbackSafe.slice(0, 11)}_${safeSuffix}`;
    const primaryUsername = metadataSafe || suffixedFallback;

    const upsertProfile = async (username: string) => {
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          username,
        },
        {
          onConflict: "id",
          ignoreDuplicates: true,
        },
      );

      return profileError;
    };

    const profileError = await upsertProfile(primaryUsername);

    if (
      profileError &&
      metadataSafe &&
      (profileError.code === "23505" || profileError.message.toLowerCase().includes("duplicate"))
    ) {
      const retryError = await upsertProfile(suffixedFallback);

      if (retryError) {
        throw retryError;
      }

      return;
    }

    if (profileError) {
      throw profileError;
    }
  };

  const syncSessionState = useCallback((targetSessionId: string, nextMessages: ChatMessage[]) => {
    setMessagesBySession((current) => ({
      ...current,
      [targetSessionId]: nextMessages,
    }));

    setSessions((current) => {
      const nextSummary = buildSessionSummary(targetSessionId, nextMessages);
      const next = [nextSummary, ...current.filter((session) => session.id !== targetSessionId)];

      next.sort(
        (left, right) =>
          new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime(),
      );

      return next;
    });
  }, []);

  const loadChatHistory = useCallback(async () => {
    setIsLoadingHistory(true);

    try {
      const { data, error: historyError } = await supabase
        .from("chat_history")
        .select("id, session_id, role, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (historyError) {
        throw historyError;
      }

      const rows = (data ?? []) as ChatHistoryRow[];

      if (rows.length === 0) {
        const newSessionId = globalThis.crypto.randomUUID();
        const starterMessages = [createWelcomeMessage()];

        setSessionId(newSessionId);
        setMessages(starterMessages);
        messagesRef.current = starterMessages;
        syncSessionState(newSessionId, starterMessages);
        return;
      }

      const grouped = rows.reduce<Record<string, ChatMessage[]>>((accumulator, row) => {
        const bucket = accumulator[row.session_id] ?? [];

        bucket.push({
          id: row.id,
          role: row.role,
          content: row.content,
          createdAt: row.created_at,
        });

        accumulator[row.session_id] = bucket;
        return accumulator;
      }, {});

      const nextSessions = Object.entries(grouped)
        .map(([id, sessionMessages]) => buildSessionSummary(id, sessionMessages))
        .sort(
          (left, right) =>
            new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime(),
        );

      const initialSessionId = nextSessions[0]?.id;

      if (!initialSessionId) {
        const newSessionId = globalThis.crypto.randomUUID();
        const starterMessages = [createWelcomeMessage()];

        setSessionId(newSessionId);
        setMessages(starterMessages);
        messagesRef.current = starterMessages;
        syncSessionState(newSessionId, starterMessages);
        return;
      }

      const initialMessages = grouped[initialSessionId] ?? [createWelcomeMessage()];

      setMessagesBySession(grouped);
      setSessions(nextSessions);
      setSessionId(initialSessionId);
      setMessages(initialMessages);
      messagesRef.current = initialMessages;
    } catch (historyLoadError) {
      setError(
        historyLoadError instanceof Error
          ? historyLoadError.message
          : "Unable to load your previous chats.",
      );

      const newSessionId = globalThis.crypto.randomUUID();
      const starterMessages = [createWelcomeMessage()];

      setSessionId(newSessionId);
      setMessages(starterMessages);
      messagesRef.current = starterMessages;
      syncSessionState(newSessionId, starterMessages);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [supabase, syncSessionState, userId]);

  useEffect(() => {
    void loadChatHistory();
  }, [loadChatHistory]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  const finalizeAssistantReply = (targetSessionId: string, reply: string) => {
    const next = [...messagesRef.current];

    for (let index = next.length - 1; index >= 0; index -= 1) {
      if (next[index].typing) {
        next[index] = {
          ...next[index],
          content: reply,
          typing: false,
          createdAt: new Date().toISOString(),
        };

        setMessages(next);
        syncSessionState(targetSessionId, next);
        return;
      }
    }

    const withAssistantMessage = [
      ...next,
      {
        id: globalThis.crypto.randomUUID(),
        role: "assistant" as const,
        content: reply,
        createdAt: new Date().toISOString(),
      },
    ];

    setMessages(withAssistantMessage);
    syncSessionState(targetSessionId, withAssistantMessage);
  };

  const persistConversation = async (reply: string, prompt: string, targetSessionId: string) => {
    await ensureProfileExists();

    const { error: insertError } = await supabase.from("chat_history").insert([
      {
        user_id: userId,
        session_id: targetSessionId,
        role: "user",
        content: prompt,
      },
      {
        user_id: userId,
        session_id: targetSessionId,
        role: "assistant",
        content: reply,
      },
    ]);

    if (insertError) {
      throw insertError;
    }
  };

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();

    if (!message || isSending) {
      return;
    }

    const targetSessionId = sessionId || globalThis.crypto.randomUUID();

    if (!sessionId) {
      setSessionId(targetSessionId);
    }

    const typingId = globalThis.crypto.randomUUID();
    const fallbackReply =
      "The bar's dark tonight, friend. Even the bottles need rest. Come back when the lights are on.";

    const nextMessages = [
      ...messagesRef.current,
      {
        id: globalThis.crypto.randomUUID(),
        role: "user" as const,
        content: message,
        createdAt: new Date().toISOString(),
      },
      {
        id: typingId,
        role: "assistant" as const,
        content: "",
        typing: true,
      },
    ];

    setError(null);
    setIsSending(true);
    setInput("");
    setMessages(nextMessages);
    messagesRef.current = nextMessages;
    syncSessionState(targetSessionId, nextMessages);

    let reply = fallbackReply;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          userId,
          sessionId: targetSessionId,
        }),
      });

      const rawBody = await response.text();
      const parsedBody = rawBody
        ? (JSON.parse(rawBody) as { reply?: unknown; error?: unknown })
        : {};

      if (!response.ok) {
        if (typeof parsedBody.error === "string" && parsedBody.error.trim()) {
          throw new Error(parsedBody.error.trim());
        }

        throw new Error(rawBody || `Webhook request failed (${response.status})`);
      }

      if (typeof parsedBody.reply === "string" && parsedBody.reply.trim()) {
        reply = parsedBody.reply.trim();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reach the bartender service right now.",
      );
    }

    finalizeAssistantReply(targetSessionId, reply);

    try {
      await persistConversation(reply, message, targetSessionId);
    } catch (databaseError) {
      setError(
        databaseError instanceof Error
          ? databaseError.message
          : "Failed to save this exchange.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(input);
  };

  const selectSession = (nextSessionId: string) => {
    setSessionId(nextSessionId);
    const nextMessages = messagesBySession[nextSessionId] ?? [createWelcomeMessage()];
    setMessages(nextMessages);
    messagesRef.current = nextMessages;
    setError(null);
  };

  const createNewSession = () => {
    const newSessionId = globalThis.crypto.randomUUID();
    const starterMessages = [createWelcomeMessage()];

    setSessionId(newSessionId);
    setMessages(starterMessages);
    messagesRef.current = starterMessages;
    syncSessionState(newSessionId, starterMessages);
    setError(null);
  };

  const deleteSession = async (targetSessionId: string) => {
    if (deletingSessionId || isSending) {
      return;
    }

    setError(null);
    setDeletingSessionId(targetSessionId);

    try {
      const { error: deleteError } = await supabase
        .from("chat_history")
        .delete()
        .eq("user_id", userId)
        .eq("session_id", targetSessionId);

      if (deleteError) {
        throw deleteError;
      }

      const remainingSessions = sessions.filter((session) => session.id !== targetSessionId);

      setSessions(remainingSessions);
      setMessagesBySession((current) => {
        const next = { ...current };
        delete next[targetSessionId];
        return next;
      });

      if (sessionId !== targetSessionId) {
        return;
      }

      const nextSessionId = remainingSessions[0]?.id;

      if (nextSessionId) {
        const nextMessages = messagesBySession[nextSessionId] ?? [createWelcomeMessage()];
        setSessionId(nextSessionId);
        setMessages(nextMessages);
        messagesRef.current = nextMessages;
        return;
      }

      const newSessionId = globalThis.crypto.randomUUID();
      const starterMessages = [createWelcomeMessage()];

      setSessionId(newSessionId);
      setMessages(starterMessages);
      messagesRef.current = starterMessages;
      syncSessionState(newSessionId, starterMessages);
    } catch (deleteSessionError) {
      setError(
        deleteSessionError instanceof Error
          ? deleteSessionError.message
          : "Failed to delete this session.",
      );
    } finally {
      setDeletingSessionId(null);
    }
  };

  return (
    <main className="speakeasy-shell h-svh overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="glass-panel flex flex-col gap-3 rounded-2xl px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              BarGenie
            </p>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              <h1 className="font-heading text-4xl font-semibold leading-[1.05] text-foreground">
                Cocktail Concierge
              </h1>
              <p className="text-base text-muted-foreground">
                Describe your mood, bottles, or budget and I will craft a pour.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
            <Button asChild variant="outline" className="whitespace-nowrap">
              <Link href="/profile">Flavor profile</Link>
            </Button>
            <Button asChild variant="outline" className="whitespace-nowrap">
              <Link href="/bottles">Bottle cabinet</Link>
            </Button>
            <Button asChild variant="outline" className="whitespace-nowrap">
              <Link href="/library">Library</Link>
            </Button>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[18rem_1fr]">
          <Card className="glass-panel flex min-h-0 flex-col rounded-2xl text-foreground">
            <CardHeader className="border-b border-border/30 pb-4">
              <CardTitle className="font-heading text-3xl font-semibold leading-none text-foreground">
                Chat Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-4">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={createNewSession}
                disabled={isLoadingHistory}
              >
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                New chat
              </Button>

              <div className="min-h-0 space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {isLoadingHistory ? (
                  <p className="text-sm text-muted-foreground">Loading chat history...</p>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sessions yet. Start your first chat.</p>
                ) : (
                  sessions.map((session) => (
                    <div key={session.id} className="relative">
                      <button
                        type="button"
                        onClick={() => selectSession(session.id)}
                        className={cn(
                          "w-full rounded-xl border-[2px] px-3 py-3 pr-10 text-left transition",
                          session.id === sessionId
                            ? "border-primary bg-primary/10"
                            : "border-border/50 bg-background/40 hover:border-primary/50",
                        )}
                      >
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">{session.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{session.lastMessagePreview}</p>
                      </button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-rose-400"
                        aria-label="Delete chat session"
                        disabled={deletingSessionId === session.id || isSending}
                        onClick={() => void deleteSession(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel flex min-h-0 flex-col rounded-2xl text-foreground">
            <CardHeader className="border-b border-border/30 pb-4">
              <CardTitle className="font-heading flex flex-wrap items-center gap-2 text-3xl font-semibold leading-none text-foreground">
                <span>Bartender Thread</span>
                <span className="text-2xl text-muted-foreground/80">|</span>
                <span className="text-base font-medium text-muted-foreground">
                  Ask for something specific or let the bartender choose.
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {messages.map((message) => {
                  const isUser = message.role === "user";

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex items-end gap-3",
                        isUser ? "justify-end" : "justify-start",
                      )}
                    >
                      {!isUser ? (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[2px] border-border bg-secondary text-foreground">
                          {messageIcon(message.role)}
                        </div>
                      ) : null}

                      <div
                        className={cn(
                          "max-w-[85%] rounded-3xl px-4 py-3 text-base leading-6 shadow-noir-sm",
                          isUser
                            ? "rounded-br-md border-[2px] border-border bg-primary font-medium text-primary-foreground"
                            : "rounded-bl-md border-[2px] border-border bg-popover text-foreground",
                        )}
                      >
                        {message.typing ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
                          </span>
                        ) : (
                          message.role === "assistant" ? (
                            <div className="space-y-3 break-words text-base leading-7 [&_a]:underline [&_code]:rounded [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm [&_li]:ml-5 [&_li]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:whitespace-pre-wrap [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-background/60 [&_pre]:p-3 [&_strong]:font-semibold [&_ul]:space-y-1">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          )
                        )}
                      </div>

                      {isUser ? (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[2px] border-border bg-primary text-primary-foreground">
                          {messageIcon(message.role)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 border-t border-border/30 pt-4">
                <div className="glass-input flex items-center gap-2 rounded-2xl p-2">
                  <input
                    type="text"
                    className="h-10 w-full min-w-0 bg-transparent px-2 text-base font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground"
                    placeholder="Tell me what you want to drink..."
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void sendMessage(input);
                      }
                    }}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-foreground"
                    onClick={() => void sendMessage("Surprise me with a cocktail I can make right now")}
                    disabled={isSending || isLoadingHistory}
                  >
                    <Sparkles className="h-4 w-4" />
                    Surprise me
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    className="halftone-ruby shrink-0"
                    disabled={isSending || isLoadingHistory}
                  >
                    <Send className="h-4 w-4" />
                    {isSending ? "Mixing..." : "Send"}
                  </Button>
                </div>

                {error ? <p className="text-sm text-rose-300/90">{error}</p> : null}
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}