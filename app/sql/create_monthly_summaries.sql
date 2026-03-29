-- monthly_summaries: 月次要約（4層アーキテクチャ 第3層）
-- 過去3ヶ月分をローリング保持。古いものは詳細度を落として圧縮

CREATE TABLE monthly_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  detail_level TEXT NOT NULL DEFAULT 'full' CHECK (detail_level IN ('full', 'condensed', 'minimal')),
  financial_summary TEXT,
  chat_insights TEXT,
  action_items TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, year_month)
);

ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own monthly summaries"
  ON monthly_summaries FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
