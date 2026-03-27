サイドバーにベル通知機能を実装してください。

## Supabaseテーブル作成
以下のSQLをSupabaseで実行してください：
create table notifications (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  body text not null,
  created_at timestamptz default now(),
  is_active boolean default true
);

alter table notifications enable row level security;
create policy "全ユーザーが読める" on notifications
  for select using (true);

## 実装内容

### Sidebar.tsx
- ベルアイコン（lucide-reactのBell）をサイドバー上部に追加
- 未読通知がある場合、ベルアイコンに赤丸バッジを表示
- クリックで通知パネルをトグル表示

### 通知パネル
- サイドバーの右側にオーバーレイで表示
- 通知一覧（タイトル・本文・日時）を表示
- 各通知をクリックで既読にする（ローカルstateで管理）
- 既読にすると赤丸バッジが消える
- is_active=trueの通知のみ表示

## データ取得
- notificationsテーブルからis_active=trueの通知を取得
- supabaseクライアント（anon）を使用

## デザイン
- 既存のダークネイビー×シアンテーマに合わせる
- 通知パネルの幅は320px程度
- 未読バッジは赤丸（赤背景・白数字）

実装後にnpm run buildでビルドチェックを実行してください。


