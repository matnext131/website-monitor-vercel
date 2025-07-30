'use client'

import { useState, useEffect } from 'react'
import { Website, WebsiteListResponse } from '../types'
import SiteList from '../components/SiteList'
import AddSiteForm from '../components/AddSiteForm'

export default function HomePage() {
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadWebsites = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/websites')
      
      if (!response.ok) {
        throw new Error('Failed to fetch websites')
      }
      
      const data: WebsiteListResponse = await response.json()
      setWebsites(data.websites)
      setError(null)
    } catch (err) {
      setError('サイト一覧の取得に失敗しました')
      console.error('Error loading websites:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWebsites()
  }, [])

  const handleSiteAdded = () => {
    loadWebsites()
  }

  const handleSiteDeleted = () => {
    loadWebsites()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0">
      {error && (
        <div className="mb-6 bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* サイト追加フォーム */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              📝 新しいサイトを追加
            </h2>
            <AddSiteForm onSiteAdded={handleSiteAdded} />
          </div>

          {/* 統計情報 */}
          <div className="card mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">📈 統計</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">総サイト数:</span>
                <span className="font-medium">{websites.length}件</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">更新済み:</span>
                <span className="text-success-600 font-medium">
                  {websites.filter(site => site.status === 'updated').length}件
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">エラー:</span>
                <span className="text-error-600 font-medium">
                  {websites.filter(site => site.status === 'error').length}件
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* サイト一覧 */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                🌐 監視中のサイト一覧
              </h2>
              <button
                onClick={loadWebsites}
                className="btn-secondary text-sm"
                disabled={loading}
              >
                🔄 更新
              </button>
            </div>
            <SiteList 
              websites={websites} 
              onSiteDeleted={handleSiteDeleted}
              onRefresh={loadWebsites}
            />
          </div>
        </div>
      </div>
    </div>
  )
}