# AI経理社員

経理業務をAIがまるごとサポートするクラウド会計サービスのUIデモです。

## 機能一覧

- **チャット**: AI経理社員との会話で請求書発行・経費登録・売掛確認を実行
- **請求書発行**: 適格請求書（インボイス）の作成・プレビュー・一覧管理
- **売掛管理**: 取引先別の売掛残高・回収状況の一覧表示
- **銀行明細取込**: CSVインポートによる自動消込
- **仕訳・元帳**: 仕訳一覧・総勘定元帳の閲覧
- **財務諸表**: 残高試算表・貸借対照表（B/S）・損益計算書（P/L）
- **領収書アップロード**: スマホ撮影によるAI自動認識・経費計上
- **顧客管理**: 取引先情報の登録・管理

## 技術スタック

- HTML / CSS / JavaScript（フレームワーク不使用）
- Google Fonts（Noto Sans JP）
- レスポンシブデザイン対応

## GitHub Pages公開手順

1. GitHubで新規リポジトリを作成（パブリック）
2. 全ファイルをpush
3. Settings → Pages → Source を「main branch」に設定
4. `https://[ユーザー名].github.io/ai-keiri-shain/` でアクセス可能

## ディレクトリ構成

```
ai-keiri-shain/
├── index.html              # ログイン画面
├── setup.html              # 自社情報設定
├── chat.html               # チャット画面
├── invoice-new.html        # 請求書 新規作成
├── invoice-list.html       # 請求書一覧
├── invoice-preview.html    # 請求書プレビュー
├── receivable.html         # 売掛管理
├── bank-import.html        # 銀行明細CSVインポート
├── bank-summary.html       # 自動消込サマリー
├── journal.html            # 仕訳一覧
├── ledger.html             # 総勘定元帳
├── trial-balance.html      # 残高試算表
├── balance-sheet.html      # 貸借対照表（B/S）
├── profit-loss.html        # 損益計算書（P/L）
├── receipt-upload.html     # 領収書アップロード
├── customers.html          # 顧客管理
├── css/
│   └── style.css
├── js/
│   ├── common.js
│   └── mock-data.js
└── README.md
```
