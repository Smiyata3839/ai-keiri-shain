以下の変更をしてください。

1. 全ページのサイドバーにあるアイコンの初期設定をロゴ画像に変更
   - <img src="/logo.png" style={{width:"32px", height:"32px", borderRadius:"8px", objectFit:"contain"}} alt="KANBEI" />
   - 対象ファイル：src/app/dashboard/page.tsx、src/app/chat/page.tsx、src/app/invoices/new/page.tsx、src/app/invoices/page.tsx、src/app/invoices/[id]/page.tsx、src/app/company/page.tsx、src/app/customers/page.tsx

2. ログイン画面のロゴ絵文字を画像に変更
   - src/app/login/page.tsx の💼絵文字部分を同じimg タグに変更
   - サイズ：width:"64px", height:"64px"

3. src/app/layout.tsxのfaviconをfavicon.pngに変更
   - <link rel="icon" href="/favicon.png" type="image/png" /> をmetadataに追加
   - もしくはNext.jsのApp RouterではsrcフォルダにあるためそのまM自動認識されるので変更不要