import { Document, Page, Text, View, Font, Image } from "@react-pdf/renderer";
import path from "path";

Font.register({
  family: "NotoSansJP",
  src: path.join(process.cwd(), "src/lib/pdf/fonts/NotoSansJP-Regular.ttf"),
});

type Company = {
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
  seal_image_url: string | null;
};

type Invoice = {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_8: number;
  tax_10: number;
  total: number;
  notes: string | null;
};

type Item = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
};

type Props = {
  invoice: Invoice;
  items: Item[];
  company: Company;
  customerName: string;
};

const fmt = (n: number) => n.toLocaleString("ja-JP");

const gray = "#6e6e73";
const border = "#d2d2d7";
const black = "#1d1d1f";

export function InvoicePdfDocument({ invoice, items, company, customerName }: Props) {
  const subtotal8 = items.filter((it) => it.tax_rate === 8).reduce((s, it) => s + it.amount, 0);
  const subtotal10 = items.filter((it) => it.tax_rate === 10).reduce((s, it) => s + it.amount, 0);
  const has8 = subtotal8 > 0;
  const has10 = subtotal10 > 0;

  return (
    <Document>
      <Page size="A4" style={{ fontFamily: "NotoSansJP", padding: 48, fontSize: 10, color: black }}>
        {/* Title */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Text style={{ fontSize: 22, fontWeight: 700 }}>請求書</Text>
          <Text style={{ fontSize: 10, color: gray, marginTop: 2 }}>適格請求書</Text>
        </View>

        {/* Top Row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 28 }}>
          {/* Company Info */}
          <View style={{ maxWidth: "48%" }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: 700 }}>{company.name}</Text>
              {company.seal_image_url && (
                <Image src={company.seal_image_url} style={{ width: 54, height: 54, marginLeft: -16, marginTop: -6, opacity: 0.85 }} />
              )}
            </View>
            {company.invoice_registration_number && <Text style={{ fontSize: 9, marginBottom: 1 }}>登録番号: {company.invoice_registration_number}</Text>}
            {company.postal_code && <Text style={{ fontSize: 9, marginBottom: 1 }}>〒{company.postal_code}</Text>}
            {company.address && <Text style={{ fontSize: 9, marginBottom: 1 }}>{company.address}</Text>}
            {company.phone && <Text style={{ fontSize: 9, marginBottom: 1 }}>TEL: {company.phone}</Text>}
            {company.email && <Text style={{ fontSize: 9, marginBottom: 1 }}>{company.email}</Text>}
          </View>

          {/* Invoice Meta */}
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 9, color: gray }}>請求書番号</Text>
            <Text style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{invoice.invoice_number}</Text>
            <Text style={{ fontSize: 9, color: gray }}>発行日</Text>
            <Text style={{ fontSize: 12, marginBottom: 6 }}>{invoice.issue_date}</Text>
            <Text style={{ fontSize: 9, color: gray }}>支払期限</Text>
            <Text style={{ fontSize: 12 }}>{invoice.due_date}</Text>
          </View>
        </View>

        {/* Customer */}
        <View style={{ borderBottomWidth: 2, borderBottomColor: black, paddingBottom: 4, marginBottom: 24 }}>
          <Text>
            <Text style={{ fontSize: 16, fontWeight: 700 }}>{customerName}</Text>
            <Text style={{ fontSize: 11 }}>  御中</Text>
          </Text>
        </View>

        {/* Items Table Header */}
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: black, paddingBottom: 4, marginBottom: 2 }}>
          <Text style={{ width: 70, fontSize: 9, color: gray }}>日付</Text>
          <Text style={{ flex: 1, fontSize: 9, color: gray }}>品目</Text>
          <Text style={{ width: 50, fontSize: 9, color: gray, textAlign: "right" }}>数量</Text>
          <Text style={{ width: 80, fontSize: 9, color: gray, textAlign: "right" }}>単価</Text>
          <Text style={{ width: 90, fontSize: 9, color: gray, textAlign: "right" }}>金額</Text>
        </View>

        {/* Items */}
        {items.map((item, i) => (
          <View key={i} style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: border, paddingVertical: 6 }}>
            <Text style={{ width: 70, fontSize: 10 }}>{invoice.issue_date}</Text>
            <Text style={{ flex: 1, fontSize: 10 }}>
              {item.description}{item.tax_rate === 8 ? " ※" : ""}
            </Text>
            <Text style={{ width: 50, fontSize: 10, textAlign: "right" }}>{fmt(item.quantity)}</Text>
            <Text style={{ width: 80, fontSize: 10, textAlign: "right" }}>{fmt(item.unit_price)}円</Text>
            <Text style={{ width: 90, fontSize: 10, textAlign: "right", fontWeight: 600 }}>{fmt(item.amount)}円</Text>
          </View>
        ))}

        {has8 && (
          <Text style={{ fontSize: 9, color: gray, textAlign: "right", marginTop: 4 }}>※軽減税率対象</Text>
        )}

        {/* Summary */}
        <View style={{ alignItems: "flex-end", marginTop: 16, marginBottom: 28 }}>
          <View style={{ width: 280 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 11 }}>小計</Text>
              <Text style={{ fontSize: 11 }}>{fmt(invoice.subtotal)}円</Text>
            </View>
            {has8 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text style={{ fontSize: 10 }}>8%対象 {fmt(subtotal8)}円</Text>
                <Text style={{ fontSize: 10 }}>消費税 {fmt(invoice.tax_8)}円</Text>
              </View>
            )}
            {has10 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text style={{ fontSize: 10 }}>10%対象 {fmt(subtotal10)}円</Text>
                <Text style={{ fontSize: 10 }}>消費税 {fmt(invoice.tax_10)}円</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 2, borderTopColor: black, paddingTop: 6, marginTop: 3 }}>
              <Text style={{ fontSize: 14, fontWeight: 700 }}>合計</Text>
              <Text style={{ fontSize: 14, fontWeight: 700 }}>{fmt(invoice.total)}円</Text>
            </View>
          </View>
        </View>

        {/* Bank Info */}
        {company.bank_name && (
          <View style={{ borderWidth: 1, borderColor: border, borderRadius: 6, padding: 12, marginBottom: 16 }}>
            <Text style={{ fontWeight: 700, fontSize: 10, marginBottom: 6 }}>振込先口座</Text>
            <Text style={{ fontSize: 10 }}>{company.bank_name} {company.bank_branch}</Text>
            <Text style={{ fontSize: 10 }}>{company.bank_account_type} {company.bank_account_number}</Text>
            {company.bank_account_holder && <Text style={{ fontSize: 10 }}>名義: {company.bank_account_holder}</Text>}
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View>
            <Text style={{ fontWeight: 700, fontSize: 10, marginBottom: 4 }}>備考</Text>
            <Text style={{ fontSize: 10, color: gray }}>{invoice.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
