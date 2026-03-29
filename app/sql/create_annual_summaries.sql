-- annual_summaries: 年次要約（4層アーキテクチャ 第2層）
-- 期ごとに1レコード。決算期の対応記録と年間実績を永続保持

CREATE TABLE annual_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  financial_summary TEXT,
  chat_insights TEXT,
  key_decisions TEXT,
  owner_type_evaluation TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, fiscal_year)
);

ALTER TABLE annual_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own annual summaries"
  ON annual_summaries FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
