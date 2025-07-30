import { NextApiRequest, NextApiResponse } from 'next'
import { getActiveWebsites, updateWebsiteStatus } from '../lib/db'
import crypto from 'crypto'

// ウェブサイトのコンテンツをチェックする関数
async function checkWebsiteContent(url: string): Promise<{
  contentHash?: string
  status: 'updated' | 'unchanged' | 'error'
  errorMessage?: string
}> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Website Monitor Bot 1.0'
      },
      signal: AbortSignal.timeout(25000) // 25秒タイムアウト（Vercel制限考慮）
    })

    if (!response.ok) {
      return {
        status: 'error',
        errorMessage: `HTTP ${response.status}: ${response.statusText}`
      }
    }

    const content = await response.text()
    const contentHash = crypto.createHash('sha256').update(content).digest('hex')

    return {
      contentHash,
      status: 'unchanged' // 後で前回のハッシュと比較して決定
    }

  } catch (error: any) {
    let errorMessage = 'Unknown error'
    
    if (error.name === 'AbortError') {
      errorMessage = 'タイムアウトエラー'
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'ドメインが見つかりません'
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = '接続が拒否されました'
    } else {
      errorMessage = error.message || 'ネットワークエラー'
    }

    return {
      status: 'error',
      errorMessage
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vercel Cronからの認証チェック
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🚀 Starting scheduled website monitoring...')
    
    const websites = await getActiveWebsites()
    console.log(`📊 Found ${websites.length} active websites to check`)

    if (websites.length === 0) {
      return res.status(200).json({
        message: 'No active websites to check',
        processed: 0
      })
    }

    let processed = 0
    let updated = 0
    let unchanged = 0
    let errors = 0

    // 各ウェブサイトを順次チェック（並列処理だとタイムアウトの可能性）
    for (const website of websites) {
      try {
        console.log(`🔍 Checking: ${website.name} (${website.url})`)
        
        const checkResult = await checkWebsiteContent(website.url)
        let finalStatus = checkResult.status
        
        // エラーでない場合、前回のハッシュと比較
        if (checkResult.status !== 'error' && checkResult.contentHash) {
          if (!website.content_hash) {
            // 初回チェック
            finalStatus = 'unchanged'
          } else if (website.content_hash !== checkResult.contentHash) {
            // コンテンツが変更された
            finalStatus = 'updated'
            updated++
            console.log(`✅ Updated: ${website.name}`)
          } else {
            // コンテンツ変更なし
            finalStatus = 'unchanged'
            unchanged++
            console.log(`⚪ Unchanged: ${website.name}`)
          }
        } else if (checkResult.status === 'error') {
          errors++
          console.log(`❌ Error: ${website.name} - ${checkResult.errorMessage}`)
        }

        // データベースを更新
        await updateWebsiteStatus(
          website.id,
          finalStatus,
          checkResult.contentHash,
          checkResult.errorMessage
        )

        processed++

      } catch (error) {
        console.error(`Error checking ${website.name}:`, error)
        errors++
        
        // エラーの場合もデータベースを更新
        await updateWebsiteStatus(
          website.id,
          'error',
          undefined,
          'Internal monitoring error'
        )
      }
    }

    console.log(`✅ Monitoring completed: ${processed} processed, ${updated} updated, ${unchanged} unchanged, ${errors} errors`)

    return res.status(200).json({
      message: 'Website monitoring completed',
      processed,
      updated,
      unchanged,
      errors,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cron Error:', error)
    return res.status(500).json({
      error: 'Scheduled monitoring failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}