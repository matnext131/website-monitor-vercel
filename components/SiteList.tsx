'use client'

import { useState } from 'react'
import { Website } from '@/types'
import StatusBadge from './StatusBadge'
import { format } from 'date-fns'

interface SiteListProps {
  websites: Website[]
  onSiteDeleted: () => void
  onRefresh: () => void
}

export default function SiteList({ websites, onSiteDeleted, onRefresh }: SiteListProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を監視リストから削除しますか？`)) {
      return
    }

    setLoadingStates(prev => ({ ...prev, [`delete_${id}`]: true }))
    
    try {
      const response = await fetch(`/api/delete?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '削除に失敗しました')
      }

      onSiteDeleted()
    } catch (error) {
      alert('削除に失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoadingStates(prev => ({ ...prev, [`delete_${id}`]: false }))
    }
  }

  const handleManualCheck = async (id: number) => {
    setLoadingStates(prev => ({ ...prev, [`check_${id}`]: true }))
    
    try {
      const response = await fetch(`/api/check?id=${id}`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'チェックに失敗しました')
      }

      onRefresh()
    } catch (error) {
      alert('チェックに失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoadingStates(prev => ({ ...prev, [`check_${id}`]: false }))
    }
  }

  const formatDate = (dateString: Date | string | null) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return format(date, 'MM/dd HH:mm')
    } catch {
      return '-'
    }
  }

  if (websites.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-4">📭</div>
        <p className="text-lg font-medium">監視中のサイトがありません</p>
        <p className="text-sm mt-2">左のフォームから新しいサイトを追加してください</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                サイト名
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                URL
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最終チェック
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {websites.map((website) => (
              <tr key={website.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div className="font-medium text-gray-900">{website.name}</div>
                </td>
                <td className="px-4 py-4">
                  <a
                    href={website.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-800 text-sm truncate max-w-xs block"
                    title={website.url}
                  >
                    {website.url}
                  </a>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  {formatDate(website.last_checked)}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge website={website} />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleManualCheck(website.id)}
                      disabled={loadingStates[`check_${website.id}`]}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium disabled:opacity-50"
                      title="手動でチェック"
                    >
                      {loadingStates[`check_${website.id}`] ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                      ) : (
                        '🔍'
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(website.id, website.name)}
                      disabled={loadingStates[`delete_${website.id}`]}
                      className="text-error-600 hover:text-error-800 text-sm font-medium disabled:opacity-50"
                      title="削除"
                    >
                      {loadingStates[`delete_${website.id}`] ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-error-600"></div>
                      ) : (
                        '🗑️'
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}