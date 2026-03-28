-- chat_feedback: ユーザーフィードバック学習テーブル
-- 使うほどAIが賢くなる仕組みの基盤

CREATE TABLE chat_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  topic TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('good', 'bad')),
  correction TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_feedback_company_topic ON chat_feedback(company_id, topic);
CREATE INDEX idx_chat_feedback_company_created ON chat_feedback(company_id, created_at DESC);

ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;
