import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// 既存の発行済み請求書に対して売上仕訳（売掛金/売上高）を一括生成
export async function POST(req: NextRequest) {
  const serverSupabase = await createClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ユーザーのcompanyIdを自動取得
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }
  const companyId = company.id;

  // 重複した売上仕訳をクリーンアップ（同じdescriptionの2件目以降を削除）
  const { data: allSalesJournals } = await supabaseAdmin
    .from("journals")
    .select("id, description")
    .eq("company_id", companyId)
    .eq("debit_account", "売掛金")
    .eq("credit_account", "売上高")
    .order("created_at", { ascending: true });

  const seen = new Set<string>();
  let cleaned = 0;
  for (const j of allSalesJournals ?? []) {
    if (seen.has(j.description)) {
      await supabaseAdmin.from("journals").delete().eq("id", j.id);
      cleaned++;
    } else {
      seen.add(j.description);
    }
  }

  // 発行済み以降のステータスの請求書をすべて取得
  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_number, issue_date, total, status")
    .eq("company_id", companyId)
    .in("status", ["sent", "paid", "overdue", "partial"]);

  let created = 0;
  let skipped = 0;

  for (const inv of invoices ?? []) {
    const journalDesc = `${inv.invoice_number} 売上計上`;

    // 重複チェック（maybeSingleで0件=null、1件=data、2件以上=エラー回避）
    const { data: existing } = await supabaseAdmin
      .from("journals")
      .select("id")
      .eq("company_id", companyId)
      .eq("description", journalDesc)
      .eq("debit_account", "売掛金")
      .eq("credit_account", "売上高")
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    await supabaseAdmin.from("journals").insert({
      company_id: companyId,
      journal_date: inv.issue_date,
      debit_account: "売掛金",
      credit_account: "売上高",
      amount: inv.total,
      description: journalDesc,
      source: "auto",
    });
    created++;
  }

  return NextResponse.json({ created, skipped, cleaned, total: (invoices ?? []).length });
}
