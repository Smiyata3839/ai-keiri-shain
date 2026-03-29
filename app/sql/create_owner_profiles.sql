-- owner_profiles: 経営者タイプ診断結果（AIが財務データから自動判定）

CREATE TABLE owner_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  owner_type TEXT,                  -- 経営者タイプ（例: 成長投資型、安定堅実型）
  diagnosis_summary TEXT,           -- 診断結果の要約
  strengths TEXT,                   -- 経営の強み
  risk_points TEXT,                 -- 注意すべきリスク
  communication_style TEXT,         -- 推奨コミュニケーションスタイル
  diagnosed_at TIMESTAMPTZ,         -- 最終診断日時
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE owner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own owner profile"
  ON owner_profiles FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
