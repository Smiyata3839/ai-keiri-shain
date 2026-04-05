import { NextRequest, NextResponse } from "next/server";
// STRIPE_DISABLED: Stripeを一時無効化中
// import Stripe from "stripe";
// import { supabaseAdmin } from "@/lib/supabase/admin";
// import { createClient } from "@/lib/supabase/server";

export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: "Stripe連携は現在無効化されています" }, { status: 503 });
}

/*
// ---- 以下、Stripe有効時のコード ----
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const serverSupabase = await createClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { companyId, stripeSecretKey } = await req.json() as {
    companyId: string;
    stripeSecretKey: string;
  };

  if (!companyId || !stripeSecretKey) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  // 会社の所有者確認
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // キー形式の簡易チェック
  if (!stripeSecretKey.startsWith("sk_test_") && !stripeSecretKey.startsWith("sk_live_")) {
    return NextResponse.json({ error: "Stripeシークレットキーの形式が正しくありません（sk_test_ または sk_live_ で始まる必要があります）" }, { status: 400 });
  }

  // Stripe接続テスト
  try {
    const stripe = new Stripe(stripeSecretKey);
    const balance = await stripe.balance.retrieve();

    // 接続成功 → DBに保存
    await supabaseAdmin
      .from("companies")
      .update({
        stripe_secret_key: stripeSecretKey,
        stripe_connected: true,
      })
      .eq("id", companyId);

    const mode = stripeSecretKey.startsWith("sk_test_") ? "テストモード" : "本番モード";

    return NextResponse.json({
      success: true,
      mode,
      currency: balance.available?.[0]?.currency ?? "jpy",
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: `Stripe接続に失敗しました: ${e instanceof Error ? e.message : "キーを確認してください"}` },
      { status: 400 },
    );
  }
}
*/
