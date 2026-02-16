import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserSettingsUpdate } from '@/shared/types/database'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'

// Query to get user settings
export function useUserSettings() {
  return useQuery({
    queryKey: queryKeys.settings.user(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data
    },
  })
}

// Mutation to update user settings
export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: UserSettingsUpdate) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('users')
        .update(settings)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all })
    },
  })
}
