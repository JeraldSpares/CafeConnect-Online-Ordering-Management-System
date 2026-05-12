import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { chat, chatbotEnabled, type ChatMessage } from "@/lib/chatbot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 20;
const MAX_CONTENT_CHARS = 2000;

export async function GET() {
  return NextResponse.json({ enabled: chatbotEnabled() });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 });
  }
  if (raw.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: `too many messages (max ${MAX_MESSAGES})` },
      { status: 400 },
    );
  }

  const messages: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const trimmed = content.trim();
    if (!trimmed) continue;
    messages.push({
      role,
      content: trimmed.slice(0, MAX_CONTENT_CHARS),
    });
  }

  if (messages.length === 0 || messages.at(-1)?.role !== "user") {
    return NextResponse.json(
      { error: "last message must be from the user" },
      { status: 400 },
    );
  }

  try {
    const result = await chat(messages);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }
    return NextResponse.json({ text: result.text });
  } catch (e) {
    console.error("[chat]", e);
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "I'm getting too many questions right now — try again in a moment." },
        { status: 429 },
      );
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: "The assistant ran into a problem. Please try again." },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
