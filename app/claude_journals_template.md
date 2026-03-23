# 仕訳手動入力 テンプレート方式に変更仕様

## 対象ファイル
src/app/journals/page.tsx

## 概要
「＋ 仕訳を追加」ボタンを押した時のフォームを
テンプレート選択方式に変更する。

## テンプレート定義
```typescript
const JOURNAL_TEMPLATES = [
  {
    label: "減価償却費",
    debit: "減価償却費",
    credit: "備品",
    descPlaceholder: "備品の減価償却",
  },
  {
    label: "借入金返済",
    debit: "借入金",
    credit: "普通預金",
    descPlaceholder: "借入金返済",
  },
  {
    label: "資本金登録",
    debit: "普通預金",
    credit: "資本金",
    descPlaceholder: "資本金の払込",
  },
  {
    label: "現金経費支払い",
    debit: "", // 科目選択が必要
    credit: "現金",
    descPlaceholder: "現金で支払った経費",
  },
  {
    label: "その他（自由入力）",
    debit: "",
    credit: "",
    descPlaceholder: "取引の説明",
  },
];
```

## UIフロー

### Step 1：テンプレート選択
フォームを開いたらまずテンプレートを選択させる。
テンプレートをカード形式またはボタン形式で表示。
選択後にStep 2へ。

### Step 2：詳細入力
選択したテンプレートに応じて入力欄を表示。

- 日付（必須）
- 借方勘定科目（テンプレートで固定の場合はreadonly表示、空の場合はselect）
- 貸方勘定科目（テンプレートで固定の場合はreadonly表示、空の場合はselect）
- 金額（必須）
- 摘要（placeholderはテンプレートのdescPlaceholder）

「現金経費支払い」の場合は借方科目のみselect表示（費用科目のみ）
「その他（自由入力）」の場合は借方・貸方両方select表示

### Step 3：確認・保存
既存のhandleAdd()関数でINSERT

## テンプレート選択UIのスタイル
- カード形式でテンプレートを並べる
- 選択中：border 2px solid #0071e3, backgroundColor #e8f1fb
- 未選択：border 1px solid #d2d2d7, backgroundColor #fff
- borderRadius: 12px, padding: 14px 16px
- fontSize: 14, fontWeight: 500

## 戻るボタン
Step 2にいる時に「← テンプレートを変更」ボタンを表示
クリックでStep 1に戻る