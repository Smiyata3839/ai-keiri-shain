# 自社情報 銀行名ドロップダウン修正仕様

## 対象ファイル
src/app/company/page.tsx

## 変更内容
「銀行名」フィールドを手入力テキストボックスからドロップダウン選択に変更する。

## 銀行リスト

const bankOptions = [
  "みずほ銀行", "三菱UFJ銀行", "三井住友銀行", "りそな銀行",
  "埼玉りそな銀行", "ゆうちょ銀行", "楽天銀行", "住信SBIネット銀行",
  "PayPay銀行", "auじぶん銀行", "イオン銀行", "セブン銀行",
  "横浜銀行", "千葉銀行", "静岡銀行", "福岡銀行",
  "八十二銀行", "阿波銀行", "百十四銀行", "その他",
];

## 実装仕様

1. bank_name の <input type="text"> を <select> に変更
2. 選択肢は bankOptions を map() で生成
3. 「その他」を選択した場合のみ、直下にテキスト入力欄を追加表示
4. 編集モード時のみ変更可能（表示モードは従来通りテキスト表示）
5. スタイルは既存inputと同じAppleライクなデザインに統一

## selectのスタイル例
style={{
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #d2d2d7",
  fontSize: 15,
  color: "#1d1d1f",
  backgroundColor: "#fff",
  appearance: "auto",
}}