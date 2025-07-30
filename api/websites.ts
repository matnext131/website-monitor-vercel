import { NextApiRequest, NextApiResponse } from 'next'
import { getWebsites, createWebsite, WebsiteCreate } from '../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method === 'GET') {
      // ウェブサイト一覧取得
      const websites = await getWebsites()
      return res.status(200).json({
        websites,
        total: websites.length
      })
    }

    if (req.method === 'POST') {
      // 新しいウェブサイト追加
      const { name, url }: WebsiteCreate = req.body

      // バリデーション
      if (!name?.trim() || !url?.trim()) {
        return res.status(400).json({
          error: 'サイト名とURLは必須です'
        })
      }

      // URL形式チェック
      try {
        new URL(url)
      } catch {
        return res.status(400).json({
          error: '有効なURLを入力してください'
        })
      }

      const website = await createWebsite({
        name: name.trim(),
        url: url.trim()
      })

      return res.status(201).json(website)
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error: any) {
    console.error('API Error:', error)
    
    // 重複URL エラー
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'このURLは既に登録されています'
      })
    }

    return res.status(500).json({
      error: 'サーバーエラーが発生しました'
    })
  }
}