"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/Sidebar";

// ---------- Types ----------
type Company = {
  id: string;
  name: string;
  invoice_registration_number: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account_type: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
};

type Customer = {
  id: string;
  name: string;
};

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
};

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  tax_8: number;
  tax_10: number;
  total: number;
  notes: string | null;
  company_id: string;
  customer_id: string;
};

// ---------- Main Page ----------
export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = createClient();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Invoice
      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", params.id)
        .single();
      if (invErr || !inv) {
        setError("請求書が見つかりません");
        setLoading(false);
        return;
      }
      setInvoice(inv);

      // Items
      const { data: itemsData } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", inv.id)
        .order("created_at");
      setItems(itemsData ?? []);

      // Company
      const { data: comp } = await supabase
        .from("companies")
        .select("*")
        .eq("id", inv.company_id)
        .single();
      setCompany(comp);

      // Customer
      const { data: cust } = await supabase
        .from("customers")
        .select("id, name")
        .eq("id", inv.customer_id)
        .single();
      setCustomer(cust);

      setLoading(false);
    };
    init();
  }, [params.id]);

  const handlePrint = () => {
    const originalTitle = document.title;
    if (invoice && customer) {
      document.title = `${invoice.invoice_number}_${customer.name}`;
    }
    window.print();
    document.title = originalTitle;
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area {
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            min-height: auto !important;
          }
          .print-content {
            margin-left: 0 !important;
          }
          body { margin: 0; padding: 0; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>

      <Sidebar className="no-print" />

      {/* Main Content */}
      <div
        className="print-content"
        style={{
          marginLeft: "360px",
          flex: 1,
          background: "var(--color-background)",
          minHeight: "100vh",
        }}
      >
        {/* Header */}
        <div
          className="no-print"
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--color-border)",
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(20px)",
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: "700",
                color: "var(--color-text)",
              }}
            >
              請求書詳細
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "var(--color-text-secondary)",
              }}
            >
              {invoice?.invoice_number ?? ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => router.push("/invoices")}
              style={{
                padding: "8px 20px",
                borderRadius: "var(--radius-button)",
                border: "1px solid var(--color-border)",
                background: "white",
                color: "var(--color-text)",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              一覧に戻る
            </button>
            {invoice?.status === "draft" && (
              <button
                onClick={() => router.push(`/invoices/${params.id}/edit`)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "var(--radius-button)",
                  border: "1px solid var(--color-primary)",
                  background: "transparent",
                  color: "var(--color-primary)",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                編集
              </button>
            )}
            <button
              onClick={handlePrint}
              disabled={!invoice}
              style={{
                padding: "8px 20px",
                borderRadius: "var(--radius-button)",
                border: "none",
                background: "var(--color-primary)",
                color: "white",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              印刷 / PDF保存
            </button>
          </div>
        </div>

        <div style={{ padding: "24px", display: "flex", justifyContent: "center" }}>
          {error && (
            <div
              style={{
                padding: "12px 16px",
                marginBottom: "16px",
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: "var(--radius-card)",
                color: "#dc2626",
                fontSize: "14px",
                width: "100%",
                maxWidth: "794px",
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--color-text-secondary)",
                padding: "60px",
              }}
            >
              読み込み中...
            </div>
          ) : invoice && company && customer ? (
            /* A4 Preview */
            <div
              className="print-area"
              style={{
                width: "794px",
                minHeight: "1123px",
                background: "white",
                borderRadius: "var(--radius-card)",
                boxShadow: "0 2px 16px rgba(0,0,0,0.1)",
                padding: "48px",
                boxSizing: "border-box",
                fontSize: "13px",
                color: "var(--color-text)",
              }}
            >
              {/* Title */}
              <div
                style={{
                  textAlign: "center",
                  marginBottom: "32px",
                }}
              >
                <h1
                  style={{
                    margin: "0 0 4px",
                    fontSize: "24px",
                    fontWeight: "700",
                  }}
                >
                  請求書
                </h1>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  適格請求書
                </div>
              </div>

              {/* Top Row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "32px",
                }}
              >
                {/* Company Info */}
                <div style={{ maxWidth: "48%" }}>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "700",
                      marginBottom: "6px",
                    }}
                  >
                    {company.name}
                  </div>
                  {company.invoice_registration_number && (
                    <div style={{ fontSize: "12px", marginBottom: "2px" }}>
                      登録番号: {company.invoice_registration_number}
                    </div>
                  )}
                  {company.postal_code && (
                    <div style={{ fontSize: "12px", marginBottom: "2px" }}>
                      〒{company.postal_code}
                    </div>
                  )}
                  {company.address && (
                    <div style={{ fontSize: "12px", marginBottom: "2px" }}>
                      {company.address}
                    </div>
                  )}
                  {company.phone && (
                    <div style={{ fontSize: "12px", marginBottom: "2px" }}>
                      TEL: {company.phone}
                    </div>
                  )}
                  {company.email && (
                    <div style={{ fontSize: "12px", marginBottom: "2px" }}>
                      {company.email}
                    </div>
                  )}
                </div>

                {/* Invoice Meta */}
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    請求書番号
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    {invoice.invoice_number}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    発行日
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      marginBottom: "8px",
                    }}
                  >
                    {invoice.issue_date}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    支払期限
                  </div>
                  <div style={{ fontSize: "14px" }}>{invoice.due_date}</div>
                </div>
              </div>

              {/* Customer */}
              <div
                style={{
                  marginBottom: "28px",
                  borderBottom: "2px solid var(--color-text)",
                  paddingBottom: "6px",
                }}
              >
                <span style={{ fontSize: "18px", fontWeight: "700" }}>
                  {customer.name}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "400",
                    marginLeft: "8px",
                  }}
                >
                  御中
                </span>
              </div>

              {/* Items Table */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: "16px",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--color-text)",
                    }}
                  >
                    <th style={{ ...previewThStyle, width: "90px" }}>日付</th>
                    <th style={previewThStyle}>品目</th>
                    <th style={{ ...previewThStyle, width: "60px", textAlign: "right" }}>数量</th>
                    <th style={{ ...previewThStyle, width: "100px", textAlign: "right" }}>単価</th>
                    <th style={{ ...previewThStyle, width: "120px", textAlign: "right" }}>金額</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid var(--color-border)",
                      }}
                    >
                      <td style={previewTdStyle}>{invoice.issue_date}</td>
                      <td style={previewTdStyle}>{item.description}</td>
                      <td style={{ ...previewTdStyle, textAlign: "right" }}>
                        {item.quantity.toLocaleString()}
                      </td>
                      <td style={{ ...previewTdStyle, textAlign: "right" }}>
                        {item.unit_price.toLocaleString()}円
                      </td>
                      <td
                        style={{
                          ...previewTdStyle,
                          textAlign: "right",
                          fontWeight: "600",
                        }}
                      >
                        {item.amount.toLocaleString()}円
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: "32px",
                }}
              >
                <div style={{ width: "260px" }}>
                  <div style={summaryRowStyle}>
                    <span>小計</span>
                    <span>{invoice.subtotal.toLocaleString()}円</span>
                  </div>
                  <div style={summaryRowStyle}>
                    <span>消費税（8%）</span>
                    <span>{invoice.tax_8.toLocaleString()}円</span>
                  </div>
                  <div style={summaryRowStyle}>
                    <span>消費税（10%）</span>
                    <span>{invoice.tax_10.toLocaleString()}円</span>
                  </div>
                  <div
                    style={{
                      ...summaryRowStyle,
                      borderTop: "2px solid var(--color-text)",
                      paddingTop: "8px",
                      marginTop: "4px",
                      fontWeight: "700",
                      fontSize: "16px",
                    }}
                  >
                    <span>合計</span>
                    <span>{invoice.total.toLocaleString()}円</span>
                  </div>
                </div>
              </div>

              {/* Bank Info */}
              {company.bank_name && (
                <div
                  style={{
                    padding: "16px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    fontSize: "13px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "700",
                      marginBottom: "8px",
                      fontSize: "13px",
                    }}
                  >
                    振込先口座
                  </div>
                  <div>
                    {company.bank_name} {company.bank_branch}
                  </div>
                  <div>
                    {company.bank_account_type} {company.bank_account_number}
                  </div>
                  {company.bank_account_holder && (
                    <div>名義: {company.bank_account_holder}</div>
                  )}
                </div>
              )}

              {/* Notes */}
              {invoice.notes && (
                <div style={{ marginBottom: "20px" }}>
                  <div
                    style={{
                      fontWeight: "700",
                      marginBottom: "6px",
                      fontSize: "13px",
                    }}
                  >
                    備考
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--color-text-secondary)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {invoice.notes}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------- Preview Styles ----------
const previewThStyle: React.CSSProperties = {
  padding: "8px 6px",
  textAlign: "left",
  fontSize: "11px",
  fontWeight: "600",
  color: "var(--color-text-secondary)",
};

const previewTdStyle: React.CSSProperties = {
  padding: "10px 6px",
};

const summaryRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "4px 0",
  fontSize: "14px",
};
