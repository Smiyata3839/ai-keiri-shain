-- チャット系テーブルのRLSポリシー追加
-- 実行日: 2026-04-12
-- 目的: RLS有効だがポリシー未設定のテーブルに多テナント分離ポリシーを追加

-- ==========================================
-- chat_sessions: ユーザー自身のセッションのみアクセス可
-- ==========================================
CREATE POLICY "Users can manage own chat sessions"
  ON chat_sessions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ==========================================
-- chat_messages: 自分のセッションに紐づくメッセージのみアクセス可
-- ==========================================
CREATE POLICY "Users can manage own chat messages"
  ON chat_messages FOR ALL
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- ==========================================
-- chat_feedback: 自分の会社のフィードバックのみアクセス可
-- ==========================================
CREATE POLICY "Users can manage own company feedback"
  ON chat_feedback FOR ALL
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );
