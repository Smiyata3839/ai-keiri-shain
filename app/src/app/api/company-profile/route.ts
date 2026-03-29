import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

// GET: 会社プロファイル取得
export async function GET() {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!company) {
      return NextResponse.json({ error: "会社が見つかりません。" }, { status: 404 });
    }

    const { data: profile } = await supabaseAdmin
      .from("company_profiles")
      .select("*")
      .eq("company_id", company.id)
      .single();

    return NextResponse.json({ profile: profile ?? null });
  } catch (error) {
    console.error("GET company-profile error:", error);
    return NextResponse.json({ error: "エラーが発生しました。" }, { status: 500 });
  }
}

// POST: 会社プロファイルを更新（upsert）
export async function POST(req: NextRequest) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!company) {
      return NextResponse.json({ error: "会社が見つかりません。" }, { status: 404 });
    }

    const body = await req.json();
    const { industry, accounting_characteristics, special_rules, tax_notes, other_notes } = body;

    const { data: profile, error } = await supabaseAdmin
      .from("company_profiles")
      .upsert(
        {
          company_id: company.id,
          industry: industry ?? null,
          accounting_characteristics: accounting_characteristics ?? null,
          special_rules: special_rules ?? null,
          tax_notes: tax_notes ?? null,
          other_notes: other_notes ?? null,
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
    console.error("POST company-profile error:", error);
    return NextResponse.json({ error: "エラーが発生しました。" }, { status: 500 });
  }
}
