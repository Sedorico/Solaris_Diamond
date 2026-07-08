import {
  getAiSession,
  getPosSnapshot,
  getAttendanceSnapshot,
} from "@/lib/ai/server-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "llama-3.3-70b-versatile";

const SYSTEM = `You are the Solaris Diamond Business Intelligence Assistant writing the owner's WEEKLY BUSINESS REPORT — a document they can print and file, not a chat reply.

Using ONLY the BUSINESS DATA JSON below, write the report in this exact structure (plain text; "## " for section headings, "• " for bullets, no other markdown):

## Executive Summary
2–3 sentences: how the week went overall, the single most important development, and the health verdict.

## Sales & Revenue
• Revenue this week vs last week with % change and what drove it.
• Transactions, average sale, best sellers, and anything notable in categories, peak hours, or payment methods.

## Expenses & Profit
• Expense movements this week and the biggest categories.
• Estimated profit and margin direction.

## Inventory
• Low-stock items that need a reorder (name them), inventory value, dead stock if any.

## Attendance & Team
• Attendance rate, late/absent patterns, average working hours.

## Recommendations
• 3–5 concrete, prioritised actions for next week — each one short sentence, most impactful first.

Rules:
- All money in ₱ with thousands separators. Give % changes wherever a prior period exists.
- Explain what numbers MEAN; don't just recite them. Ground everything in the data — never invent figures.
- If a module has no data (or isn't in subscribedModules), replace its section body with one line: "No data for this module this week." Never expose internal IDs or database structure.
- Where the JSON contains *Live blocks (pointOfSaleLive, attendanceLive), treat those as the source of truth over the client snapshot.
- Keep the whole report under ~400 words. No preamble before the first heading, nothing after the last section.`;

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response("GROQ_API_KEY not configured.", { status: 503 });
  }

  const session = await getAiSession();
  if (!session) {
    return new Response("Sign in to generate your report.", { status: 401 });
  }

  let body: { context?: unknown; name?: string; businessName?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  const context: Record<string, unknown> = {
    ...(typeof body.context === "object" && body.context !== null
      ? (body.context as Record<string, unknown>)
      : {}),
  };

  const [posWeek, posMonth, attendanceWeek] = await Promise.all([
    getPosSnapshot(session.tenantId, "week").catch(() => null),
    getPosSnapshot(session.tenantId, "month").catch(() => null),
    getAttendanceSnapshot(session.tenantId, "week").catch(() => null),
  ]);
  if (posWeek || posMonth) {
    context.pointOfSaleLive = {
      note: "Live register data from the database — source of truth for POS sales.",
      thisWeek: posWeek,
      thisMonth: posMonth,
    };
  }
  if (attendanceWeek) {
    context.attendanceLive = {
      note: "Live attendance data from the database — source of truth for staff attendance.",
      thisWeek: attendanceWeek,
    };
  }

  const systemText = `${SYSTEM}\n\nBUSINESS DATA (JSON):\n${JSON.stringify(context)}`;

  const payload = JSON.stringify({
    model: MODEL,
    stream: true,
    temperature: 0.4,
    max_tokens: 1200,
    messages: [
      { role: "system", content: systemText },
      {
        role: "user",
        content: "Write this week's business report.",
      },
    ],
  });

  // Retry transient network blips so a momentary failure doesn't blank the report.
  let upstream: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: payload,
      });
      break;
    } catch (err) {
      console.error("[ai/report] groq fetch attempt", attempt, err);
      if (attempt === 2) {
        return new Response("Couldn't generate the report right now.", {
          status: 502,
        });
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!upstream || !upstream.ok || !upstream.body) {
    const detail = upstream ? await upstream.text().catch(() => "") : "";
    console.error("[ai/report] groq error", upstream?.status, detail.slice(0, 300));
    return new Response("Couldn't generate the report right now.", {
      status: 502,
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

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
              // partial JSON across chunks — ignore
            }
          }
        }
      } catch (err) {
        console.error("[ai/report] stream error", err);
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
