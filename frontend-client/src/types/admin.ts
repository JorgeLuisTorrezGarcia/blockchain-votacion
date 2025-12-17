export interface Election {
  id: number
  on_chain_id: string
  title: string
  description: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  options: string[]
  initial_voters: string[] | null
  tx_hash: string | null
  created_by_user_id: number | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  page: number
  limit: number
  total: number
  results: T[]
}

export interface RegisteredVoter {
  id: number
  full_name: string
  email: string
  wallet_address: string | null
  role: 'user' | 'admin'
  createdAt: string
  updatedAt: string
}
