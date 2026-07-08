import {
  getAiSession,
  getPosSnapshot,
  getAttendanceSnapshot,
} from "@/lib/ai/server-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "llama-3.3-70b-versatile";

const SYSTEM = `You are the Solaris Diamond Business Intelligence Assistant writing the owner's at-a-glance DASHBOARD SUMMARY for today.

Using ONLY the BUSINESS DATA JSON below, write a short, scannable daily briefing:
- Open with ONE warm lead-in sentence. The page already greets them by name, so don't repeat a big greeting — something like "Here's where your business stands today:" works. You may use their first name once.
- Then 5–7 bullet points, each starting with "• " and each ONE short sentence. Cover the most decision-relevant of: revenue today vs yesterday and this week vs last week (give the % change and what drove it), estimated profit, low-stock items needing a reorder, best and slowest sellers, notable expense movements, attendance / late staff.
- Explain what the numbers MEAN — don't just recite them. All money in ₱ with thousands separators.
- Finish with a final line exactly like: "Overall: <one phrase> — <one short reason>." giving a business-health verdict (e.g. Excellent, Healthy, Needs attention).
- Ground everything in the data. If a section has no data, skip that bullet rather than inventing it. Never expose IDs or internal structure.
Keep the whole briefing under ~140 words. Plain text only (use "• " for bullets, no markdown headers).`;

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response("GROQ_API_KEY not configured.", { status: 503 });
  }

  let body: { context?: unknown; name?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  const name = String(body.name ?? "there").slice(0, 60);

  // Ground the briefing in the REAL database (POS + attendance) when the
  // caller is an authenticated owner — merged alongside the client snapshot.
  const context: Record<string, unknown> = {
    ...(typeof body.context === "object" && body.context !== null
      ? (body.context as Record<string, unknown>)
      : {}),
  };
  const session = await getAiSession();
  if (session) {
    const [posToday, posWeek, attendanceWeek] = await Promise.all([
      getPosSnapshot(session.tenantId, "today").catch(() => null),
      getPosSnapshot(session.tenantId, "week").catch(() => null),
      getAttendanceSnapshot(session.tenantId, "week").catch(() => null),
    ]);
    if (posToday || posWeek) {
      context.pointOfSaleLive = {
        note: "Live register data from the database — source of truth for POS sales.",
        today: posToday,
        thisWeek: posWeek,
      };
    }
    if (attendanceWeek) {
      context.attendanceLive = {
        note: "Live attendance data from the database — source of truth for staff attendance.",
        thisWeek: attendanceWeek,
      };
    }
  }

  const systemText = `${SYSTEM}\n\nBUSINESS DATA (JSON):\n${JSON.stringify(
    context,
  )}`;

  const payload = JSON.stringify({
    model: MODEL,
    stream: true,
    temperature: 0.5,
    max_tokens: 700,
    messages: [
      { role: "system", content: systemText },
      {
        role: "user",
        content: `My first name is ${name}. Write today's business summary.`,
      },
    ],
  });

  // Retry transient network blips so a momentary failure doesn't blank the card.
  let upstream: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      upstream = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: payload,
        },
      );
      break;
    } catch (err) {
      console.error("[ai/summary] groq fetch attempt", attempt, err);
      if (attempt === 2) {
        return new Response("Couldn't generate a summary right now.", {
          status: 502,
        });
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!upstream || !upstream.ok || !upstream.body) {
    const detail = upstream ? await upstream.text().catch(() => "") : "";
    console.error(
      "[ai/summary] groq error",
      upstream?.status,
      detail.slice(0, 300),
    );
    return new Response("Couldn't generate a summary right now.", {
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
        console.error("[ai/summary] stream error", err);
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
