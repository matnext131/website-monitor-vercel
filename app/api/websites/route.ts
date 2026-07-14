import { NextRequest, NextResponse } from 'next/server'
import { getWebsites, createWebsite, WebsiteCreate } from '../../../lib/db'

// サイト一覧は常に最新のDB内容を返す（静的キャッシュさせない）
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('API: Starting websites GET request')
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
    console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0)
    
    const websites = await getWebsites()
    console.log('API: Successfully fetched websites:', websites.length)
    
    return NextResponse.json({
      websites,
      total: websites.length
    })
  } catch (error: any) {
    // 詳細はサーバーログのみに残し、クライアントへは返さない
    console.error('API Error:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    })

    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, url, monitor_mode }: WebsiteCreate = await request.json()

    // バリデーション
    if (!name?.trim() || !url?.trim()) {
      return NextResponse.json(
        { error: 'サイト名とURLは必須です' },
        { status: 400 }
      )
    }

    // URL形式チェック（http/https のみ許可）
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { error: '有効なURLを入力してください' },
        { status: 400 }
      )
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'URLはhttp:またはhttps:で始まる必要があります' },
        { status: 400 }
      )
    }

    const website = await createWebsite({
      name: name.trim(),
      url: url.trim(),
      monitor_mode: monitor_mode === 'content' ? 'content' : 'full'
    })

    return NextResponse.json(website, { status: 201 })

  } catch (error: any) {
    console.error('API Error:', error)
    
    // 重複URL エラー
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'このURLは既に登録されています' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}