import { NextRequest, NextResponse } from 'next/server'
import { getWebsite, updateWebsiteStatus } from '../../../lib/db'
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

export async function POST(request: NextRequest) {
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

    return NextResponse.json(updatedWebsite)

  } catch (error) {
    console.error('Check Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}