# 自社情報 決算月追加仕様

## 対象ファイル
src/app/company/page.tsx

## DBカラム
companiesテーブルに fiscal_month（integer, DEFAULT 3）追加済み

## 変更内容
「振込先口座」セクションの上に「会計設定」セクションを追加する。

## 追加フィールド
ラベル：決算月
DBカラム：fiscal_month
型：select（ドロップダウン）
選択肢：1月〜12月（1〜12の数値）
デフォルト：3（3月）
表示：「3月」のように「月」を付けて表示

## 実装仕様
1. stateに追加：
   const [formFiscalMonth, setFormFiscalMonth] = useState<number>(3);

2. 既存データ取得時にfiscal_monthも取得してstateにセット

3. フォームに追加（基本情報セクションの下、振込先口座の上）：
   セクションタイトル：会計設定
   フィールド：決算月（1〜12のselect）
   編集モード時のみ変更可能

4. 保存時にfiscal_monthも含めてupsert

5. スタイルは既存のAppleライクなデザインに統一