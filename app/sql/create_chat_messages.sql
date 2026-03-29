-- chat_sessions: 会話スレッド管理テーブル
-- chat_messages: チャット履歴永続化テーブル

CREATE TABLE chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at ASC);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
