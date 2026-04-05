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
  seal_image_url: string | null;
};

type Invoice = {
  invoice_number: string;
  subtotal: number;
  tax_8: number;
  tax_10: number;
  total: number;
};

type Item = {
  description: string;
  tax_rate: number;
  amount: number;
};

type Props = {
  invoice: Invoice;
  items: Item[];
  company: Company;
  customerName: string;
  receiptNumber: string;
  issueDate: string;
};

const fmt = (n: number) => n.toLocaleString("ja-JP");
const gray = "#6e6e73";
const border = "#d2d2d7";
const black = "#1d1d1f";

export function ReceiptPdfDocument({ invoice, items, company, customerName, receiptNumber, issueDate }: Props) {
  const subtotal8 = items.filter((it) => it.tax_rate === 8).reduce((s, it) => s + it.amount, 0);
  const subtotal10 = items.filter((it) => it.tax_rate === 10).reduce((s, it) => s + it.amount, 0);

  return (
    <Document>
      <Page size="A4" style={{ fontFamily: "NotoSansJP", padding: 48, fontSize: 10, color: black }}>
        {/* Title */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <Text style={{ fontSize: 24, fontWeight: 700, letterSpacing: 6 }}>領 収 書</Text>
        </View>

        {/* 宛先 + 右上発行情報 */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 28 }}>
          <View>
            <View style={{ borderBottomWidth: 2, borderBottomColor: black, paddingBottom: 4 }}>
              <Text>
                <Text style={{ fontSize: 16, fontWeight: 700 }}>{customerName}</Text>
                <Text style={{ fontSize: 11 }}>  様</Text>
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 9, marginBottom: 2 }}>
              <Text style={{ color: gray }}>領収書番号: </Text>
              <Text style={{ fontWeight: 600 }}>{receiptNumber}</Text>
            </Text>
            <Text style={{ fontSize: 9, marginBottom: 2 }}>
              <Text style={{ color: gray }}>発行日: </Text>
              <Text style={{ fontWeight: 600 }}>{issueDate}</Text>
            </Text>
            <Text style={{ fontSize: 9 }}>
              <Text style={{ color: gray }}>対応請求書: </Text>
              <Text style={{ fontWeight: 600 }}>{invoice.invoice_number}</Text>
            </Text>
          </View>
        </View>

        {/* 金額 */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Text style={{ fontSize: 9, color: gray, marginBottom: 6 }}>領収金額</Text>
          <View style={{ borderBottomWidth: 2, borderBottomColor: black, paddingBottom: 6, paddingHorizontal: 20 }}>
            <Text>
              <Text style={{ fontSize: 24, fontWeight: 700 }}>¥{fmt(invoice.total)}-</Text>
              <Text style={{ fontSize: 10, color: gray }}>  (税込)</Text>
            </Text>
          </View>
        </View>

        {/* 但し書き */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 9, color: gray, marginBottom: 3 }}>但し</Text>
          <View style={{ borderBottomWidth: 1, borderBottomColor: border, paddingBottom: 3, alignSelf: "flex-start" }}>
            <Text style={{ fontSize: 11 }}>{items.map((it) => it.description).join("、")} として</Text>
          </View>
        </View>

        {/* 上記正に領収いたしました */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Text style={{ fontSize: 10 }}>上記正に領収いたしました。</Text>
        </View>

        {/* 内訳 + 発行者 */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 28 }}>
          {/* 内訳 */}
          <View style={{ width: "45%" }}>
            <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 6 }}>内訳</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: border }}>
              <Text style={{ fontSize: 10 }}>小計</Text>
              <Text style={{ fontSize: 10 }}>{fmt(invoice.subtotal)}円</Text>
            </View>
            {subtotal8 > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: border }}>
                <Text style={{ fontSize: 10 }}>消費税（8%）</Text>
                <Text style={{ fontSize: 10 }}>{fmt(invoice.tax_8)}円</Text>
              </View>
            )}
            {subtotal10 > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: border }}>
                <Text style={{ fontSize: 10 }}>消費税（10%）</Text>
                <Text style={{ fontSize: 10 }}>{fmt(invoice.tax_10)}円</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: 700 }}>合計</Text>
              <Text style={{ fontSize: 12, fontWeight: 700 }}>{fmt(invoice.total)}円</Text>
            </View>
          </View>

          {/* 発行者 */}
          <View style={{ width: "45%" }}>
            <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 6 }}>発行者</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: 700 }}>{company.name}</Text>
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
        </View>

        <View style={{ alignItems: "center", marginTop: 16 }}>
          <Text style={{ fontSize: 8, color: "#999" }}>本書を電子的に受領された場合、収入印紙の貼付は不要です</Text>
        </View>
      </Page>
    </Document>
  );
}
