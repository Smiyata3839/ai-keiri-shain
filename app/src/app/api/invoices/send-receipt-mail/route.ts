import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { ReceiptPdfDocument } from "@/lib/pdf/receipt-pdf";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
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
  const { data: company } = await serverSupabase
    .from("companies")
    .select("id, name, invoice_registration_number, postal_code, address, phone, email, seal_image_url")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 請求書取得
  const { data: invoice } = await serverSupabase
    .from("invoices")
    .select("id, invoice_number, subtotal, tax_8, tax_10, total, customer_id")
    .eq("id", invoiceId)
    .eq("company_id", companyId)
    .single();
  if (!invoice) {
    return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 });
  }

  // 顧客名取得
  const { data: customer } = await serverSupabase
    .from("customers")
    .select("name")
    .eq("id", invoice.customer_id)
    .single();

  // 明細取得
  const { data: items } = await serverSupabase
    .from("invoice_items")
    .select("description, tax_rate, amount")
    .eq("invoice_id", invoiceId)
    .order("created_at");

  const receiptNumber = invoice.invoice_number.replace("INV", "RCT");
  const issueDate = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });

  // PDF生成
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(
      ReceiptPdfDocument({
        invoice,
        items: (items ?? []).map((it) => ({ ...it, quantity: 0, unit_price: 0 })),
        company,
        customerName: customer?.name ?? "",
        receiptNumber,
        issueDate,
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
          filename: `${receiptNumber}.pdf`,
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

  return NextResponse.json({ success: true });
}
