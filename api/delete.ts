import { NextApiRequest, NextApiResponse } from 'next'
import { deleteWebsite } from '../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        error: '有効なIDを指定してください'
      })
    }

    const success = await deleteWebsite(Number(id))

    if (!success) {
      return res.status(404).json({
        error: 'ウェブサイトが見つかりません'
      })
    }

    return res.status(200).json({
      message: 'ウェブサイトが削除されました',
      success: true
    })

  } catch (error) {
    console.error('Delete Error:', error)
    return res.status(500).json({
      error: 'サーバーエラーが発生しました'
    })
  }
}