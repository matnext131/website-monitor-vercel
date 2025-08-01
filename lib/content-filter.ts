// コンテンツフィルタリング機能
// 広告・トラッキング要素を除去し、実際のコンテンツのみを抽出

export function extractContentOnly(html: string): string {
  try {
    // 除去する要素のパターン
    const excludePatterns = [
      // Google Analytics, Google Tag Manager
      /<script[^>]*gtag[^>]*>.*?<\/script>/gis,
      /<script[^>]*googletagmanager[^>]*>.*?<\/script>/gis,
      /<script[^>]*analytics[^>]*>.*?<\/script>/gis,
      
      // 広告関連
      /<script[^>]*adingo[^>]*>.*?<\/script>/gis,
      /<script[^>]*doubleclick[^>]*>.*?<\/script>/gis,
      /<script[^>]*googlesyndication[^>]*>.*?<\/script>/gis,
      /<div[^>]*class="[^"]*ad[^"]*"[^>]*>.*?<\/div>/gis,
      
      // トラッキングスクリプト
      /<script[^>]*criteo[^>]*>.*?<\/script>/gis,
      /<script[^>]*bidswitch[^>]*>.*?<\/script>/gis,
      /<script[^>]*nakanohito[^>]*>.*?<\/script>/gis,
      /<script[^>]*yahoo[^>]*>.*?<\/script>/gis,
      
      // ランダム要素
      /data-timestamp="[^"]*"/gi,
      /data-session="[^"]*"/gi,
      /\?t=\d+/gi,
      /\?v=\d+/gi,
      
      // 日時関連の動的要素
      /\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/gi,
      
      // その他のトラッキング
      /<noscript>.*?<\/noscript>/gis,
      /<!--.*?-->/gs
    ]

    let filteredHtml = html

    // パターンを順次適用
    excludePatterns.forEach(pattern => {
      filteredHtml = filteredHtml.replace(pattern, '')
    })

    // 重要なコンテンツ要素のみを抽出
    const contentPatterns = [
      /<title[^>]*>(.*?)<\/title>/gis,
      /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gis,
      /<article[^>]*>(.*?)<\/article>/gis,
      /<main[^>]*>(.*?)<\/main>/gis,
      /<section[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/section>/gis,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/gis,
      /<meta[^>]*name="description"[^>]*>/gis,
      /<meta[^>]*property="og:title"[^>]*>/gis,
      /<meta[^>]*property="og:description"[^>]*>/gis
    ]

    // 空白・改行を正規化
    filteredHtml = filteredHtml
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim()

    return filteredHtml

  } catch (error) {
    console.error('Content filtering error:', error)
    // エラー時は元のHTMLを返す（既存動作を維持）
    return html
  }
}

// 特定サイト向けのカスタムフィルター
export function getCustomContentFilter(url: string): ((html: string) => string) | null {
  // Web-Ace用のカスタムフィルター
  if (url.includes('web-ace.jp')) {
    return (html: string) => {
      // Web-Aceの記事タイトルと更新日時のみを監視
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
      const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
      const dateMatch = html.match(/更新日[：:]\s*(\d{4}[\/\-]\d{2}[\/\-]\d{2})/i)
      
      const content = [
        titleMatch?.[1] || '',
        h1Match?.[1] || '',
        dateMatch?.[0] || ''
      ].filter(Boolean).join('|')
      
      return content || html
    }
  }

  return null
}