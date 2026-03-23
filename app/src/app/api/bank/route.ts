import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type TransactionRow = {
  transaction_date: string;
  description: string;
  amount: number;
  balance: number;
};

const getExpenseAccount = (desc: string): string => {
  if (/家賃|賃料|テナント/.test(desc)) return "地代家賃";
  if (/給与|給料|賞与|サラリー/.test(desc)) return "給料手当";
  if (/保険|社保|健保|厚生/.test(desc)) return "法定福利費";
  if (/電気|電力|ガス|水道|光熱/.test(desc)) return "水道光熱費";
  if (/通信|回線|電話|インターネット/.test(desc)) return "通信費";
  if (/会議|ミーティング|弁当|会食/.test(desc)) return "会議費";
  if (/書籍|図書|新聞|雑誌/.test(desc)) return "新聞図書費";
  if (/研修|セミナー|講習/.test(desc)) return "研修費";
  if (/福利|慶弔|健康診断/.test(desc)) return "福利厚生費";
  if (/交通|電車|バス|タクシー|新幹線|出張|宿泊|ホテル/.test(desc)) return "旅費交通費";
  if (/広告|宣伝|PR/.test(desc)) return "広告宣伝費";
  return "雑費";
};

const halfToFull = (str: string) => {
  const kanaMap: Record<string, string> = {
    'ｶﾞ':'ガ','ｷﾞ':'ギ','ｸﾞ':'グ','ｹﾞ':'ゲ','ｺﾞ':'ゴ',
    'ｻﾞ':'ザ','ｼﾞ':'ジ','ｽﾞ':'ズ','ｾﾞ':'ゼ','ｿﾞ':'ゾ',
    'ﾀﾞ':'ダ','ﾁﾞ':'ヂ','ﾂﾞ':'ヅ','ﾃﾞ':'デ','ﾄﾞ':'ド',
    'ﾊﾞ':'バ','ﾋﾞ':'ビ','ﾌﾞ':'ブ','ﾍﾞ':'ベ','ﾎﾞ':'ボ',
    'ﾊﾟ':'パ','ﾋﾟ':'ピ','ﾌﾟ':'プ','ﾍﾟ':'ペ','ﾎﾟ':'ポ',
    'ｳﾞ':'ヴ',
    'ｱ':'ア','ｲ':'イ','ｳ':'ウ','ｴ':'エ','ｵ':'オ',
    'ｶ':'カ','ｷ':'キ','ｸ':'ク','ｹ':'ケ','ｺ':'コ',
    'ｻ':'サ','ｼ':'シ','ｽ':'ス','ｾ':'セ','ｿ':'ソ',
    'ﾀ':'タ','ﾁ':'チ','ﾂ':'ツ','ﾃ':'テ','ﾄ':'ト',
    'ﾅ':'ナ','ﾆ':'ニ','ﾇ':'ヌ','ﾈ':'ネ','ﾉ':'ノ',
    'ﾊ':'ハ','ﾋ':'ヒ','ﾌ':'フ','ﾍ':'ヘ','ﾎ':'ホ',
    'ﾏ':'マ','ﾐ':'ミ','ﾑ':'ム','ﾒ':'メ','ﾓ':'モ',
    'ﾔ':'ヤ','ﾕ':'ユ','ﾖ':'ヨ',
    'ﾗ':'ラ','ﾘ':'リ','ﾙ':'ル','ﾚ':'レ','ﾛ':'ロ',
    'ﾜ':'ワ','ｦ':'ヲ','ﾝ':'ン',
    'ｧ':'ァ','ｨ':'ィ','ｩ':'ゥ','ｪ':'ェ','ｫ':'ォ',
    'ｯ':'ッ','ｬ':'ャ','ｭ':'ュ','ｮ':'ョ','ｰ':'ー',
    ')':')',  '(':'(',
  };
  // 濁音・半濁音（2文字）を先に変換してから単独文字を変換
  let result = str;
  for (const [half, full] of Object.entries(kanaMap)) {
    if (half.length === 2) result = result.split(half).join(full);
  }
  for (const [half, full] of Object.entries(kanaMap)) {
    if (half.length === 1) result = result.split(half).join(full);
  }
  return result;
};

const normalize = (str: string) => halfToFull(str)
  .replace(/\s/g, "")
  .replace(/）/g, ")")
  .replace(/（/g, "(")
  .replace(/　/g, "")
  .toUpperCase();

export async function POST(req: NextRequest) {
  // 認証チェック（リクエスト元ユーザーの確認）
  const serverSupabase = await createClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { companyId, transactions, format } = await req.json() as {
    companyId: string;
    transactions: TransactionRow[];
    format: string;
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

  // 未消込の請求書一覧を取得（消込判定用）
  const { data: invoicesData } = await supabaseAdmin
    .from("invoices")
    .select("id, customer_id, total, customers(kana, name, transfer_kana)")
    .eq("company_id", companyId)
    .in("status", ["sent", "overdue", "partial"]);

  // 消込済みの請求書IDを追跡（同一バッチ内での二重マッチ防止）
  const matchedInvoiceIds = new Set<string>();
  const invoices = invoicesData ?? [];

  let inserted = 0;
  let autoMatched = 0;

  for (const tx of transactions) {
    const { transaction_date, description, amount, balance } = tx;

    // 自動消込：摘要のカナと顧客カナを突合
    let matched = false;
    let invoice_id: string | null = null;

    if (amount > 0 && invoices.length > 0) {
      const normalizedDesc = normalize(description);
      console.log(`\n=== 消込判定: ${description} (amount=${amount}) ===`);
      console.log(`  desc原文: ${JSON.stringify(description)}`);
      console.log(`  desc正規化: ${JSON.stringify(normalizedDesc)}`);
      console.log(`  desc文字コード: ${[...normalizedDesc].map(c => c.charCodeAt(0).toString(16)).join(' ')}`);

      const matchedInvoice = invoices.find(inv => {
        // 同一バッチ内で既に消込済みの請求書はスキップ
        if (matchedInvoiceIds.has(inv.id)) return false;

        const custRaw = inv.customers as unknown as
          | { kana: string | null; name: string; transfer_kana?: string | null }
          | { kana: string | null; name: string; transfer_kana?: string | null }[]
          | null;
        const cust = Array.isArray(custRaw) ? custRaw[0] ?? null : custRaw;
        if (!cust) {
          console.log(`  顧客データなし (invoice ${inv.id})`);
          return false;
        }
        const transferKana = cust.transfer_kana ?? "";
        const normalizedKana = normalize(transferKana);
        const kanaMatch = normalizedKana ? normalizedDesc.includes(normalizedKana) : false;
        const amountMatch = Number(inv.total) === Number(amount);
        console.log(`  vs ${cust.name}: kana原文=${JSON.stringify(transferKana)} kana正規化=${JSON.stringify(normalizedKana)} kana文字コード=${[...normalizedKana].map(c => c.charCodeAt(0).toString(16)).join(' ')} カナ一致=${kanaMatch} 金額一致=${amountMatch} (inv.total=${inv.total})`);
        return normalizedKana && kanaMatch && amountMatch;
      });
      if (matchedInvoice) {
        matched = true;
        invoice_id = matchedInvoice.id;
        matchedInvoiceIds.add(matchedInvoice.id);
        console.log(`  → マッチ成功: invoice ${matchedInvoice.id}`);
      } else {
        console.log(`  → マッチなし`);
      }
    }

    // 重複チェック
    const { data: existing } = await supabaseAdmin
      .from("bank_transactions")
      .select("id, matched")
      .eq("company_id", companyId)
      .eq("transaction_date", transaction_date)
      .eq("description", description)
      .eq("amount", amount)
      .single();

    if (existing) {
      // 既存データでも消込判定を実行：未消込→消込済みに更新
      console.log(`[DEBUG] 既存レコード検出: id=${existing.id}, matched=${existing.matched}, 新matched=${matched}, invoice_id=${invoice_id}`);
      if (matched && !existing.matched && invoice_id) {
        await supabaseAdmin
          .from("bank_transactions")
          .update({ matched: true, invoice_id })
          .eq("id", existing.id);

        // UPDATE前に対象invoiceの現在statusを確認
        const { data: beforeInvoice } = await supabaseAdmin
          .from("invoices")
          .select("id, status, total")
          .eq("id", invoice_id)
          .single();
        console.log(`[DEBUG] invoices UPDATE前: invoice_id=${invoice_id}, 現在status=${beforeInvoice?.status ?? "NOT FOUND"}, total=${beforeInvoice?.total ?? "N/A"}`);

        const { data: updateData, error: updateErr, count: updateCount, status: httpStatus, statusText } = await supabaseAdmin
          .from("invoices")
          .update({ status: "paid" })
          .eq("id", invoice_id)
          .select();
        console.log(`[DEBUG] invoices UPDATE結果 (既存消込): invoice_id=${invoice_id}, error=${JSON.stringify(updateErr)}, httpStatus=${httpStatus}, statusText=${statusText}, updatedRows=${JSON.stringify(updateData)}, count=${updateCount}`);
        if (updateErr) {
          console.error(`請求書ステータス更新エラー (既存消込, invoice=${invoice_id}):`, updateErr);
        } else {
          console.log(`請求書ステータスをpaidに更新 (既存消込, invoice=${invoice_id})`);
        }

        // 既存の「普通預金/売上高」仕訳を「普通預金/売掛金」に更新
        const oldJournalDesc = `${description} 入金`;
        const { data: oldJournal } = await supabaseAdmin
          .from("journals")
          .select("id")
          .eq("company_id", companyId)
          .eq("journal_date", transaction_date)
          .eq("description", oldJournalDesc)
          .eq("amount", amount)
          .eq("debit_account", "普通預金")
          .eq("credit_account", "売上高")
          .single();
        if (oldJournal) {
          // 売上高→売掛金に更新し、摘要も変更
          await supabaseAdmin
            .from("journals")
            .update({ credit_account: "売掛金", description: `${description} 入金消込` })
            .eq("id", oldJournal.id);
        } else {
          // 既存仕訳がなければ消込仕訳を新規追加
          const journalDesc = `${description} 入金消込`;
          const { data: existingJournal } = await supabaseAdmin
            .from("journals")
            .select("id")
            .eq("company_id", companyId)
            .eq("journal_date", transaction_date)
            .eq("description", journalDesc)
            .eq("amount", amount)
            .eq("debit_account", "普通預金")
            .single();
          if (!existingJournal) {
            await supabaseAdmin.from("journals").insert({
              company_id: companyId,
              journal_date: transaction_date,
              debit_account: "普通預金",
              credit_account: "売掛金",
              amount: amount,
              description: journalDesc,
              source: "auto",
            });
          }
        }

        autoMatched++;
      }
      continue;
    }

    const { error } = await supabaseAdmin.from("bank_transactions").insert({
      company_id: companyId,
      transaction_date,
      description,
      amount,
      balance,
      matched,
      invoice_id,
    });

    if (!error) {
      inserted++;
      if (matched) autoMatched++;

      if (matched && invoice_id) {
        // UPDATE前に対象invoiceの現在statusを確認
        const { data: beforeInvoice } = await supabaseAdmin
          .from("invoices")
          .select("id, status, total")
          .eq("id", invoice_id)
          .single();
        console.log(`[DEBUG] invoices UPDATE前 (新規消込): invoice_id=${invoice_id}, 現在status=${beforeInvoice?.status ?? "NOT FOUND"}, total=${beforeInvoice?.total ?? "N/A"}`);

        const { data: updateData, error: updateErr, count: updateCount, status: httpStatus, statusText } = await supabaseAdmin
          .from("invoices")
          .update({ status: "paid" })
          .eq("id", invoice_id)
          .select();
        console.log(`[DEBUG] invoices UPDATE結果 (新規消込): invoice_id=${invoice_id}, error=${JSON.stringify(updateErr)}, httpStatus=${httpStatus}, statusText=${statusText}, updatedRows=${JSON.stringify(updateData)}, count=${updateCount}`);
        if (updateErr) {
          console.error(`請求書ステータス更新エラー (新規消込, invoice=${invoice_id}):`, updateErr);
        } else {
          console.log(`請求書ステータスをpaidに更新 (新規消込, invoice=${invoice_id})`);
        }
      }

      // 自動仕訳をINSERT（重複チェック付き）
      // 消込済み入金 → 普通預金/売掛金のみ（売上仕訳は請求書発行時に生成済み）
      // 未消込入金 → 仕訳なし（売上仕訳は請求書側で管理）
      if (amount > 0 && matched) {
        const journalDesc = `${description} 入金消込`;
        const { data: existingJournal } = await supabaseAdmin
          .from("journals")
          .select("id")
          .eq("company_id", companyId)
          .eq("journal_date", transaction_date)
          .eq("description", journalDesc)
          .eq("amount", amount)
          .eq("debit_account", "普通預金")
          .single();
        if (!existingJournal) {
          await supabaseAdmin.from("journals").insert({
            company_id: companyId,
            journal_date: transaction_date,
            debit_account: "普通預金",
            credit_account: "売掛金",
            amount: amount,
            description: journalDesc,
            source: "auto",
          });
        }
      } else if (amount < 0) {
        const journalDesc = `${description} 支払`;
        const debitAccount = getExpenseAccount(description);
        const absAmount = Math.abs(amount);
        const { data: existingJournal } = await supabaseAdmin
          .from("journals")
          .select("id")
          .eq("company_id", companyId)
          .eq("journal_date", transaction_date)
          .eq("description", journalDesc)
          .eq("amount", absAmount)
          .eq("debit_account", debitAccount)
          .single();
        if (!existingJournal) {
          await supabaseAdmin.from("journals").insert({
            company_id: companyId,
            journal_date: transaction_date,
            debit_account: debitAccount,
            credit_account: "普通預金",
            amount: absAmount,
            description: journalDesc,
            source: "auto",
          });
        }
      }
    }
  }

  return NextResponse.json({ inserted, autoMatched });
}
