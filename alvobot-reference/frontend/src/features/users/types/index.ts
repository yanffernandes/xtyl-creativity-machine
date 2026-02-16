export type UserRole = 'admin' | 'editor' | 'viewer'
export type UserStatus = 'active' | 'inactive' | 'pending'

export interface TeamUser {
  id: string
  email: string
  name?: string
  avatar_url?: string
  role: UserRole
  status: UserStatus
  last_login?: string
  created_at: string
}

export interface UserFilters {
  search?: string
  role?: UserRole
  status?: UserStatus
}

export interface InviteUserInput {
  email: string
  role: UserRole
}

export interface UpdateUserInput {
  id: string
  role?: UserRole
  status?: UserStatus
}
