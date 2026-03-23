# 総勘定元帳 サイドバー追加仕様

## 対応1：全ページのサイドバーに総勘定元帳を追加

会計セクションの「仕訳一覧」の下、「残高試算表」の上に以下を追加：
リンク先：/general-ledger
ラベル：総勘定元帳
アイコン：📒

対象ファイル：
- src/app/invoices/page.tsx
- src/app/invoices/[id]/page.tsx
- src/app/invoices/new/page.tsx
- src/app/receivables/page.tsx
- src/app/bank/page.tsx
- src/app/journals/page.tsx
- src/app/trial-balance/page.tsx
- src/app/balance-sheet/page.tsx
- src/app/profit-loss/page.tsx
- src/app/customers/page.tsx
- src/app/company/page.tsx
- src/app/chat/page.tsx
- src/app/dashboard/page.tsx
- src/app/receipts/page.tsx

## 対応2：general-ledger/page.tsx にサイドバーを追加

src/app/invoices/page.tsx と同じサイドバー（幅240px、position: fixed、#1c1c1e）を
src/app/general-ledger/page.tsx に追加する。
メインコンテンツ側は marginLeft: 240px にする。
サイドバーの会計セクションには総勘定元帳も含めること。