import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { InvoicePdfDocument } from "@/lib/pdf/invoice-pdf";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const serverSupabase = await createClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { invoiceId, companyId, subject, body, to } = await req.json() as {
    invoiceId: string;
    companyId: string;
    subject: string;
    body: string;
    to: string;
  };

  if (!invoiceId || !companyId || !subject || !body || !to) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  // 会社情報取得
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("id, name, invoice_registration_number, postal_code, address, phone, email, bank_name, bank_branch, bank_account_type, bank_account_number, bank_account_holder, seal_image_url")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 請求書取得
  const { data: invoice } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_number, issue_date, due_date, status, subtotal, tax_8, tax_10, total, notes, customer_id")
    .eq("id", invoiceId)
    .eq("company_id", companyId)
    .single();
  if (!invoice) {
    return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 });
  }

  // 顧客名取得
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("name")
    .eq("id", invoice.customer_id)
    .single();

  // 明細取得
  const { data: items } = await supabaseAdmin
    .from("invoice_items")
    .select("description, quantity, unit_price, tax_rate, amount")
    .eq("invoice_id", invoiceId)
    .order("created_at");

  // PDF生成
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(
      InvoicePdfDocument({
        invoice,
        items: items ?? [],
        company,
        customerName: customer?.name ?? "",
      })
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: `PDF生成に失敗しました: ${e instanceof Error ? e.message : ""}` },
      { status: 500 },
    );
  }

  // メール送信（PDF添付）
  try {
    const { error: sendErr } = await resend.emails.send({
      from: `${company.name} <onboarding@resend.dev>`,
      to: [to],
      subject,
      html: body.replace(/\n/g, "<br>"),
      attachments: [
        {
          filename: `${invoice.invoice_number}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
    if (sendErr) {
      return NextResponse.json({ error: sendErr.message }, { status: 500 });
    }
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "メール送信に失敗しました" },
      { status: 500 },
    );
  }

  // ステータスを delivered に更新
  const newStatus = invoice.status === "overdue" ? "overdue" : "delivered";
  await supabaseAdmin
    .from("invoices")
    .update({ status: newStatus })
    .eq("id", invoiceId);

  return NextResponse.json({ success: true, status: newStatus });
}
