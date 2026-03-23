import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CsvRow = {
  issueDate: string;
  customerName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

type GroupedInvoice = {
  issueDate: string;
  customerName: string;
  customerId: string;
  items: { description: string; quantity: number; unitPrice: number; taxRate: number }[];
};

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Skip header
  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    if (cols.length < 6) throw new Error(`不正な行: ${line}`);

    // 発行日を YYYY-MM-DD に正規化
    const rawDate = cols[0];
    const issueDate = rawDate.replace(/\//g, "-");

    return {
      issueDate,
      customerName: cols[1],
      description: cols[2],
      quantity: Number(cols[3]),
      unitPrice: Number(cols[4]),
      taxRate: Number(cols[5]),
    };
  });
}

export async function POST(req: NextRequest) {
  const serverSupabase = await createClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }
  const companyId = company.id;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
  }

  const text = await file.text();
  let rows: CsvRow[];
  try {
    rows = parseCsv(text);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "CSV解析エラー" }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "データ行がありません" }, { status: 400 });
  }

  // 顧客名でcustomersテーブルを検索
  const uniqueNames = [...new Set(rows.map((r) => r.customerName))];
  const { data: customers } = await supabaseAdmin
    .from("customers")
    .select("id, name")
    .eq("company_id", companyId)
    .in("name", uniqueNames);

  const customerMap = new Map<string, string>();
  for (const c of customers ?? []) {
    customerMap.set(c.name, c.id);
  }

  // 見つからない顧客名をチェック
  const missing = uniqueNames.filter((n) => !customerMap.has(n));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `顧客が見つかりません: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  // 同じ発行日＋顧客名でグルーピング
  const groupKey = (r: CsvRow) => `${r.issueDate}|${r.customerName}`;
  const groupMap = new Map<string, GroupedInvoice>();
  for (const r of rows) {
    const key = groupKey(r);
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        issueDate: r.issueDate,
        customerName: r.customerName,
        customerId: customerMap.get(r.customerName)!,
        items: [],
      });
    }
    groupMap.get(key)!.items.push({
      description: r.description,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      taxRate: r.taxRate,
    });
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const group of groupMap.values()) {
    // 重複チェック：同じ発行日＋顧客IDが既に存在する場合はスキップ
    const { data: existing } = await supabaseAdmin
      .from("invoices")
      .select("id")
      .eq("company_id", companyId)
      .eq("customer_id", group.customerId)
      .eq("issue_date", group.issueDate)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    // 金額計算
    let subtotal = 0;
    let tax8 = 0;
    let tax10 = 0;
    for (const it of group.items) {
      const amount = it.quantity * it.unitPrice;
      subtotal += amount;
      if (it.taxRate === 8) {
        tax8 += Math.floor(amount * 0.08);
      } else {
        tax10 += Math.floor(amount * 0.1);
      }
    }
    const total = subtotal + tax8 + tax10;

    // 請求書番号を生成
    const ymd = group.issueDate.replace(/-/g, "");
    const prefix = `INV-${ymd}-`;
    const { count } = await supabaseAdmin
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .like("invoice_number", `${prefix}%`);
    const seq = String((count ?? 0) + 1).padStart(3, "0");
    const invoiceNumber = `${prefix}${seq}`;

    // 支払期日：月末締め翌月末払い
    const d = new Date(group.issueDate + "T00:00:00");
    const dueDate = new Date(d.getFullYear(), d.getMonth() + 2, 0);
    const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;

    // 請求書を挿入
    const { data: inv, error: invErr } = await supabaseAdmin
      .from("invoices")
      .insert({
        company_id: companyId,
        customer_id: group.customerId,
        invoice_number: invoiceNumber,
        issue_date: group.issueDate,
        due_date: dueDateStr,
        status: "draft",
        subtotal,
        tax_8: tax8,
        tax_10: tax10,
        total,
        notes: null,
      })
      .select("id")
      .single();

    if (invErr) {
      errors.push(`${group.customerName}(${group.issueDate}): ${invErr.message}`);
      continue;
    }

    // 明細を挿入
    const itemRows = group.items.map((it) => ({
      invoice_id: inv.id,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      tax_rate: it.taxRate,
      amount: it.quantity * it.unitPrice,
    }));
    await supabaseAdmin.from("invoice_items").insert(itemRows);

    // 売上仕訳はdraft→sent発行時に自動生成されるため、ここでは行わない

    created++;
  }

  return NextResponse.json({ created, skipped, errors, total: groupMap.size });
}
