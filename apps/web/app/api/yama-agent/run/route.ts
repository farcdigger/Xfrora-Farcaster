import { NextResponse } from "next/server";
import { env } from "@/env.mjs";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 12000;

async function triggerAgent(limit?: number) {
  if (!env.YAMA_AGENT_TRIGGER_URL) {
    return NextResponse.json(
      { error: "YAMA_AGENT_TRIGGER_URL is not configured" },
      { status: 500 },
    );
  }

  const targetUrl = new URL(env.YAMA_AGENT_TRIGGER_URL);
  const limitValue = limit ?? DEFAULT_LIMIT;

  if (!targetUrl.searchParams.has("limitPerProtocol")) {
    targetUrl.searchParams.set("limitPerProtocol", String(limitValue));
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (env.YAMA_AGENT_TRIGGER_TOKEN) {
    headers.Authorization = `Bearer ${env.YAMA_AGENT_TRIGGER_TOKEN}`;
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      method: targetUrl.searchParams.size > 0 ? "GET" : "POST",
      headers,
    });

    const body = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Agent trigger failed",
          status: response.status,
          body,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "Yama Agent trigger dispatched",
        status: response.status,
        body,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[api/yama-agent/run] trigger error:", err);
    return NextResponse.json(
      { error: "Failed to trigger Yama Agent" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  return triggerAgent(limit);
}

export async function POST(request: Request) {
  const { limit } = await request.json().catch(() => ({ limit: undefined }));
  return triggerAgent(typeof limit === "number" ? limit : undefined);
}

