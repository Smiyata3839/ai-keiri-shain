-- company_profiles: 会社ごとのAI学習プロファイル（永続層）
-- 4層アーキテクチャの第1層: 業種、勘定科目の癖、特殊ルールなど

CREATE TABLE company_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  industry TEXT,                    -- 業種・事業内容
  accounting_characteristics TEXT,  -- 勘定科目の使い方の特徴
  special_rules TEXT,               -- 特殊な仕訳パターン・ルール
  tax_notes TEXT,                   -- 消費税の扱い・注意点
  other_notes TEXT,                 -- その他特記事項
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company profile"
  ON company_profiles FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
