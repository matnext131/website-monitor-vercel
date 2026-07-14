-- ============================================================
-- 既存DB向けマイグレーション（Neon の SQL Editor で実行）
-- 何回実行してもエラーにならない冪等SQLです。
-- 新規にDBを作る場合はこのファイルではなく database.sql を実行してください。
-- ============================================================

-- monitor_mode カラムの追加（存在する場合は何もしない）
ALTER TABLE websites
  ADD COLUMN IF NOT EXISTS monitor_mode VARCHAR(10) NOT NULL DEFAULT 'full';

-- monitor_mode の CHECK 制約の追加
-- ADD CONSTRAINT は IF NOT EXISTS が使えないため、pg_constraint を確認してから追加する
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'websites_monitor_mode_check'
      AND conrelid = 'websites'::regclass
  ) THEN
    ALTER TABLE websites
      ADD CONSTRAINT websites_monitor_mode_check
      CHECK (monitor_mode IN ('full', 'content'));
  END IF;
END $$;

-- インデックス（database.sql を実行済みなら存在するが、念のため冪等に作成）
CREATE INDEX IF NOT EXISTS idx_websites_status ON websites(status);
CREATE INDEX IF NOT EXISTS idx_websites_is_active ON websites(is_active);
CREATE INDEX IF NOT EXISTS idx_websites_updated_at ON websites(updated_at DESC);
