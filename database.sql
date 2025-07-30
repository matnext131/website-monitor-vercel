-- Website Monitor データベーステーブル

CREATE TABLE websites (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL UNIQUE,
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  content_hash VARCHAR(64) DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'updated', 'unchanged', 'error')),
  is_active BOOLEAN DEFAULT true,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX idx_websites_status ON websites(status);
CREATE INDEX idx_websites_is_active ON websites(is_active);
CREATE INDEX idx_websites_updated_at ON websites(updated_at DESC);