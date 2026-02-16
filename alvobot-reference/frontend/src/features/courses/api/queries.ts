import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type {
  Course,
  CourseWithModules,
  CourseWithStats,
  LessonWithMaterials,
  LessonProgress,
  UserCourseProgress,
  CourseFilters,
  UserCourseFilters,
} from '../types'

// ============================================
// USER QUERIES (Published courses with access check)
// ============================================

/**
 * Fetch all published courses accessible to the current user
 */
export function useCoursesQuery(filters?: UserCourseFilters) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.courses.list(filters || {}),
    queryFn: async (): Promise<Course[]> => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          slug,
          description,
          thumbnail_url,
          status,
          visibility_type,
          plan_ids,
          user_ids,
          order_index,
          created_by,
          created_at,
          updated_at
        `)
        .eq('status', 'published')
        .order('order_index')

      if (error) throw error
      return data || []
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch a single course by slug with modules and lessons
 */
export function useCourseQuery(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.detail(slug!),
    queryFn: async (): Promise<CourseWithModules> => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          course_modules (
            *,
            lessons (
              id,
              module_id,
              title,
              description,
              youtube_url,
              youtube_video_id,
              duration_minutes,
              order_index,
              is_free_preview,
              created_at,
              updated_at
            )
          )
        `)
        .eq('slug', slug)
        .single()

      if (error) throw error

      // Sort modules and lessons by order_index
      if (data.course_modules) {
        data.course_modules.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
        data.course_modules.forEach((module: { lessons?: Array<{ order_index: number }> }) => {
          if (module.lessons) {
            module.lessons.sort((a, b) => a.order_index - b.order_index)
          }
        })
      }

      return data
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch a single lesson with materials
 */
export function useLessonQuery(lessonId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.lesson(lessonId!),
    queryFn: async (): Promise<LessonWithMaterials> => {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          *,
          lesson_materials (*)
        `)
        .eq('id', lessonId)
        .single()

      if (error) throw error

      // Sort materials by order_index
      if (data.lesson_materials) {
        data.lesson_materials.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
      }

      return data
    },
    enabled: !!lessonId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch user progress for all courses
 */
export function useUserProgressQuery() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.courses.userProgress(user?.id || ''),
    queryFn: async (): Promise<UserCourseProgress[]> => {
      const { data, error } = await supabase
        .from('user_course_progress')
        .select('*')

      if (error) throw error
      return data || []
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Fetch user progress for a specific course
 */
export function useCourseProgressQuery(courseId: string | undefined) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.courses.courseProgress(courseId!),
    queryFn: async (): Promise<UserCourseProgress | null> => {
      const { data, error } = await supabase
        .from('user_course_progress')
        .select('*')
        .eq('course_id', courseId)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!user?.id && !!courseId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Fetch lesson progress for a specific lesson
 */
export function useLessonProgressQuery(lessonId: string | undefined) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.courses.lessonProgress(user?.id || '', lessonId!),
    queryFn: async (): Promise<LessonProgress | null> => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user!.id)
        .eq('lesson_id', lessonId)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!user?.id && !!lessonId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Fetch lesson progress for multiple lessons (batch)
 */
export function useLessonsProgressQuery(lessonIds: string[]) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['courses', 'lessons-progress', user?.id, lessonIds],
    queryFn: async (): Promise<LessonProgress[]> => {
      if (!lessonIds.length) return []

      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user!.id)
        .in('lesson_id', lessonIds)

      if (error) throw error
      return data || []
    },
    enabled: !!user?.id && lessonIds.length > 0,
    staleTime: 1 * 60 * 1000,
  })
}

// ============================================
// ADMIN QUERIES (All courses for management)
// ============================================

/**
 * Fetch all courses with stats for admin management
 */
export function useAdminCoursesQuery(filters?: CourseFilters) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.courses.adminList(filters || {}),
    queryFn: async (): Promise<CourseWithStats[]> => {
      let query = supabase
        .from('courses_with_stats')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.visibility_type) {
        query = query.eq('visibility_type', filters.visibility_type)
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Fetch a single course by ID for admin editing
 */
export function useAdminCourseQuery(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.adminDetail(courseId!),
    queryFn: async (): Promise<CourseWithModules> => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          course_modules (
            *,
            lessons (
              *,
              lesson_materials (*)
            )
          )
        `)
        .eq('id', courseId)
        .single()

      if (error) throw error

      // Sort modules and lessons by order_index
      if (data.course_modules) {
        data.course_modules.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
        data.course_modules.forEach((module: { lessons?: Array<{ order_index: number; lesson_materials?: Array<{ order_index: number }> }> }) => {
          if (module.lessons) {
            module.lessons.sort((a, b) => a.order_index - b.order_index)
            module.lessons.forEach((lesson) => {
              if (lesson.lesson_materials) {
                lesson.lesson_materials.sort((a, b) => a.order_index - b.order_index)
              }
            })
          }
        })
      }

      return data
    },
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000,
  })
}
