import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase, getCurrentUserId } from '@/shared/utils/supabase'
import type { TeamUser, UserFilters, InviteUserInput, UpdateUserInput } from '../types'

async function fetchUsers(filters: UserFilters): Promise<TeamUser[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []

  // Fetch team users where the current user is the owner
  let query = supabase
    .from('team_users')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  if (filters.search) {
    query = query.or(`email.ilike.%${filters.search}%,name.ilike.%${filters.search}%`)
  }

  if (filters.role) {
    query = query.eq('role', filters.role)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) throw error
  return data as TeamUser[]
}

async function inviteUser(input: InviteUserInput): Promise<TeamUser> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('team_users')
    .insert({
      email: input.email,
      role: input.role,
      status: 'pending',
      owner_id: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data as TeamUser
}

async function updateUser(input: UpdateUserInput): Promise<TeamUser> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { id, ...updates } = input
  const { data, error } = await supabase
    .from('team_users')
    .update(updates)
    .eq('id', id)
    .eq('owner_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as TeamUser
}

async function removeUser(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('team_users')
    .delete()
    .eq('id', id)
    .eq('owner_id', userId)

  if (error) throw error
}

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => fetchUsers(filters),
  })
}

export function useInviteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: inviteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

export function useRemoveUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}
