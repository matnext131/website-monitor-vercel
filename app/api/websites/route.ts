import { NextRequest, NextResponse } from 'next/server'
import { getWebsites, createWebsite, WebsiteCreate } from '../../../lib/db'

export async function GET() {
  try {
    const websites = await getWebsites()
    return NextResponse.json({
      websites,
      total: websites.length
    })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, url }: WebsiteCreate = await request.json()

    // バリデーション
    if (!name?.trim() || !url?.trim()) {
      return NextResponse.json(
        { error: 'サイト名とURLは必須です' },
        { status: 400 }
      )
    }

    // URL形式チェック
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: '有効なURLを入力してください' },
        { status: 400 }
      )
    }

    const website = await createWebsite({
      name: name.trim(),
      url: url.trim()
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