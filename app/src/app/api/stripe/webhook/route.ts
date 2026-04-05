import { NextRequest, NextResponse } from "next/server";
// STRIPE_DISABLED: Stripeを一時無効化中
// import Stripe from "stripe";
// import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(_req: NextRequest) {
  return NextResponse.json({ received: true, disabled: true });
}

/*
// ---- 以下、Stripe有効時のコード ----
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  let payload: { type?: string; data?: { object?: { id?: string; payment_status?: string; metadata?: { invoiceId?: string } } } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const sessionId = payload.data?.object?.id;
  const invoiceId = payload.data?.object?.metadata?.invoiceId;

  if (!sessionId || !invoiceId) {
    return NextResponse.json({ received: true });
  }

  // DBでsession_idとinvoiceIdを照合
  const { data: invoice } = await supabaseAdmin
    .from("invoices")
    .select("id, company_id, stripe_session_id")
    .eq("id", invoiceId)
    .eq("stripe_session_id", sessionId)
    .single();

  if (!invoice) {
    return NextResponse.json({ received: true });
  }

  // 会社のStripeキーで実際にStripe APIへ問い合わせて支払い状態を確認
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("stripe_secret_key")
    .eq("id", invoice.company_id)
    .single();

  if (!company?.stripe_secret_key) {
    return NextResponse.json({ received: true });
  }

  const stripe = new Stripe(company.stripe_secret_key);
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === "paid") {
    await supabaseAdmin
      .from("invoices")
      .update({ status: "paid" })
      .eq("id", invoiceId);
  }

  return NextResponse.json({ received: true });
}
*/
