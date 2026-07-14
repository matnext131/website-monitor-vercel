import { NextRequest, NextResponse } from 'next/server'
import { getWebsite } from '../../../lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// 詳細な診断チェック
async function debugCheckWebsiteContent(url: string): Promise<{
  contentHash?: string
  contentLength?: number
  contentPreview?: string
  status: 'updated' | 'unchanged' | 'error'
  errorMessage?: string
  headers?: Record<string, string>
  statusCode?: number
}> {
  try {
    console.log(`🔍 Debug checking: ${url}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Website Monitor Bot 1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      signal: AbortSignal.timeout(30000)
    })

    console.log(`Response status: ${response.status}`)
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      return {
        status: 'error',
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries())
      }
    }

    const content = await response.text()
    const contentHash = crypto.createHash('sha256').update(content).digest('hex')
    
    // コンテンツの最初の500文字をプレビューとして取得
    const contentPreview = content.substring(0, 500).replace(/\s+/g, ' ').trim()
    
    console.log(`Content length: ${content.length}`)
    console.log(`Content hash: ${contentHash}`)
    console.log(`Content preview: ${contentPreview.substring(0, 100)}...`)

    return {
      contentHash,
      contentLength: content.length,
      contentPreview,
      status: 'unchanged',
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries())
    }

  } catch (error: any) {
    let errorMessage = 'Unknown error'
    // AbortSignal.timeout() は AbortError ではなく TimeoutError を投げる
    const code = error.code || error.cause?.code

    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      errorMessage = 'タイムアウトエラー'
    } else if (code === 'ENOTFOUND') {
      errorMessage = 'ドメインが見つかりません'
    } else if (code === 'ECONNREFUSED') {
      errorMessage = '接続が拒否されました'
    } else {
      errorMessage = error.message || 'ネットワークエラー'
    }

    console.error(`Debug check error:`, error)

    return {
      status: 'error',
      errorMessage
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: '有効なIDを指定してください' },
        { status: 400 }
      )
    }

    const website = await getWebsite(Number(id))
    if (!website) {
      return NextResponse.json(
        { error: 'ウェブサイトが見つかりません' },
        { status: 404 }
      )
    }

    console.log(`🔍 Debug checking website: ${website.name} (${website.url})`)
    console.log(`Current stored hash: ${website.content_hash || 'null'}`)

    const debugResult = await debugCheckWebsiteContent(website.url)
    
    // ハッシュ比較結果
    let hashComparison = 'no_previous_hash'
    if (website.content_hash && debugResult.contentHash) {
      hashComparison = website.content_hash === debugResult.contentHash ? 'identical' : 'different'
    }

    const response = {
      website: {
        id: website.id,
        name: website.name,
        url: website.url,
        stored_hash: website.content_hash,
        last_checked: website.last_checked
      },
      current_check: debugResult,
      hash_comparison: hashComparison,
      would_trigger_update: hashComparison === 'different' || hashComparison === 'no_previous_hash'
    }

    console.log(`Debug result:`, response)
    
    return NextResponse.json(response)

  } catch (error) {
    console.error('Debug Check Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}