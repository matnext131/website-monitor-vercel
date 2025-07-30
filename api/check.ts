import { NextApiRequest, NextApiResponse } from 'next'
import { getWebsite, updateWebsiteStatus } from '../lib/db'
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
      signal: AbortSignal.timeout(30000) // 30秒タイムアウト
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
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        error: '有効なIDを指定してください'
      })
    }

    const website = await getWebsite(Number(id))
    if (!website) {
      return res.status(404).json({
        error: 'ウェブサイトが見つかりません'
      })
    }

    console.log(`🔍 Checking website: ${website.name} (${website.url})`)

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
        console.log(`✅ Website updated: ${website.name}`)
      } else {
        // コンテンツ変更なし
        finalStatus = 'unchanged'
        console.log(`⚪ Website unchanged: ${website.name}`)
      }
    } else if (checkResult.status === 'error') {
      console.log(`❌ Website error: ${website.name} - ${checkResult.errorMessage}`)
    }

    // データベースを更新
    const updatedWebsite = await updateWebsiteStatus(
      Number(id),
      finalStatus,
      checkResult.contentHash,
      checkResult.errorMessage
    )

    return res.status(200).json(updatedWebsite)

  } catch (error) {
    console.error('Check Error:', error)
    return res.status(500).json({
      error: 'サーバーエラーが発生しました'
    })
  }
}