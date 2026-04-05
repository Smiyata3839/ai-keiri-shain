import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const serverSupabase = await createClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { invoiceId, companyId } = await req.json() as { invoiceId: string; companyId: string };
  if (!invoiceId || !companyId) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("stripe_secret_key, stripe_connected, name")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company || !company.stripe_connected || !company.stripe_secret_key) {
    return NextResponse.json({ error: "Stripe未連携です" }, { status: 400 });
  }

  const { data: invoice } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_number, total")
    .eq("id", invoiceId)
    .eq("company_id", companyId)
    .single();
  if (!invoice) return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 });

  const stripe = new Stripe(company.stripe_secret_key);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "jpy",
          product_data: { name: `請求書 ${invoice.invoice_number}` },
          unit_amount: invoice.total,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${appUrl}/invoices/${invoiceId}?payment=success`,
      cancel_url: `${appUrl}/invoices/${invoiceId}`,
      metadata: { invoiceId },
    });

    await supabaseAdmin
      .from("invoices")
      .update({
        stripe_session_id: session.id,
        stripe_payment_url: session.url,
        status: "pending",
      })
      .eq("id", invoiceId);

    return NextResponse.json({ paymentUrl: session.url });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: `決済リンク作成に失敗しました: ${e instanceof Error ? e.message : ""}` },
      { status: 500 },
    );
  }
}
