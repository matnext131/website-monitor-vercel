import crypto from 'crypto'
import { Website, updateWebsiteStatus } from './db'
import { extractContentOnly, getCustomContentFilter } from './content-filter'

// 手動チェック・auto-check・cron で共通のチェック処理

export interface CheckResult {
  contentHash?: string
  status: 'updated' | 'unchanged' | 'error'
  errorMessage?: string
}

export interface CheckOutcome {
  finalStatus: Website['status']
  contentChanged: boolean
  checkResult: CheckResult
  updatedWebsite: Website | null
}

export interface BatchSummary {
  processed: number
  updated: number
  unchanged: number
  errors: number
  skipped: number
}

// 監視モードに応じてコンテンツを取得し、SHA256ハッシュを計算する
export async function checkWebsiteContent(
  url: string,
  monitorMode: Website['monitor_mode'] = 'full',
  timeoutMs = 25000
): Promise<CheckResult> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Website Monitor Bot 1.0'
      },
      signal: AbortSignal.timeout(timeoutMs)
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
      status: 'unchanged' // 呼び出し側で前回のハッシュと比較して決定
    }

  } catch (error: any) {
    let errorMessage = 'Unknown error'
    // AbortSignal.timeout() は AbortError ではなく TimeoutError を投げる
    // fetch のネットワークエラーは error.cause 側に code が入る
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

    return {
      status: 'error',
      errorMessage
    }
  }
}

// 1サイトをチェックしてDBを更新する。
// acknowledgeUpdate=false（自動チェック）のとき、既存の「updated」表示は
// 内容が変わっていなくても維持する。手動チェック（acknowledgeUpdate=true）で
// ユーザーが確認した時点で「unchanged」に戻る。
export async function checkAndUpdateWebsite(
  website: Website,
  options: { acknowledgeUpdate?: boolean; timeoutMs?: number } = {}
): Promise<CheckOutcome> {
  const { acknowledgeUpdate = false, timeoutMs } = options

  const checkResult = await checkWebsiteContent(
    website.url,
    website.monitor_mode || 'full',
    timeoutMs
  )

  let finalStatus: Website['status'] = checkResult.status
  let contentChanged = false

  if (checkResult.status !== 'error' && checkResult.contentHash) {
    if (!website.content_hash) {
      // 初回チェック - ベースラインとして保存
      finalStatus = 'unchanged'
    } else if (website.content_hash !== checkResult.contentHash) {
      // コンテンツが変更された
      finalStatus = 'updated'
      contentChanged = true
    } else if (website.status === 'updated' && !acknowledgeUpdate) {
      // 未確認の更新表示は自動チェックでは消さない
      finalStatus = 'updated'
    } else {
      finalStatus = 'unchanged'
    }
  }

  const updatedWebsite = await updateWebsiteStatus(
    website.id,
    finalStatus,
    checkResult.contentHash,
    checkResult.errorMessage,
    contentChanged
  )

  return { finalStatus, contentChanged, checkResult, updatedWebsite }
}

// 複数サイトを並列数を絞りながらチェックする（auto-check / cron 用）。
// 残り時間が足りなくなったら以降のサイトをスキップし、関数全体の
// タイムアウトを避ける。getActiveWebsites は last_checked が古い順に
// 返すため、スキップされたサイトは次回実行時に優先して処理される。
export async function checkWebsitesInBatches(
  websites: Website[],
  options: { concurrency?: number; timeBudgetMs?: number; timeoutMs?: number } = {}
): Promise<BatchSummary> {
  const { concurrency = 3, timeBudgetMs = 45000, timeoutMs = 15000 } = options
  const startedAt = Date.now()
  const summary: BatchSummary = {
    processed: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    skipped: 0
  }

  for (let i = 0; i < websites.length; i += concurrency) {
    if (Date.now() - startedAt > timeBudgetMs) {
      summary.skipped = websites.length - i
      console.log(`⏭️ Time budget exceeded, skipping ${summary.skipped} site(s) until next run`)
      break
    }

    const batch = websites.slice(i, i + concurrency)
    const results = await Promise.allSettled(
      batch.map(website => checkAndUpdateWebsite(website, { timeoutMs }))
    )

    for (let j = 0; j < results.length; j++) {
      const website = batch[j]
      const result = results[j]

      if (result.status === 'fulfilled') {
        summary.processed++
        const { finalStatus, contentChanged, checkResult } = result.value

        if (finalStatus === 'error') {
          summary.errors++
          console.log(`❌ Check error: ${website.name} - ${checkResult.errorMessage}`)
        } else if (contentChanged) {
          summary.updated++
          console.log(`✅ Update detected: ${website.name}`)
        } else {
          summary.unchanged++
          console.log(`⚪ No change: ${website.name}`)
        }
      } else {
        summary.errors++
        console.error(`Error checking ${website.name}:`, result.reason)

        // エラーの場合もデータベースへの記録を試みる
        try {
          await updateWebsiteStatus(website.id, 'error', undefined, 'Internal monitoring error')
        } catch (dbError) {
          console.error(`Failed to record error status for ${website.name}:`, dbError)
        }
      }
    }
  }

  return summary
}
