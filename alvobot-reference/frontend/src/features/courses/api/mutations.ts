import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import { generateSlug } from '../utils/slug'
import { extractYouTubeId } from '../utils/youtube'
import type {
  Course,
  CourseModule,
  Lesson,
  LessonMaterial,
  LessonProgress,
  CreateCourseRequest,
  UpdateCourseRequest,
  CreateModuleRequest,
  UpdateModuleRequest,
  CreateLessonRequest,
  UpdateLessonRequest,
  CreateMaterialRequest,
  ReorderItem,
} from '../types'

// ============================================
// COURSE MUTATIONS
// ============================================

async function createCourse(
  userId: string,
  input: CreateCourseRequest
): Promise<Course> {
  const slug = generateSlug(input.title)

  const { data, error } = await supabase
    .from('courses')
    .insert({
      title: input.title,
      slug,
      description: input.description || null,
      thumbnail_url: input.thumbnail_url || null,
      visibility_type: input.visibility_type || 'public',
      plan_ids: input.plan_ids || [],
      user_ids: input.user_ids || [],
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateCourse(
  courseId: string,
  input: UpdateCourseRequest
): Promise<Course> {
  const updateData: Record<string, unknown> = { ...input }

  // Generate new slug if title is being updated
  if (input.title) {
    updateData.slug = generateSlug(input.title)
  }

  const { data, error } = await supabase
    .from('courses')
    .update(updateData)
    .eq('id', courseId)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId)

  if (error) throw error
}

async function reorderCourses(items: ReorderItem[]): Promise<void> {
  for (const item of items) {
    const { error } = await supabase
      .from('courses')
      .update({ order_index: item.order_index })
      .eq('id', item.id)

    if (error) throw error
  }
}

export function useCreateCourse() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: (input: CreateCourseRequest) => createCourse(user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
    },
  })
}

export function useUpdateCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateCourseRequest & { id: string }) =>
      updateCourse(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.detail(data.slug),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.adminDetail(data.id),
      })
    },
  })
}

export function useDeleteCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
    },
  })
}

export function useReorderCourses() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reorderCourses,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
    },
  })
}

// ============================================
// MODULE MUTATIONS
// ============================================

async function createModule(input: CreateModuleRequest): Promise<CourseModule> {
  // Get the next order_index
  const { data: existingModules } = await supabase
    .from('course_modules')
    .select('order_index')
    .eq('course_id', input.course_id)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = existingModules?.[0]?.order_index ?? -1
  const orderIndex = nextIndex + 1

  const { data, error } = await supabase
    .from('course_modules')
    .insert({
      course_id: input.course_id,
      title: input.title,
      description: input.description || null,
      order_index: orderIndex,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateModule(
  moduleId: string,
  input: UpdateModuleRequest
): Promise<CourseModule> {
  const { data, error } = await supabase
    .from('course_modules')
    .update(input)
    .eq('id', moduleId)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteModule(moduleId: string): Promise<void> {
  const { error } = await supabase
    .from('course_modules')
    .delete()
    .eq('id', moduleId)

  if (error) throw error
}

async function reorderModules(items: ReorderItem[]): Promise<void> {
  for (const item of items) {
    const { error } = await supabase
      .from('course_modules')
      .update({ order_index: item.order_index })
      .eq('id', item.id)

    if (error) throw error
  }
}

export function useCreateModule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createModule,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.adminDetail(data.course_id),
      })
    },
  })
}

export function useUpdateModule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateModuleRequest & { id: string }) =>
      updateModule(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
    },
  })
}

export function useDeleteModule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteModule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
    },
  })
}

export function useReorderModules() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reorderModules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
    },
  })
}

// ============================================
// LESSON MUTATIONS
// ============================================

async function createLesson(input: CreateLessonRequest): Promise<Lesson> {
  // Get the next order_index
  const { data: existingLessons } = await supabase
    .from('lessons')
    .select('order_index')
    .eq('module_id', input.module_id)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = existingLessons?.[0]?.order_index ?? -1
  const orderIndex = nextIndex + 1

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      module_id: input.module_id,
      title: input.title,
      description: input.description || null,
      youtube_url: input.youtube_url,
      youtube_video_id: extractYouTubeId(input.youtube_url),
      duration_minutes: input.duration_minutes || null,
      is_free_preview: input.is_free_preview || false,
      order_index: orderIndex,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateLesson(
  lessonId: string,
  input: UpdateLessonRequest
): Promise<Lesson> {
  const updateData: Record<string, unknown> = { ...input }

  // Extract video ID if YouTube URL is being updated
  if (input.youtube_url) {
    updateData.youtube_video_id = extractYouTubeId(input.youtube_url)
  }

  const { data, error } = await supabase
    .from('lessons')
    .update(updateData)
    .eq('id', lessonId)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteLesson(lessonId: string): Promise<void> {
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId)

  if (error) throw error
}

async function reorderLessons(items: ReorderItem[]): Promise<void> {
  for (const item of items) {
    const { error } = await supabase
      .from('lessons')
      .update({ order_index: item.order_index })
      .eq('id', item.id)

    if (error) throw error
  }
}

async function moveLesson(
  lessonId: string,
  newModuleId: string
): Promise<Lesson> {
  // Get the next order_index in the new module
  const { data: existingLessons } = await supabase
    .from('lessons')
    .select('order_index')
    .eq('module_id', newModuleId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = existingLessons?.[0]?.order_index ?? -1
  const orderIndex = nextIndex + 1

  const { data, error } = await supabase
    .from('lessons')
    .update({
      module_id: newModuleId,
      order_index: orderIndex,
    })
    .eq('id', lessonId)
    .select()
    .single()

  if (error) throw error
  return data
}

export function useCreateLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
    },
  })
}

export function useUpdateLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateLessonRequest & { id: string }) =>
      updateLesson(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.lesson(variables.id),
      })
    },
  })
}

export function useDeleteLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
    },
  })
}

export function useReorderLessons() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reorderLessons,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
    },
  })
}

export function useMoveLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ lessonId, newModuleId }: { lessonId: string; newModuleId: string }) =>
      moveLesson(lessonId, newModuleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
    },
  })
}

// ============================================
// MATERIAL MUTATIONS
// ============================================

async function createMaterial(input: CreateMaterialRequest): Promise<LessonMaterial> {
  // Get the next order_index
  const { data: existingMaterials } = await supabase
    .from('lesson_materials')
    .select('order_index')
    .eq('lesson_id', input.lesson_id)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = existingMaterials?.[0]?.order_index ?? -1
  const orderIndex = nextIndex + 1

  const { data, error } = await supabase
    .from('lesson_materials')
    .insert({
      lesson_id: input.lesson_id,
      title: input.title,
      type: input.type,
      url: input.url,
      order_index: orderIndex,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteMaterial(materialId: string): Promise<void> {
  const { error } = await supabase
    .from('lesson_materials')
    .delete()
    .eq('id', materialId)

  if (error) throw error
}

async function reorderMaterials(items: ReorderItem[]): Promise<void> {
  for (const item of items) {
    const { error } = await supabase
      .from('lesson_materials')
      .update({ order_index: item.order_index })
      .eq('id', item.id)

    if (error) throw error
  }
}

export function useCreateMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createMaterial,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.lesson(data.lesson_id),
      })
    },
  })
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
    },
  })
}

export function useReorderMaterials() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reorderMaterials,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
    },
  })
}

// ============================================
// PROGRESS MUTATIONS
// ============================================

async function updateLessonProgress(
  userId: string,
  lessonId: string,
  watchTimeSeconds: number
): Promise<LessonProgress> {
  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        last_watched_at: new Date().toISOString(),
        watch_time_seconds: watchTimeSeconds,
      },
      {
        onConflict: 'user_id,lesson_id',
      }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

async function markLessonCompleted(
  userId: string,
  lessonId: string
): Promise<LessonProgress> {
  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        completed_at: new Date().toISOString(),
        last_watched_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,lesson_id',
      }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

async function unmarkLessonCompleted(
  userId: string,
  lessonId: string
): Promise<void> {
  const { error } = await supabase
    .from('lesson_progress')
    .update({ completed_at: null })
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)

  if (error) throw error
}

export function useUpdateLessonProgress() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: ({ lessonId, watchTimeSeconds }: { lessonId: string; watchTimeSeconds: number }) =>
      updateLessonProgress(user!.id, lessonId, watchTimeSeconds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.lessonProgress(user!.id, variables.lessonId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.progress(),
      })
    },
  })
}

export function useMarkLessonCompleted() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: (lessonId: string) => markLessonCompleted(user!.id, lessonId),
    onSuccess: (_, lessonId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.lessonProgress(user!.id, lessonId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.progress(),
      })
    },
  })
}

export function useUnmarkLessonCompleted() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: (lessonId: string) => unmarkLessonCompleted(user!.id, lessonId),
    onSuccess: (_, lessonId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.lessonProgress(user!.id, lessonId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.progress(),
      })
    },
  })
}

// ============================================
// STORAGE MUTATIONS
// ============================================

async function uploadThumbnail(
  courseId: string,
  file: File
): Promise<string> {
  const extension = file.name.split('.').pop()
  const path = `thumbnails/${courseId}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('courses')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage
    .from('courses')
    .getPublicUrl(path)

  return urlData.publicUrl
}

async function uploadMaterial(
  lessonId: string,
  file: File
): Promise<string> {
  const path = `materials/${lessonId}/${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('courses')
    .upload(path, file, {
      cacheControl: '3600',
    })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage
    .from('courses')
    .getPublicUrl(path)

  return urlData.publicUrl
}

async function deleteFile(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from('courses')
    .remove([path])

  if (error) throw error
}

export function useUploadThumbnail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ courseId, file }: { courseId: string; file: File }) =>
      uploadThumbnail(courseId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
    },
  })
}

export function useUploadMaterial() {
  return useMutation({
    mutationFn: ({ lessonId, file }: { lessonId: string; file: File }) =>
      uploadMaterial(lessonId, file),
  })
}

export function useDeleteFile() {
  return useMutation({
    mutationFn: deleteFile,
  })
}
