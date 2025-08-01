import { Pool } from 'pg'

// データベース接続プールを作成
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

export interface Website {
  id: number
  name: string
  url: string
  last_checked: Date | null
  last_modified: Date | null
  content_hash: string | null
  status: 'pending' | 'updated' | 'unchanged' | 'error'
  is_active: boolean
  error_message: string | null
  monitor_mode: 'full' | 'content'
  created_at: Date
  updated_at: Date
}

export interface WebsiteCreate {
  name: string
  url: string
  monitor_mode?: 'full' | 'content'
}

// ウェブサイト一覧を取得
export async function getWebsites(): Promise<Website[]> {
  console.log('DB: Starting getWebsites query')
  console.log('DB: DATABASE_URL configured:', !!process.env.DATABASE_URL)
  
  try {
    const result = await pool.query(
      'SELECT * FROM websites ORDER BY updated_at DESC'
    )
    console.log('DB: Query successful, rows:', result.rows.length)
    return result.rows
  } catch (error) {
    console.error('DB: Query failed:', error)
    throw error
  }
}

// ウェブサイトを追加
export async function createWebsite({ name, url, monitor_mode = 'full' }: WebsiteCreate): Promise<Website> {
  const result = await pool.query(
    `INSERT INTO websites (name, url, monitor_mode) 
     VALUES ($1, $2, $3) 
     RETURNING *`,
    [name, url, monitor_mode]
  )
  return result.rows[0]
}

// ウェブサイトを削除
export async function deleteWebsite(id: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM websites WHERE id = $1',
    [id]
  )
  return result.rowCount > 0
}

// ウェブサイトのステータスを更新
export async function updateWebsiteStatus(
  id: number,
  status: Website['status'],
  contentHash?: string,
  errorMessage?: string
): Promise<Website | null> {
  const result = await pool.query(
    `UPDATE websites 
     SET status = $1, 
         last_checked = NOW(),
         content_hash = COALESCE($2, content_hash),
         error_message = $3,
         updated_at = NOW()
     WHERE id = $4 
     RETURNING *`,
    [status, contentHash, errorMessage, id]
  )
  return result.rows[0] || null
}

// アクティブなウェブサイト一覧を取得（定期監視用）
export async function getActiveWebsites(): Promise<Website[]> {
  const result = await pool.query(
    'SELECT * FROM websites WHERE is_active = true ORDER BY last_checked ASC NULLS FIRST'
  )
  return result.rows
}

// 単一のウェブサイトを取得
export async function getWebsite(id: number): Promise<Website | null> {
  const result = await pool.query(
    'SELECT * FROM websites WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}