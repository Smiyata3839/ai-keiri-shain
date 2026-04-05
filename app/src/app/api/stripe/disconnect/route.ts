import { NextRequest, NextResponse } from "next/server";
// STRIPE_DISABLED: Stripeを一時無効化中
// import { supabaseAdmin } from "@/lib/supabase/admin";
// import { createClient } from "@/lib/supabase/server";

export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: "Stripe連携は現在無効化されています" }, { status: 503 });
}

/*
// ---- 以下、Stripe有効時のコード ----
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const serverSupabase = await createClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { companyId } = await req.json() as { companyId: string };
  if (!companyId) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabaseAdmin
    .from("companies")
    .update({ stripe_secret_key: null, stripe_connected: false })
    .eq("id", companyId);

  return NextResponse.json({ success: true });
}
*/
