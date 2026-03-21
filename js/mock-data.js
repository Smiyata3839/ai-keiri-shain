/* ========================================
   AI経理社員 - モックデータ定義
   ======================================== */

// 自社情報
const COMPANY = {
  name: '株式会社クリエイトデザイン',
  registration_number: 'T1234567890123',
  address: '東京都渋谷区神宮前1-2-3 クリエイトビル5F',
  phone: '03-1234-5678',
  representative: '田中 太郎',
  bank: 'みずほ銀行 渋谷支店 普通 1234567',
  fiscal_year: '2026年4月1日〜2027年3月31日',
};

// 顧客データ（5社）
const CUSTOMERS = [
  { id: 1, name: '株式会社フジタ', kana: 'カ）フジタ', contact: '藤田 一郎', email: 'info@fujita.co.jp', payment_terms: '月末締め翌月末払い' },
  { id: 2, name: '合同会社タナカ工務店', kana: 'ド）タナカコウムテン', contact: '田中 次郎', email: 'info@tanaka.co.jp', payment_terms: '月末締め翌月末払い' },
  { id: 3, name: '株式会社ノース', kana: 'カ）ノース', contact: '北野 三郎', email: 'billing@north.co.jp', payment_terms: '月末締め翌月末払い' },
  { id: 4, name: '株式会社ミライ工房', kana: 'カ）ミライコウボウ', contact: '未来 四郎', email: 'info@mirai.co.jp', payment_terms: '月末締め翌月末払い' },
  { id: 5, name: '個人・佐藤様', kana: 'サトウ', contact: '佐藤 五郎', email: 'sato@example.com', payment_terms: '月末締め翌月末払い' },
];

// 請求書データ（10件）
const INVOICES = [
  { id: 1,  number: '2026-031', customer: '株式会社フジタ',       date: '2026-03-31', due: '2026-04-30', items: [{ name: 'Webサイト制作費', qty: 1, unit_price: 850000, tax_rate: 10 }], amount: 935000,  tax: 85000,  subtotal: 850000, status: 'pending' },
  { id: 2,  number: '2026-030', customer: '合同会社タナカ工務店', date: '2026-03-28', due: '2026-03-28', items: [{ name: 'ロゴデザイン', qty: 1, unit_price: 200000, tax_rate: 10 }], amount: 220000,  tax: 20000,  subtotal: 200000, status: 'overdue' },
  { id: 3,  number: '2026-029', customer: '株式会社ノース',       date: '2026-03-25', due: '2026-04-30', items: [{ name: 'パンフレットデザイン', qty: 1, unit_price: 300000, tax_rate: 10 }], amount: 330000,  tax: 30000,  subtotal: 300000, status: 'issued' },
  { id: 4,  number: '2026-025', customer: '株式会社ミライ工房',   date: '2026-03-01', due: '2026-03-31', items: [{ name: 'ECサイト構築', qty: 1, unit_price: 500000, tax_rate: 10 }], amount: 550000,  tax: 50000,  subtotal: 500000, status: 'paid' },
  { id: 5,  number: '2026-020', customer: '個人・佐藤様',         date: '2026-02-28', due: '2026-03-31', items: [{ name: '名刺デザイン', qty: 1, unit_price: 50000, tax_rate: 10 }], amount: 55000,   tax: 5000,   subtotal: 50000,  status: 'paid' },
  { id: 6,  number: '2026-018', customer: '株式会社フジタ',       date: '2026-02-20', due: '2026-03-31', items: [{ name: 'バナー制作', qty: 5, unit_price: 30000, tax_rate: 10 }], amount: 165000,  tax: 15000,  subtotal: 150000, status: 'paid' },
  { id: 7,  number: '2026-015', customer: '株式会社ノース',       date: '2026-02-15', due: '2026-03-15', items: [{ name: 'SNS運用コンサル', qty: 1, unit_price: 200000, tax_rate: 10 }], amount: 220000,  tax: 20000,  subtotal: 200000, status: 'paid' },
  { id: 8,  number: '2026-012', customer: '合同会社タナカ工務店', date: '2026-02-10', due: '2026-03-10', items: [{ name: '現場写真撮影', qty: 1, unit_price: 80000, tax_rate: 10 }], amount: 88000,   tax: 8000,   subtotal: 80000,  status: 'paid' },
  { id: 9,  number: '2026-008', customer: '株式会社ミライ工房',   date: '2026-01-31', due: '2026-02-28', items: [{ name: 'UI/UXデザイン', qty: 1, unit_price: 350000, tax_rate: 10 }], amount: 385000,  tax: 35000,  subtotal: 350000, status: 'paid' },
  { id: 10, number: '2026-005', customer: '個人・佐藤様',         date: '2026-01-15', due: '2026-02-15', items: [{ name: 'チラシデザイン', qty: 1, unit_price: 40000, tax_rate: 10 }], amount: 44000,   tax: 4000,   subtotal: 40000,  status: 'paid' },
];

// 仕訳データ（20件）
const JOURNALS = [
  { id: 1,  date: '2026-03-31', debit: '売掛金',     debit_amount: 935000,  credit: '売上高',       credit_amount: 850000,  description: '株式会社フジタ 請求書No.2026-031', source: 'invoice' },
  { id: 2,  date: '2026-03-31', debit: '売掛金',     debit_amount: 935000,  credit: '仮受消費税',   credit_amount: 85000,   description: '株式会社フジタ 消費税', source: 'invoice' },
  { id: 3,  date: '2026-03-28', debit: '売掛金',     debit_amount: 220000,  credit: '売上高',       credit_amount: 200000,  description: '合同会社タナカ工務店 請求書No.2026-030', source: 'invoice' },
  { id: 4,  date: '2026-03-28', debit: '売掛金',     debit_amount: 220000,  credit: '仮受消費税',   credit_amount: 20000,   description: '合同会社タナカ工務店 消費税', source: 'invoice' },
  { id: 5,  date: '2026-03-25', debit: '売掛金',     debit_amount: 330000,  credit: '売上高',       credit_amount: 300000,  description: '株式会社ノース 請求書No.2026-029', source: 'invoice' },
  { id: 6,  date: '2026-03-25', debit: '売掛金',     debit_amount: 330000,  credit: '仮受消費税',   credit_amount: 30000,   description: '株式会社ノース 消費税', source: 'invoice' },
  { id: 7,  date: '2026-03-24', debit: '旅費交通費', debit_amount: 11880,   credit: '未払金',       credit_amount: 11880,   description: '東京→名古屋 新幹線', source: 'receipt' },
  { id: 8,  date: '2026-03-20', debit: '外注費',     debit_amount: 110000,  credit: '未払金',       credit_amount: 110000,  description: 'フリーランスデザイナー 作業費', source: 'manual' },
  { id: 9,  date: '2026-03-18', debit: '消耗品費',   debit_amount: 5480,    credit: '未払金',       credit_amount: 5480,    description: 'Amazon 事務用品', source: 'receipt' },
  { id: 10, date: '2026-03-15', debit: '普通預金',   debit_amount: 220000,  credit: '売掛金',       credit_amount: 220000,  description: '株式会社ノース 入金', source: 'bank' },
  { id: 11, date: '2026-03-10', debit: '普通預金',   debit_amount: 88000,   credit: '売掛金',       credit_amount: 88000,   description: '合同会社タナカ工務店 入金', source: 'bank' },
  { id: 12, date: '2026-03-05', debit: '通信費',     debit_amount: 8800,    credit: '普通預金',     credit_amount: 8800,    description: 'さくらインターネット サーバー費', source: 'bank' },
  { id: 13, date: '2026-03-01', debit: '売掛金',     debit_amount: 550000,  credit: '売上高',       credit_amount: 500000,  description: '株式会社ミライ工房 請求書No.2026-025', source: 'invoice' },
  { id: 14, date: '2026-03-01', debit: '売掛金',     debit_amount: 550000,  credit: '仮受消費税',   credit_amount: 50000,   description: '株式会社ミライ工房 消費税', source: 'invoice' },
  { id: 15, date: '2026-02-28', debit: '普通預金',   debit_amount: 385000,  credit: '売掛金',       credit_amount: 385000,  description: '株式会社ミライ工房 入金', source: 'bank' },
  { id: 16, date: '2026-02-28', debit: '売掛金',     debit_amount: 55000,   credit: '売上高',       credit_amount: 50000,   description: '個人・佐藤様 請求書No.2026-020', source: 'invoice' },
  { id: 17, date: '2026-02-28', debit: '売掛金',     debit_amount: 55000,   credit: '仮受消費税',   credit_amount: 5000,    description: '個人・佐藤様 消費税', source: 'invoice' },
  { id: 18, date: '2026-02-25', debit: '地代家賃',   debit_amount: 150000,  credit: '普通預金',     credit_amount: 150000,  description: 'オフィス賃料 3月分', source: 'bank' },
  { id: 19, date: '2026-02-20', debit: '広告宣伝費', debit_amount: 55000,   credit: '普通預金',     credit_amount: 55000,   description: 'Google広告 2月分', source: 'bank' },
  { id: 20, date: '2026-02-15', debit: '普通預金',   debit_amount: 44000,   credit: '売掛金',       credit_amount: 44000,   description: '個人・佐藤様 入金', source: 'bank' },
];

// 銀行取引データ（CSVインポート後のデータ）
const BANK_TRANSACTIONS = [
  { id: 1,  date: '2026-03-31', description: 'カ）フジタ',         amount: 935000,  type: 'deposit',    matched: false, invoice: null },
  { id: 2,  date: '2026-03-28', description: 'カ）ミライコウボウ', amount: 550000,  type: 'deposit',    matched: true,  invoice: '2026-025' },
  { id: 3,  date: '2026-03-25', description: 'サトウ',             amount: 55000,   type: 'deposit',    matched: true,  invoice: '2026-020' },
  { id: 4,  date: '2026-03-20', description: 'カ）フジタ',         amount: 165000,  type: 'deposit',    matched: true,  invoice: '2026-018' },
  { id: 5,  date: '2026-03-15', description: 'カ）ノース',         amount: 220000,  type: 'deposit',    matched: true,  invoice: '2026-015' },
  { id: 6,  date: '2026-03-10', description: 'ド）タナカコウムテン', amount: 88000,  type: 'deposit',    matched: true,  invoice: '2026-012' },
  { id: 7,  date: '2026-03-05', description: 'サクラインターネット', amount: -8800,  type: 'withdrawal', matched: true,  invoice: null },
  { id: 8,  date: '2026-02-28', description: 'カ）ミライコウボウ', amount: 385000,  type: 'deposit',    matched: true,  invoice: '2026-008' },
  { id: 9,  date: '2026-02-25', description: 'オフィスチンリョウ', amount: -150000, type: 'withdrawal', matched: true,  invoice: null },
  { id: 10, date: '2026-02-20', description: 'グーグル',           amount: -55000,  type: 'withdrawal', matched: true,  invoice: null },
];

// 売掛データ（取引先別集計）
const RECEIVABLES = [
  { customer: '株式会社フジタ',       invoiced: 1100000, paid: 165000,  balance: 935000,  last_invoice: '2026-03-31', status: 'pending' },
  { customer: '合同会社タナカ工務店', invoiced: 308000,  paid: 88000,   balance: 220000,  last_invoice: '2026-03-28', status: 'overdue' },
  { customer: '株式会社ノース',       invoiced: 550000,  paid: 220000,  balance: 330000,  last_invoice: '2026-03-25', status: 'pending' },
  { customer: '株式会社ミライ工房',   invoiced: 935000,  paid: 935000,  balance: 0,       last_invoice: '2026-03-01', status: 'paid' },
  { customer: '個人・佐藤様',         invoiced: 99000,   paid: 99000,   balance: 0,       last_invoice: '2026-02-28', status: 'paid' },
];

// 勘定科目マスタ
const ACCOUNTS = [
  { code: '101', name: '現金',         category: '資産', type: 'debit' },
  { code: '102', name: '普通預金',     category: '資産', type: 'debit' },
  { code: '110', name: '売掛金',       category: '資産', type: 'debit' },
  { code: '200', name: '買掛金',       category: '負債', type: 'credit' },
  { code: '210', name: '未払金',       category: '負債', type: 'credit' },
  { code: '220', name: '仮受消費税',   category: '負債', type: 'credit' },
  { code: '300', name: '資本金',       category: '純資産', type: 'credit' },
  { code: '400', name: '売上高',       category: '収益', type: 'credit' },
  { code: '500', name: '外注費',       category: '費用', type: 'debit' },
  { code: '510', name: '旅費交通費',   category: '費用', type: 'debit' },
  { code: '520', name: '通信費',       category: '費用', type: 'debit' },
  { code: '530', name: '消耗品費',     category: '費用', type: 'debit' },
  { code: '540', name: '地代家賃',     category: '費用', type: 'debit' },
  { code: '550', name: '広告宣伝費',   category: '費用', type: 'debit' },
];

// 残高試算表データ
const TRIAL_BALANCE = [
  { account: '普通預金',     debit: 2450000, credit: 0 },
  { account: '売掛金',       debit: 1485000, credit: 0 },
  { account: '買掛金',       debit: 0,       credit: 0 },
  { account: '未払金',       debit: 0,       credit: 127360 },
  { account: '仮受消費税',   debit: 0,       credit: 190000 },
  { account: '資本金',       debit: 0,       credit: 1000000 },
  { account: '売上高',       debit: 0,       credit: 4230000 },
  { account: '外注費',       debit: 110000,  credit: 0 },
  { account: '旅費交通費',   debit: 148000,  credit: 0 },
  { account: '通信費',       debit: 105600,  credit: 0 },
  { account: '消耗品費',     debit: 32760,   credit: 0 },
  { account: '地代家賃',     debit: 900000,  credit: 0 },
  { account: '広告宣伝費',   debit: 316000,  credit: 0 },
];

// 貸借対照表データ
const BALANCE_SHEET = {
  assets: {
    current: [
      { name: '現金',     amount: 50000 },
      { name: '普通預金', amount: 2450000 },
      { name: '売掛金',   amount: 1485000 },
    ],
    fixed: [],
    total: 3985000,
  },
  liabilities: {
    current: [
      { name: '未払金',     amount: 127360 },
      { name: '仮受消費税', amount: 190000 },
    ],
    total: 317360,
  },
  equity: {
    items: [
      { name: '資本金',     amount: 1000000 },
      { name: '当期純利益', amount: 2667640 },
    ],
    total: 3667640,
  },
};

// 損益計算書データ
const PROFIT_LOSS = {
  monthly: {
    revenue: 1850000,
    cost_of_sales: 110000,
    gross_profit: 1740000,
    sga: {
      items: [
        { name: '旅費交通費', amount: 11880 },
        { name: '通信費',     amount: 8800 },
        { name: '消耗品費',   amount: 5480 },
        { name: '地代家賃',   amount: 150000 },
        { name: '広告宣伝費', amount: 55000 },
      ],
      total: 231160,
    },
    operating_income: 1508840,
  },
  cumulative: {
    revenue: 4230000,
    cost_of_sales: 380000,
    gross_profit: 3850000,
    sga: {
      items: [
        { name: '旅費交通費', amount: 148000 },
        { name: '通信費',     amount: 105600 },
        { name: '消耗品費',   amount: 32760 },
        { name: '地代家賃',   amount: 900000 },
        { name: '広告宣伝費', amount: 316000 },
      ],
      total: 1502360,
    },
    operating_income: 2347640,
  },
};

// 総勘定元帳データ（勘定科目別）
const LEDGER_DATA = {
  '売上高': [
    { date: '2026-01-15', description: '個人・佐藤様 チラシデザイン',       debit: 0,      credit: 40000,  balance: 40000 },
    { date: '2026-01-31', description: '株式会社ミライ工房 UI/UXデザイン', debit: 0,      credit: 350000, balance: 390000 },
    { date: '2026-02-10', description: '合同会社タナカ工務店 現場写真撮影', debit: 0,      credit: 80000,  balance: 470000 },
    { date: '2026-02-15', description: '株式会社ノース SNS運用コンサル',   debit: 0,      credit: 200000, balance: 670000 },
    { date: '2026-02-20', description: '株式会社フジタ バナー制作',         debit: 0,      credit: 150000, balance: 820000 },
    { date: '2026-02-28', description: '個人・佐藤様 名刺デザイン',         debit: 0,      credit: 50000,  balance: 870000 },
    { date: '2026-03-01', description: '株式会社ミライ工房 ECサイト構築',   debit: 0,      credit: 500000, balance: 1370000 },
    { date: '2026-03-25', description: '株式会社ノース パンフレットデザイン', debit: 0,    credit: 300000, balance: 1670000 },
    { date: '2026-03-28', description: '合同会社タナカ工務店 ロゴデザイン', debit: 0,      credit: 200000, balance: 1870000 },
    { date: '2026-03-31', description: '株式会社フジタ Webサイト制作費',   debit: 0,      credit: 850000, balance: 2720000 },
  ],
  '売掛金': [
    { date: '2026-01-15', description: '個人・佐藤様 請求',         debit: 44000,   credit: 0,      balance: 44000 },
    { date: '2026-01-31', description: '株式会社ミライ工房 請求',   debit: 385000,  credit: 0,      balance: 429000 },
    { date: '2026-02-15', description: '個人・佐藤様 入金',         debit: 0,       credit: 44000,  balance: 385000 },
    { date: '2026-02-28', description: '株式会社ミライ工房 入金',   debit: 0,       credit: 385000, balance: 0 },
    { date: '2026-03-10', description: '合同会社タナカ工務店 入金', debit: 0,       credit: 88000,  balance: -88000 },
    { date: '2026-03-15', description: '株式会社ノース 入金',       debit: 0,       credit: 220000, balance: -308000 },
    { date: '2026-03-25', description: '株式会社ノース 請求',       debit: 330000,  credit: 0,      balance: 22000 },
    { date: '2026-03-28', description: '合同会社タナカ工務店 請求', debit: 220000,  credit: 0,      balance: 242000 },
    { date: '2026-03-31', description: '株式会社フジタ 請求',       debit: 935000,  credit: 0,      balance: 1177000 },
  ],
  '普通預金': [
    { date: '2026-02-15', description: '個人・佐藤様 入金',             debit: 44000,   credit: 0,       balance: 1044000 },
    { date: '2026-02-20', description: 'Google広告 2月分',             debit: 0,       credit: 55000,   balance: 989000 },
    { date: '2026-02-25', description: 'オフィス賃料 3月分',           debit: 0,       credit: 150000,  balance: 839000 },
    { date: '2026-02-28', description: '株式会社ミライ工房 入金',       debit: 385000,  credit: 0,       balance: 1224000 },
    { date: '2026-03-05', description: 'さくらインターネット サーバー', debit: 0,       credit: 8800,    balance: 1215200 },
    { date: '2026-03-10', description: '合同会社タナカ工務店 入金',     debit: 88000,   credit: 0,       balance: 1303200 },
    { date: '2026-03-15', description: '株式会社ノース 入金',           debit: 220000,  credit: 0,       balance: 1523200 },
    { date: '2026-03-28', description: '株式会社ミライ工房 入金',       debit: 550000,  credit: 0,       balance: 2073200 },
    { date: '2026-03-31', description: '個人・佐藤様 入金',             debit: 55000,   credit: 0,       balance: 2128200 },
  ],
  '旅費交通費': [
    { date: '2026-01-20', description: '東京→大阪 新幹線',       debit: 14000,  credit: 0, balance: 14000 },
    { date: '2026-02-05', description: 'タクシー 渋谷→新宿',     debit: 3200,   credit: 0, balance: 17200 },
    { date: '2026-02-18', description: '東京→横浜 電車',         debit: 1100,   credit: 0, balance: 18300 },
    { date: '2026-03-24', description: '東京→名古屋 新幹線',     debit: 11880,  credit: 0, balance: 30180 },
  ],
};

// チャット会話データ
const CHAT_MESSAGES = [
  {
    type: 'ai',
    name: 'AI経理社員',
    content: 'おはようございます。今日もサポートします。\n何かお手伝いできることはありますか？',
  },
  {
    type: 'user',
    name: 'あなた',
    content: '株式会社フジタへの請求書を作って。\nWebサイト制作費85万円、税率10%で。',
  },
  {
    type: 'ai',
    name: 'AI経理社員',
    content: '承りました。適格請求書を作成します。\n\n・発行日：2026年3月31日\n・登録番号：T1234567890123（自動挿入）\n・税率10%・消費税85,000円（自動計算）\n・合計金額：935,000円\n\nこのまま発行してよろしいですか？',
  },
  {
    type: 'user',
    name: 'あなた',
    content: 'OK、発行して。',
  },
  {
    type: 'system',
    name: 'AI経理社員',
    content: '✓ 適格請求書を発行・保存しました。\n  売掛台帳に自動登録済み。',
  },
];
