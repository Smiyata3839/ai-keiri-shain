// ============================================================
// 共通バリデーション関数
// フロントエンド・APIルート両方から利用する
// ============================================================

export type ValidationError = {
  field: string;
  message: string;
};

// ── 汎用 ──

/** 必須チェック */
export function required(value: string | null | undefined, fieldName: string): string | null {
  if (!value || !value.trim()) return `${fieldName}を入力してください`;
  return null;
}

/** 0以上の整数チェック */
export function nonNegativeInteger(value: number, fieldName: string): string | null {
  if (!Number.isFinite(value) || value < 0) return `${fieldName}は0以上の値を入力してください`;
  if (!Number.isInteger(value)) return `${fieldName}は整数で入力してください`;
  return null;
}

/** 1以上の整数チェック */
export function positiveInteger(value: number, fieldName: string): string | null {
  if (!Number.isFinite(value) || value < 1) return `${fieldName}は1以上の値を入力してください`;
  if (!Number.isInteger(value)) return `${fieldName}は整数で入力してください`;
  return null;
}

// ── インボイス登録番号 ──

const INVOICE_REG_NUMBER_PATTERN = /^T\d{13}$/;

/** T+13桁の形式チェック（空の場合はスキップ） */
export function invoiceRegistrationNumber(value: string): string | null {
  if (!value) return null; // 任意項目
  if (!INVOICE_REG_NUMBER_PATTERN.test(value)) {
    return "登録番号はT+13桁の数字で入力してください（例: T1234567890123）";
  }
  return null;
}

// ── メールアドレス ──

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** メールアドレス形式チェック（空の場合はスキップ） */
export function email(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null; // 任意項目
  if (!EMAIL_PATTERN.test(value.trim())) {
    return "メールアドレスの形式が正しくありません";
  }
  return null;
}

// ── 電話番号 ──

const PHONE_PATTERN = /^[\d\-+()（）\s]{7,20}$/;

/** 電話番号形式チェック（空の場合はスキップ） */
export function phone(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null; // 任意項目
  if (!PHONE_PATTERN.test(value.trim())) {
    return "電話番号の形式が正しくありません";
  }
  return null;
}

// ── 請求書明細 ──

export type InvoiceItemInput = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
};

/** 請求書の明細行をバリデーション */
export function validateInvoiceItems(items: InvoiceItemInput[]): string | null {
  if (items.length === 0) return "明細を1行以上入力してください";

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const row = i + 1;
    if (!item.description || !item.description.trim()) {
      return `明細${row}行目：品目を入力してください`;
    }
    if (!Number.isFinite(item.quantity) || item.quantity < 1 || !Number.isInteger(item.quantity)) {
      return `明細${row}行目：数量は1以上の整数を入力してください`;
    }
    if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
      return `明細${row}行目：単価は0以上の値を入力してください`;
    }
    if (item.tax_rate !== 8 && item.tax_rate !== 10) {
      return `明細${row}行目：税率は8%または10%を選択してください`;
    }
  }
  return null;
}

// ── 請求書全体 ──

export type InvoiceInput = {
  customerId: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItemInput[];
  total: number;
};

/** 請求書のバリデーション */
export function validateInvoice(input: InvoiceInput): string | null {
  if (!input.customerId) return "顧客を選択してください";
  if (!input.issueDate) return "発行日を入力してください";
  if (!input.dueDate) return "支払期限を入力してください";

  const itemErr = validateInvoiceItems(input.items);
  if (itemErr) return itemErr;

  if (input.total < 0) return "合計金額が不正です";

  return null;
}

// ── 顧客 ──

export type CustomerInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
};

/** 顧客のバリデーション */
export function validateCustomer(input: CustomerInput): string | null {
  const nameErr = required(input.name, "顧客名");
  if (nameErr) return nameErr;

  const emailErr = email(input.email);
  if (emailErr) return emailErr;

  const phoneErr = phone(input.phone);
  if (phoneErr) return phoneErr;

  return null;
}

// ── 請求書CSV行バリデーション ──

export type InvoiceCsvRowError = {
  row: number;
  message: string;
};

/** 請求書CSVの全行をバリデーションし、行番号付きエラーを返す */
export function validateInvoiceCsvRows(
  rows: Record<string, string>[],
): InvoiceCsvRowError[] {
  const errors: InvoiceCsvRowError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // ヘッダー行 = 1行目なのでデータは2行目から

    const issueDate = (row["発行日"] ?? "").trim();
    const customerName = (row["顧客名"] ?? "").trim();
    const description = (row["品目"] ?? "").trim();
    const quantityStr = (row["数量"] ?? "").trim();
    const unitPriceStr = (row["単価"] ?? "").trim();
    const taxRateStr = (row["税率"] ?? "").trim();

    if (!issueDate) {
      errors.push({ row: rowNum, message: "発行日が空です" });
    } else if (!/^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/.test(issueDate)) {
      errors.push({ row: rowNum, message: "発行日の形式が不正です（例: 2025/04/30）" });
    }

    if (!customerName) {
      errors.push({ row: rowNum, message: "顧客名が空です" });
    }

    if (!description) {
      errors.push({ row: rowNum, message: "品目が空です" });
    }

    const quantity = Number(quantityStr);
    if (!quantityStr) {
      errors.push({ row: rowNum, message: "数量が空です" });
    } else if (!Number.isFinite(quantity) || quantity < 1 || !Number.isInteger(quantity)) {
      errors.push({ row: rowNum, message: "数量は1以上の整数を入力してください" });
    }

    const unitPrice = Number(unitPriceStr);
    if (!unitPriceStr) {
      errors.push({ row: rowNum, message: "単価が空です" });
    } else if (!Number.isFinite(unitPrice)) {
      errors.push({ row: rowNum, message: "単価が数値ではありません" });
    } else if (unitPrice < 0) {
      errors.push({ row: rowNum, message: "金額がマイナスです" });
    }

    const taxRate = Number(taxRateStr);
    if (!taxRateStr) {
      errors.push({ row: rowNum, message: "税率が空です" });
    } else if (taxRate !== 8 && taxRate !== 10) {
      errors.push({ row: rowNum, message: "税率は8または10を指定してください" });
    }
  }

  return errors;
}

// ── 顧客CSV行バリデーション ──

export type CustomerCsvRowError = {
  row: number;
  message: string;
};

/** 全角カタカナ（スペース・中黒含む）チェック */
const FULLWIDTH_KATAKANA_PATTERN = /^[\u30A0-\u30FF\u3000\u3001\u30FB\s]+$/;

export function fullwidthKatakana(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null; // 任意項目
  if (!FULLWIDTH_KATAKANA_PATTERN.test(value.trim())) {
    return "振込名カナは全角カタカナで入力してください";
  }
  return null;
}

/** 顧客CSVの全行をバリデーションし、行番号付きエラーを返す */
export function validateCustomerCsvRows(
  rows: { name: string; email?: string | null; phone?: string | null; transfer_kana?: string | null }[],
  rowOffset = 2, // ヘッダー行 = 1行目
): CustomerCsvRowError[] {
  const errors: CustomerCsvRowError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + rowOffset;

    if (!row.name || !row.name.trim()) {
      errors.push({ row: rowNum, message: "顧客名が空です" });
    }

    if (row.email && row.email.trim()) {
      const emailErr = email(row.email);
      if (emailErr) {
        errors.push({ row: rowNum, message: emailErr });
      }
    }

    if (row.phone && row.phone.trim()) {
      const phoneErr = phone(row.phone);
      if (phoneErr) {
        errors.push({ row: rowNum, message: phoneErr });
      }
    }

    if (row.transfer_kana && row.transfer_kana.trim()) {
      const kanaErr = fullwidthKatakana(row.transfer_kana);
      if (kanaErr) {
        errors.push({ row: rowNum, message: kanaErr });
      }
    }
  }

  return errors;
}

// ── 銀行明細CSV ──

/** CSVファイル形式チェック */
export function validateCsvFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return "CSVファイルのみアップロードできます";
  }
  return null;
}

/** 銀行明細トランザクションのバリデーション */
export type BankTransactionInput = {
  transaction_date: string;
  description: string;
  amount: number;
  balance: number;
};

export function validateBankTransactions(transactions: BankTransactionInput[]): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (transactions.length === 0) {
    errors.push("取込可能な明細がありません");
    return { errors, warnings };
  }

  const negativeRows: number[] = [];
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (!tx.transaction_date) {
      errors.push(`${i + 1}行目：取引日が不正です`);
    }
    if (!Number.isFinite(tx.amount)) {
      errors.push(`${i + 1}行目：金額が不正です`);
    }
    if (tx.amount < 0) {
      negativeRows.push(i + 1);
    }
  }

  if (negativeRows.length > 0) {
    warnings.push(`${negativeRows.length}件のマイナス金額（出金）があります（${negativeRows.length <= 5 ? negativeRows.join(", ") + "行目" : negativeRows.slice(0, 5).join(", ") + `行目 他${negativeRows.length - 5}件`}）`);
  }

  return { errors, warnings };
}
