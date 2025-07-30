export interface Website {
  id: number
  name: string
  url: string
  last_checked: Date | null
  last_modified: Date | null
  content_hash: string | null
  status: 'pending' | 'updated' | 'unchanged' | 'error'
  is_active: boolean
  error_message: string | null
  created_at: Date
  updated_at: Date
}

export interface WebsiteCreate {
  name: string
  url: string
}

export interface WebsiteListResponse {
  websites: Website[]
  total: number
}

export interface StatusResponse {
  message: string
  success: boolean
}