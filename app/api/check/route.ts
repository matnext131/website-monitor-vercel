import { NextRequest, NextResponse } from 'next/server'
import { getWebsite } from '../../../lib/db'
import { checkAndUpdateWebsite } from '../../../lib/checker'

// 手動チェック用エンドポイント
export const dynamic = 'force-dynamic'
export const maxDuration = 30

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

    console.log(`🔍 Checking website: ${website.name} (${website.url}) [${website.monitor_mode || 'full'}]`)

    // 手動チェックは「更新確認済み」とみなし、変化がなければ unchanged に戻す
    const { finalStatus, contentChanged, checkResult, updatedWebsite } =
      await checkAndUpdateWebsite(website, { acknowledgeUpdate: true, timeoutMs: 25000 })

    if (finalStatus === 'error') {
      console.log(`❌ Website error: ${website.name} - ${checkResult.errorMessage}`)
    } else if (contentChanged) {
      console.log(`✅ Website updated: ${website.name}`)
    } else {
      console.log(`⚪ Website unchanged: ${website.name}`)
    }

    return NextResponse.json(updatedWebsite)

  } catch (error) {
    console.error('Check Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
