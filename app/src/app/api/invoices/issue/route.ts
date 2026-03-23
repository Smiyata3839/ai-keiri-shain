import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const serverSupabase = await createClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { invoiceId, companyId } = await req.json() as {
    invoiceId: string;
    companyId: string;
  };

  // companyIdが該当ユーザーのものか確認
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 請求書を取得
  const { data: invoice } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_number, issue_date, total, status, customer_id")
    .eq("id", invoiceId)
    .eq("company_id", companyId)
    .single();
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // ステータスをsentに更新
  await supabaseAdmin
    .from("invoices")
    .update({ status: "sent" })
    .eq("id", invoiceId);

  // 売上仕訳を生成（重複チェック付き）
  const journalDesc = `${invoice.invoice_number} 売上計上`;
  const { data: existingJournal } = await supabaseAdmin
    .from("journals")
    .select("id")
    .eq("company_id", companyId)
    .eq("description", journalDesc)
    .eq("debit_account", "売掛金")
    .eq("credit_account", "売上高")
    .maybeSingle();

  if (!existingJournal) {
    await supabaseAdmin.from("journals").insert({
      company_id: companyId,
      journal_date: invoice.issue_date,
      debit_account: "売掛金",
      credit_account: "売上高",
      amount: invoice.total,
      description: journalDesc,
      source: "auto",
    });
  }

  return NextResponse.json({ success: true });
}
