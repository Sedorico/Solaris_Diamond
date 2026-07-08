import {
  getAiSession,
  getPosSnapshot,
  getAttendanceSnapshot,
  type AiPeriod,
} from "@/lib/ai/server-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };

// Groq — free, no credit card, OpenAI-compatible. Fast Llama inference.
const MODEL = "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_TOOL_ROUNDS = 3;

const SYSTEM = `You are the Solaris Diamond Business Intelligence Assistant — a seasoned, full-time business consultant embedded inside the subscriber's Solaris Diamond workspace.

Your job is to understand, analyse, explain, and improve THIS subscriber's own business using the structured BUSINESS DATA provided below and, when available, the live database tools. You are not a generic chatbot and not a coding assistant.

How to respond:
- Be conversational, professional, confident, warm, and genuinely helpful — like a trusted advisor, never robotic.
- Don't just recite numbers. Go deep: explain what they mean, WHY they moved (root cause), how they compare to the previous period (give % changes), where the trend is heading, and what to do next. Explain → compare → diagnose → recommend → predict.
- When the owner asks something broad ("how's my business?"), synthesise across modules instead of listing each one flatly — lead with the single most important insight.
- All money is Philippine Pesos; format as ₱ with thousands separators (e.g. ₱12,540).
- Keep answers tight and skimmable. Use short paragraphs or a few bullet points. No walls of text.
- Ground every claim in the provided data or tool results. NEVER invent figures. If the data needed isn't present, say so plainly (e.g. "I don't have sales records for that period yet.").
- Never expose internal IDs, database structure, raw query mechanics, or another business's data.
- SUBSCRIPTION AWARENESS: the owner is subscribed only to the modules listed in \`subscribedModules\` (when that field is present), and you ONLY have data for those. If they ask about a business area they have NOT subscribed to, do NOT invent figures — briefly tell them that module isn't part of their plan yet and they can subscribe to it to unlock those insights.

Live database tools (only when provided):
- The BUSINESS DATA JSON is a client-side snapshot; the tools read the REAL live database for Point of Sale and Attendance. Prefer the tools whenever the question involves POS sales, transactions, product performance at the register, or staff attendance — the tool result is the source of truth if the two disagree.
- Call a tool at most when it's actually needed; simple conversational replies don't need one.

FOLLOW-UPS (required): end EVERY answer with one final line in exactly this format, and nothing after it:
FOLLOWUPS: first natural follow-up question | second one | third one
Each must be a short question the owner could ask next, only about modules they're subscribed to.

Treat the JSON below as the live state of the subscriber's business. "today", "thisWeek" (last 7 days), "lastWeek" (the 7 days before that) are already computed for you.`;

// ── Groq tool definitions (OpenAI function-calling shape) ───────────────────
const PERIODS: AiPeriod[] = ["today", "yesterday", "week", "month"];

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_pos_report",
      description:
        "Read the subscriber's LIVE Point of Sale sales from the database: revenue, transaction count, average sale, items sold, best sellers, top categories, peak hours, payment methods, and daily trend for a period.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: PERIODS,
            description: "Which period to report on.",
          },
        },
        required: ["period"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_attendance_report",
      description:
        "Read the subscriber's LIVE staff attendance from the database: present/late/absent counts, attendance percentage, average working hours, and who came in late, for a period.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: PERIODS,
            description: "Which period to report on.",
          },
        },
        required: ["period"],
      },
    },
  },
] as const;

type GroqMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls: {
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

async function runTool(
  tenantId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const period = PERIODS.includes(args.period as AiPeriod)
    ? (args.period as AiPeriod)
    : "week";
  try {
    if (name === "get_pos_report") {
      return JSON.stringify(await getPosSnapshot(tenantId, period));
    }
    if (name === "get_attendance_report") {
      return JSON.stringify(await getAttendanceSnapshot(tenantId, period));
    }
    return JSON.stringify({ error: `Unknown tool: ${name}` });
  } catch (err) {
    console.error("[ai/chat] tool", name, err);
    return JSON.stringify({
      error: "Couldn't read that data right now — answer from the snapshot instead.",
    });
  }
}

async function groqFetch(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<Response | null> {
  // Groq calls occasionally hit a transient "fetch failed" — retry a couple of
  // times before giving up so a momentary blip doesn't break the chat.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error("[ai/chat] groq fetch attempt", attempt, err);
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return null;
}

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      "The AI assistant isn't configured yet. Add GROQ_API_KEY to your environment.",
      { status: 503 },
    );
  }

  let body: { messages?: ChatMessage[]; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  // First turn must be the user's — drop any leading assistant greeting.
  let start = 0;
  while (start < incoming.length && incoming[start].role !== "user") start++;
  const convo = incoming.slice(start).map((m) => ({
    role: m.role,
    content: String(m.content ?? "").slice(0, 4000),
  }));

  if (convo.length === 0) {
    return new Response("No question provided.", { status: 400 });
  }

  // Live-DB tools are only offered to an authenticated owner/admin — the
  // session's tenantId (never the client payload) scopes every query.
  const session = await getAiSession();

  const systemText = `${SYSTEM}\n\nBUSINESS DATA (JSON):\n${JSON.stringify(
    body.context ?? {},
  )}`;

  const messages: GroqMessage[] = [
    { role: "system", content: systemText },
    ...convo,
  ];

  // ── Tool-resolution rounds (non-streamed, only when authenticated) ──
  if (session) {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const res = await groqFetch(apiKey, {
        model: MODEL,
        temperature: 0.5,
        max_tokens: 1024,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      });
      if (!res || !res.ok) {
        const detail = res ? await res.text().catch(() => "") : "";
        console.error("[ai/chat] groq tool round error", res?.status, detail.slice(0, 300));
        break; // fall through to the streamed answer without tool grounding
      }
      const data = await res.json().catch(() => null);
      const msg = data?.choices?.[0]?.message;
      const calls: {
        id: string;
        function: { name: string; arguments: string };
      }[] = msg?.tool_calls ?? [];
      if (!calls.length) break;

      messages.push({
        role: "assistant",
        content: msg.content ?? null,
        tool_calls: calls.map((c) => ({
          id: c.id,
          type: "function" as const,
          function: c.function,
        })),
      });
      for (const call of calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          // malformed arguments — run with defaults
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: (
            await runTool(session.tenantId, call.function.name, args)
          ).slice(0, 6000),
        });
      }
    }
  }

  // ── Final streamed answer ──
  const upstream = await groqFetch(apiKey, {
    model: MODEL,
    stream: true,
    temperature: 0.6,
    max_tokens: 1400,
    messages,
    // Tool phase is done — force prose so the stream is always readable text.
    ...(session ? { tools: TOOLS, tool_choice: "none" } : {}),
  });

  if (!upstream || !upstream.ok || !upstream.body) {
    const detail = upstream ? await upstream.text().catch(() => "") : "";
    console.error("[ai/chat] groq error", upstream?.status, detail.slice(0, 300));
    return new Response(
      "Sorry — the assistant couldn't be reached. Please try again.",
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Re-emit Groq's OpenAI-style SSE as a plain token stream the UI understands.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const json = trimmed.slice(5).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json);
              const text = parsed?.choices?.[0]?.delta?.content ?? "";
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // partial JSON across chunks — ignore; next read completes it
            }
          }
        }
      } catch (err) {
        console.error("[ai/chat] stream error", err);
        controller.enqueue(
          encoder.encode("\n\nSorry — I hit a snag. Please try again."),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
