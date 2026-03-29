import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

// GET: 診断結果を取得
export async function GET() {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const { data: company } = await supabaseAdmin
      .from("companies").select("id").eq("user_id", user.id).single();
    if (!company) {
      return NextResponse.json({ error: "会社が見つかりません。" }, { status: 404 });
    }

    const { data: profile } = await supabaseAdmin
      .from("owner_profiles").select("*").eq("company_id", company.id).single();

    return NextResponse.json({ profile: profile ?? null });
  } catch (error) {
    console.error("GET owner-profile error:", error);
    return NextResponse.json({ error: "エラーが発生しました。" }, { status: 500 });
  }
}

// POST: 診断結果を保存
export async function POST(req: NextRequest) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const { data: company } = await supabaseAdmin
      .from("companies").select("id").eq("user_id", user.id).single();
    if (!company) {
      return NextResponse.json({ error: "会社が見つかりません。" }, { status: 404 });
    }

    const body = await req.json();
    const { owner_type, diagnosis_summary, strengths, risk_points, communication_style } = body;

    const { data: profile, error } = await supabaseAdmin
      .from("owner_profiles")
      .upsert(
        {
          company_id: company.id,
          owner_type,
          diagnosis_summary,
          strengths,
          risk_points,
          communication_style,
          diagnosed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Upsert error:", error);
      return NextResponse.json({ error: "保存に失敗しました。" }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("POST owner-profile error:", error);
    return NextResponse.json({ error: "エラーが発生しました。" }, { status: 500 });
  }
}
