import { Website } from '../types'

interface StatusBadgeProps {
  website: Website
}

export default function StatusBadge({ website }: StatusBadgeProps) {
  const getStatusInfo = (status: Website['status']) => {
    switch (status) {
      case 'updated':
        return {
          emoji: '🟢',
          text: '新規更新',
          className: 'bg-success-50 text-success-700 border-success-200'
        }
      case 'unchanged':
        return {
          emoji: '⚪️',
          text: '未更新',
          className: 'bg-gray-50 text-gray-700 border-gray-200'
        }
      case 'error':
        return {
          emoji: '🔴',
          text: 'エラー',
          className: 'bg-error-50 text-error-700 border-error-200'
        }
      case 'pending':
      default:
        return {
          emoji: '⏳',
          text: '待機中',
          className: 'bg-warning-50 text-warning-700 border-warning-200'
        }
    }
  }

  const statusInfo = getStatusInfo(website.status)

  return (
    <div className="flex items-center space-x-2">
      <span 
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.className}`}
        title={website.error_message || statusInfo.text}
      >
        <span className="mr-1">{statusInfo.emoji}</span>
        {statusInfo.text}
      </span>
      
      {website.status === 'error' && website.error_message && (
        <span 
          className="text-xs text-error-600 truncate max-w-xs cursor-help"
          title={website.error_message}
        >
          {website.error_message}
        </span>
      )}
    </div>
  )
}