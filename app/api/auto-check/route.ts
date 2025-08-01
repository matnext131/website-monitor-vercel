import { NextResponse } from 'next/server'
import { getActiveWebsites, updateWebsiteStatus } from '../../../lib/db'
import { extractContentOnly, getCustomContentFilter } from '../../../lib/content-filter'
import crypto from 'crypto'

// ウェブサイトのコンテンツをチェックする関数
async function checkWebsiteContent(url: string, monitorMode: 'full' | 'content' = 'full'): Promise<{
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
      signal: AbortSignal.timeout(25000)
    })

    if (!response.ok) {
      return {
        status: 'error',
        errorMessage: `HTTP ${response.status}: ${response.statusText}`
      }
    }

    let content = await response.text()
    
    // 監視モードに応じてコンテンツを処理
    if (monitorMode === 'content') {
      const customFilter = getCustomContentFilter(url)
      if (customFilter) {
        content = customFilter(content)
      } else {
        content = extractContentOnly(content)
      }
    }
    
    const contentHash = crypto.createHash('sha256').update(content).digest('hex')

    return {
      contentHash,
      status: 'unchanged'
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

export async function GET() {
  try {
    console.log('🚀 Starting auto-check for all websites...')
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
    
    const websites = await getActiveWebsites()
    console.log(`📊 Found ${websites.length} active websites to check`)

    if (websites.length === 0) {
      return NextResponse.json({
        message: 'No active websites to check',
        processed: 0
      })
    }

    let processed = 0
    let updated = 0
    let unchanged = 0
    let errors = 0

    // 各ウェブサイトを順次チェック
    for (const website of websites) {
      try {
        console.log(`🔍 Auto-checking: ${website.name} (${website.url}) [${website.monitor_mode || 'full'}]`)
        
        const checkResult = await checkWebsiteContent(website.url, website.monitor_mode || 'full')
        let finalStatus = checkResult.status
        
        // エラーでない場合、前回のハッシュと比較
        if (checkResult.status !== 'error' && checkResult.contentHash) {
          if (!website.content_hash) {
            // 初回チェック - ベースラインとして保存
            finalStatus = 'unchanged'
            unchanged++
            console.log(`🆕 First auto-check (baseline): ${website.name}`)
          } else if (website.content_hash !== checkResult.contentHash) {
            // コンテンツが変更された
            finalStatus = 'updated'
            updated++
            console.log(`✅ Auto-detected update: ${website.name}`)
          } else {
            // コンテンツ変更なし
            finalStatus = 'unchanged'
            unchanged++
            console.log(`⚪ No change: ${website.name}`)
          }
        } else if (checkResult.status === 'error') {
          errors++
          console.log(`❌ Auto-check error: ${website.name} - ${checkResult.errorMessage}`)
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
        console.error(`Error auto-checking ${website.name}:`, error)
        errors++
        
        await updateWebsiteStatus(
          website.id,
          'error',
          undefined,
          'Internal monitoring error'
        )
      }
    }

    console.log(`✅ Auto-check completed: ${processed} processed, ${updated} updated, ${unchanged} unchanged, ${errors} errors`)

    return NextResponse.json({
      message: 'Auto-check completed',
      processed,
      updated,
      unchanged,
      errors,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Auto-check Error:', error)
    return NextResponse.json(
      {
        error: 'Auto-check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}