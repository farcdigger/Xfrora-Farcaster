import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/db-supabase";

export const runtime = "nodejs";

export async function GET() {
  if (!supabaseClient) {
    return NextResponse.json(
      { error: "Supabase client is not configured" },
      { status: 500 },
    );
  }

  try {
    const { data, error } = await supabaseClient
      .from("graph_reports")
      .select(
        "report_date, generated_at, model_used, tokens_used, report_content",
      )
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[api/yama-agent/latest] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to load latest report" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({ report: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        reportDate: data.report_date,
        generatedAt: data.generated_at ?? data.report_content?.generatedAt,
        modelUsed: data.model_used ?? data.report_content?.modelUsed,
        tokensUsed: data.tokens_used ?? data.report_content?.tokensUsed,
        report: data.report_content?.report ?? data.report_content,
        raw: data.report_content ?? null,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[api/yama-agent/latest] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}

