'use client'

import { useState } from 'react'
import { WebsiteCreate } from '../types'

interface AddSiteFormProps {
  onSiteAdded: () => void
}

export default function AddSiteForm({ onSiteAdded }: AddSiteFormProps) {
  const [formData, setFormData] = useState<WebsiteCreate>({
    name: '',
    url: '',
    monitor_mode: 'full'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'サイトの追加に失敗しました')
      }

      setFormData({ name: '', url: '', monitor_mode: 'full' })
      onSiteAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'サイトの追加に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-3 py-2 rounded text-sm">
          ⚠️ {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          サイト名
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="input-field"
          placeholder="例: Googleニュース"
          required
        />
      </div>

      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
          URL
        </label>
        <input
          type="url"
          id="url"
          name="url"
          value={formData.url}
          onChange={handleChange}
          className="input-field"
          placeholder="https://example.com"
          required
        />
      </div>

      <div>
        <label htmlFor="monitor_mode" className="block text-sm font-medium text-gray-700 mb-1">
          監視モード
        </label>
        <select
          id="monitor_mode"
          name="monitor_mode"
          value={formData.monitor_mode}
          onChange={handleChange}
          className="input-field"
        >
          <option value="full">🌐 全体監視（従来）</option>
          <option value="content">📝 コンテンツのみ（広告除外）</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          コンテンツのみ：広告やトラッキングを除外し、記事内容の変更のみを検知
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !formData.name.trim() || !formData.url.trim()}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            追加中...
          </span>
        ) : (
          '➕ サイトを追加'
        )}
      </button>
    </form>
  )
}