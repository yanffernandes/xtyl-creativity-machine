# API Contracts: Sistema de Cursos e Aulas

**Feature**: 027-courses-system
**Date**: 2025-01-15

## Overview

Este sistema utiliza acesso direto ao Supabase via RLS para a maioria das operações. O backend NestJS é usado apenas para operações que requerem lógica complexa ou validações server-side.

## Supabase Direct Access (Frontend)

### Courses

#### List Courses (User)
```typescript
// Query accessible courses with progress
const { data } = await supabase
  .from('courses')
  .select(`
    id,
    title,
    slug,
    description,
    thumbnail_url,
    course_modules (
      id,
      title,
      lessons (id)
    )
  `)
  .eq('status', 'published')
  .order('order_index');

// With progress from view
const { data: progress } = await supabase
  .from('user_course_progress')
  .select('*');
```

#### List Courses (Admin)
```typescript
const { data } = await supabase
  .from('courses_with_stats')
  .select('*')
  .order('created_at', { ascending: false });
```

#### Get Course by Slug
```typescript
const { data } = await supabase
  .from('courses')
  .select(`
    *,
    course_modules (
      *,
      lessons (
        id,
        title,
        duration_minutes,
        is_free_preview,
        order_index
      )
    )
  `)
  .eq('slug', slug)
  .single();
```

#### Create Course (Admin)
```typescript
const { data, error } = await supabase
  .from('courses')
  .insert({
    title,
    slug: generateSlug(title),
    description,
    thumbnail_url,
    visibility_type,
    plan_ids,
    user_ids,
    created_by: userId
  })
  .select()
  .single();
```

#### Update Course (Admin)
```typescript
const { data, error } = await supabase
  .from('courses')
  .update({
    title,
    description,
    thumbnail_url,
    visibility_type,
    plan_ids,
    user_ids,
    status
  })
  .eq('id', courseId)
  .select()
  .single();
```

#### Delete Course (Admin)
```typescript
const { error } = await supabase
  .from('courses')
  .delete()
  .eq('id', courseId);
```

### Modules

#### Create Module
```typescript
const { data, error } = await supabase
  .from('course_modules')
  .insert({
    course_id: courseId,
    title,
    description,
    order_index: nextIndex
  })
  .select()
  .single();
```

#### Update Module
```typescript
const { data, error } = await supabase
  .from('course_modules')
  .update({ title, description })
  .eq('id', moduleId)
  .select()
  .single();
```

#### Reorder Modules
```typescript
// Batch update order_index
const updates = modules.map((m, index) => ({
  id: m.id,
  order_index: index
}));

for (const update of updates) {
  await supabase
    .from('course_modules')
    .update({ order_index: update.order_index })
    .eq('id', update.id);
}
```

#### Delete Module
```typescript
const { error } = await supabase
  .from('course_modules')
  .delete()
  .eq('id', moduleId);
```

### Lessons

#### Create Lesson
```typescript
const { data, error } = await supabase
  .from('lessons')
  .insert({
    module_id: moduleId,
    title,
    description,
    youtube_url: url,
    youtube_video_id: extractYouTubeId(url),
    duration_minutes,
    order_index: nextIndex,
    is_free_preview
  })
  .select()
  .single();
```

#### Get Lesson with Materials
```typescript
const { data } = await supabase
  .from('lessons')
  .select(`
    *,
    lesson_materials (*)
  `)
  .eq('id', lessonId)
  .single();
```

#### Update Lesson
```typescript
const { data, error } = await supabase
  .from('lessons')
  .update({
    title,
    description,
    youtube_url,
    youtube_video_id: extractYouTubeId(youtube_url),
    duration_minutes,
    is_free_preview
  })
  .eq('id', lessonId)
  .select()
  .single();
```

#### Move Lesson to Another Module
```typescript
const { error } = await supabase
  .from('lessons')
  .update({
    module_id: newModuleId,
    order_index: nextIndexInNewModule
  })
  .eq('id', lessonId);
```

#### Delete Lesson
```typescript
const { error } = await supabase
  .from('lessons')
  .delete()
  .eq('id', lessonId);
```

### Lesson Materials

#### Add Material
```typescript
const { data, error } = await supabase
  .from('lesson_materials')
  .insert({
    lesson_id: lessonId,
    title,
    type, // 'link' | 'file' | 'document'
    url,
    order_index: nextIndex
  })
  .select()
  .single();
```

#### Delete Material
```typescript
const { error } = await supabase
  .from('lesson_materials')
  .delete()
  .eq('id', materialId);
```

### Progress Tracking

#### Mark Lesson Progress
```typescript
const { data, error } = await supabase
  .from('lesson_progress')
  .upsert({
    user_id: userId,
    lesson_id: lessonId,
    last_watched_at: new Date().toISOString(),
    watch_time_seconds: watchTime
  }, {
    onConflict: 'user_id,lesson_id'
  })
  .select()
  .single();
```

#### Mark Lesson Completed
```typescript
const { data, error } = await supabase
  .from('lesson_progress')
  .upsert({
    user_id: userId,
    lesson_id: lessonId,
    completed_at: new Date().toISOString(),
    last_watched_at: new Date().toISOString()
  }, {
    onConflict: 'user_id,lesson_id'
  })
  .select()
  .single();
```

#### Unmark Lesson Completed
```typescript
const { error } = await supabase
  .from('lesson_progress')
  .update({ completed_at: null })
  .eq('user_id', userId)
  .eq('lesson_id', lessonId);
```

#### Get User Progress for Course
```typescript
const { data } = await supabase
  .from('lesson_progress')
  .select('lesson_id, completed_at, last_watched_at')
  .eq('user_id', userId)
  .in('lesson_id', lessonIds);
```

### Storage

#### Upload Thumbnail
```typescript
const { data, error } = await supabase.storage
  .from('courses')
  .upload(`thumbnails/${courseId}.${extension}`, file, {
    cacheControl: '3600',
    upsert: true
  });

// Get public URL
const { data: urlData } = supabase.storage
  .from('courses')
  .getPublicUrl(`thumbnails/${courseId}.${extension}`);
```

#### Upload Material File
```typescript
const { data, error } = await supabase.storage
  .from('courses')
  .upload(`materials/${lessonId}/${filename}`, file, {
    cacheControl: '3600'
  });
```

#### Delete File
```typescript
const { error } = await supabase.storage
  .from('courses')
  .remove([path]);
```

## TypeScript Types

```typescript
// Types for frontend
export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  status: 'draft' | 'published';
  visibility_type: 'public' | 'by_plan' | 'by_user' | 'private';
  plan_ids: number[];
  user_ids: string[];
  order_index: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CourseWithStats extends Course {
  modules_count: number;
  lessons_count: number;
  total_duration_minutes: number;
  enrolled_users_count: number;
  completions_count: number;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  visibility_override: 'public' | 'by_plan' | 'by_user' | null;
  plan_ids_override: number[] | null;
  user_ids_override: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  youtube_video_id: string | null;
  duration_minutes: number | null;
  order_index: number;
  is_free_preview: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonMaterial {
  id: string;
  lesson_id: string;
  title: string;
  type: 'link' | 'file' | 'document';
  url: string;
  order_index: number;
  created_at: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string | null;
  last_watched_at: string;
  watch_time_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface UserCourseProgress {
  course_id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  description: string | null;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
  last_activity: string | null;
}

// Request/Response types
export interface CreateCourseRequest {
  title: string;
  description?: string;
  thumbnail_url?: string;
  visibility_type?: Course['visibility_type'];
  plan_ids?: number[];
  user_ids?: string[];
}

export interface UpdateCourseRequest {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  visibility_type?: Course['visibility_type'];
  plan_ids?: number[];
  user_ids?: string[];
  status?: Course['status'];
}

export interface CreateModuleRequest {
  course_id: string;
  title: string;
  description?: string;
}

export interface CreateLessonRequest {
  module_id: string;
  title: string;
  description?: string;
  youtube_url: string;
  duration_minutes?: number;
  is_free_preview?: boolean;
}

export interface ReorderRequest {
  items: Array<{ id: string; order_index: number }>;
}

export interface MarkProgressRequest {
  lesson_id: string;
  watch_time_seconds?: number;
  completed?: boolean;
}
```

## Query Keys (TanStack Query)

```typescript
export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  list: (filters: CourseFilters) => [...courseKeys.lists(), filters] as const,
  details: () => [...courseKeys.all, 'detail'] as const,
  detail: (slug: string) => [...courseKeys.details(), slug] as const,
  progress: () => [...courseKeys.all, 'progress'] as const,
  userProgress: (userId: string) => [...courseKeys.progress(), userId] as const,

  // Admin
  admin: () => [...courseKeys.all, 'admin'] as const,
  adminList: () => [...courseKeys.admin(), 'list'] as const,
  adminDetail: (id: string) => [...courseKeys.admin(), 'detail', id] as const,
};

export const lessonKeys = {
  all: ['lessons'] as const,
  detail: (id: string) => [...lessonKeys.all, 'detail', id] as const,
  progress: (userId: string, lessonId: string) =>
    [...lessonKeys.all, 'progress', userId, lessonId] as const,
};
```

## Error Handling

```typescript
// Standard error responses
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Common error codes
const ErrorCodes = {
  COURSE_NOT_FOUND: 'COURSE_NOT_FOUND',
  MODULE_NOT_FOUND: 'MODULE_NOT_FOUND',
  LESSON_NOT_FOUND: 'LESSON_NOT_FOUND',
  ACCESS_DENIED: 'ACCESS_DENIED',
  INVALID_YOUTUBE_URL: 'INVALID_YOUTUBE_URL',
  COURSE_NOT_EMPTY: 'COURSE_NOT_EMPTY', // Can't publish empty course
  DUPLICATE_SLUG: 'DUPLICATE_SLUG',
} as const;
```
