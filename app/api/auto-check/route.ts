import { NextResponse } from 'next/server'
import { getActiveWebsites } from '../../../lib/db'
import { checkWebsitesInBatches } from '../../../lib/checker'

// 画面からの全サイト一括チェック用エンドポイント
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    console.log('🚀 Starting auto-check for all websites...')

    const websites = await getActiveWebsites()
    console.log(`📊 Found ${websites.length} active websites to check`)

    if (websites.length === 0) {
      return NextResponse.json({
        message: 'No active websites to check',
        processed: 0
      })
    }

    // 並列数を絞りつつ時間予算内でチェック（maxDuration 60秒を超えないように）
    const summary = await checkWebsitesInBatches(websites, {
      concurrency: 3,
      timeBudgetMs: 45000,
      timeoutMs: 15000
    })

    console.log(
      `✅ Auto-check completed: ${summary.processed} processed, ${summary.updated} updated, ` +
      `${summary.unchanged} unchanged, ${summary.errors} errors, ${summary.skipped} skipped`
    )

    return NextResponse.json({
      message: 'Auto-check completed',
      ...summary,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Auto-check Error:', error)
    return NextResponse.json(
      { error: 'Auto-check failed' },
      { status: 500 }
    )
  }
}
