import { NextRequest, NextResponse } from 'next/server'
import { deleteWebsite } from '../../../lib/db'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: '有効なIDを指定してください' },
        { status: 400 }
      )
    }

    const success = await deleteWebsite(Number(id))

    if (!success) {
      return NextResponse.json(
        { error: 'ウェブサイトが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'ウェブサイトが削除されました',
      success: true
    })

  } catch (error) {
    console.error('Delete Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}