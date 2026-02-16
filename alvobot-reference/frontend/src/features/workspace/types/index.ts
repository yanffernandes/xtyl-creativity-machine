export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'
export type MemberStatus = 'pending' | 'active' | 'suspended' | 'left'
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

export interface WorkspaceSettings {
  default_language?: string
  timezone?: string
  features_enabled?: string[]
}

export interface MemberPermissions {
  can_manage_members?: boolean
  can_manage_projects?: boolean
  can_manage_billing?: boolean
  can_delete_content?: boolean
  projects_access?: string[] | null
}

export interface Workspace {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  settings: WorkspaceSettings
  max_projects: number
  max_members: number
  max_articles_per_month: number
  plan_id?: string
  billing_email?: string
  owner_user_id: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface WorkspaceMembership {
  role: WorkspaceRole
  status: MemberStatus
}

export interface WorkspaceWithMembership extends Workspace {
  membership?: WorkspaceMembership
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  permissions: MemberPermissions
  invited_by?: string
  invited_at: string
  accepted_at?: string
  status: MemberStatus
  created_at: string
  updated_at: string
  user?: {
    id: string
    email: string
    raw_user_meta_data?: {
      name?: string
      full_name?: string
      avatar_url?: string
    }
  }
}

export interface WorkspaceInvitation {
  id: string
  workspace_id: string
  email: string
  role: WorkspaceRole
  token: string
  invited_by: string
  expires_at: string
  status: InvitationStatus
  created_at: string
  accepted_at?: string
}

// API Request/Response types
export interface CreateWorkspaceRequest {
  name: string
  slug?: string
  description?: string
}

export interface UpdateWorkspaceRequest {
  name?: string
  slug?: string
  description?: string
  logo_url?: string
  settings?: WorkspaceSettings
}

export interface InviteMemberRequest {
  email: string
  role: Exclude<WorkspaceRole, 'owner'>
}

export interface UpdateMemberRequest {
  role?: Exclude<WorkspaceRole, 'owner'>
  permissions?: MemberPermissions
}

// API Responses
export interface WorkspacesResponse {
  workspaces: WorkspaceWithMembership[]
}

export interface WorkspaceResponse {
  workspace: WorkspaceWithMembership
}

export interface MembersResponse {
  members: WorkspaceMember[]
}

export interface InvitationResponse {
  invitation: WorkspaceInvitation
}

export interface MemberResponse {
  member: WorkspaceMember
}

export interface InvitationsResponse {
  invitations: WorkspaceInvitation[]
}

export interface InvitationDetailsResponse {
  invitation: WorkspaceInvitation
  workspace: {
    name: string
    slug: string
  }
  inviter: {
    name: string
    email: string
  }
}
