-- 監視モードカラムを追加（既存テーブルに影響なし）
ALTER TABLE websites ADD COLUMN IF NOT EXISTS monitor_mode VARCHAR(20) DEFAULT 'full';

-- monitor_mode の値:
-- 'full' = 従来の全HTML監視（デフォルト）
-- 'content' = コンテンツのみ監視（広告除外）

-- 既存データは自動的に 'full' になる（既存機能維持）