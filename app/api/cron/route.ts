import { NextRequest, NextResponse } from 'next/server'
import { getActiveWebsites } from '../../../lib/db'
import { checkWebsitesInBatches } from '../../../lib/checker'

// Vercel Cron から呼ばれる定期監視エンドポイント
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Vercel Cron は環境変数 CRON_SECRET を設定すると
  // 「Authorization: Bearer <CRON_SECRET>」ヘッダーを自動で付与する。
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (process.env.NODE_ENV === 'production') {
    // 本番では CRON_SECRET を必須とし、未設定なら処理を実行しない
    if (!cronSecret) {
      console.error('CRON_SECRET is not configured. Set it in Vercel project settings.')
      return NextResponse.json(
        { error: 'CRON_SECRET is not configured' },
        { status: 500 }
      )
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // ローカル開発では CRON_SECRET を設定した場合のみ照合する
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('🚀 Starting scheduled website monitoring...')

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
      `✅ Monitoring completed: ${summary.processed} processed, ${summary.updated} updated, ` +
      `${summary.unchanged} unchanged, ${summary.errors} errors, ${summary.skipped} skipped`
    )

    return NextResponse.json({
      message: 'Website monitoring completed',
      ...summary,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cron Error:', error)
    return NextResponse.json(
      { error: 'Scheduled monitoring failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
