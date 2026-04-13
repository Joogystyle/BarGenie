import { NextResponse } from "next/server";

type ChatRequestBody = {
  message?: unknown;
  userId?: unknown;
  sessionId?: unknown;
};

type N8nReplyBody = {
  reply?: unknown;
};

const N8N_TIMEOUT_MS = 30_000;

function getN8nWebhookUrl() {
  return process.env.N8N_WEBHOOK_URL ?? process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
}

export async function POST(request: Request) {
  const webhookUrl = getN8nWebhookUrl();

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "Missing N8N_WEBHOOK_URL" },
      { status: 500 },
    );
  }

  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { message, userId, sessionId } = body;

  if (
    typeof message !== "string" ||
    !message.trim() ||
    typeof userId !== "string" ||
    !userId.trim() ||
    typeof sessionId !== "string" ||
    !sessionId.trim()
  ) {
    return NextResponse.json(
      { error: "Missing required fields: message, userId, sessionId" },
      { status: 400 },
    );
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), N8N_TIMEOUT_MS);

  try {
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (webhookSecret) {
      headers["x-bargenie-webhook-secret"] = webhookSecret;
    }

    const upstreamResponse = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: message.trim(),
        userId: userId.trim(),
        sessionId: sessionId.trim(),
      }),
      signal: abortController.signal,
      cache: "no-store",
    });

    const responseText = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error:
            responseText ||
            `n8n request failed with status ${upstreamResponse.status}`,
        },
        { status: 502 },
      );
    }

    let parsed: N8nReplyBody = {};

    if (responseText) {
      try {
        parsed = JSON.parse(responseText) as N8nReplyBody;
      } catch {
        return NextResponse.json(
          { error: "n8n returned non-JSON response" },
          { status: 502 },
        );
      }
    }

    if (typeof parsed.reply !== "string" || !parsed.reply.trim()) {
      return NextResponse.json(
        { error: "n8n response missing reply" },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply: parsed.reply.trim() });
  } catch (error) {
    const isAbortError =
      error instanceof DOMException && error.name === "AbortError";

    return NextResponse.json(
      {
        error: isAbortError
          ? "n8n request timed out"
          : "Unable to reach bartender service",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}