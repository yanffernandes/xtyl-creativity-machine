// Types for Courses System
// Feature: 027-courses-system

export type CourseStatus = 'draft' | 'published';
export type VisibilityType = 'public' | 'by_plan' | 'by_user' | 'private';
export type MaterialType = 'link' | 'file' | 'document';

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  status: CourseStatus;
  visibility_type: VisibilityType;
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
  visibility_override: VisibilityType | null;
  plan_ids_override: number[] | null;
  user_ids_override: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CourseModuleWithLessons extends CourseModule {
  lessons: Lesson[];
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

export interface LessonWithMaterials extends Lesson {
  lesson_materials: LessonMaterial[];
}

export interface LessonMaterial {
  id: string;
  lesson_id: string;
  title: string;
  type: MaterialType;
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

// Request types
export interface CreateCourseRequest {
  title: string;
  description?: string;
  thumbnail_url?: string;
  visibility_type?: VisibilityType;
  plan_ids?: number[];
  user_ids?: string[];
}

export interface UpdateCourseRequest {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  visibility_type?: VisibilityType;
  plan_ids?: number[];
  user_ids?: string[];
  status?: CourseStatus;
}

export interface CreateModuleRequest {
  course_id: string;
  title: string;
  description?: string;
}

export interface UpdateModuleRequest {
  title?: string;
  description?: string;
  visibility_override?: VisibilityType | null;
  plan_ids_override?: number[] | null;
  user_ids_override?: string[] | null;
}

export interface CreateLessonRequest {
  module_id: string;
  title: string;
  description?: string;
  youtube_url: string;
  duration_minutes?: number;
  is_free_preview?: boolean;
}

export interface UpdateLessonRequest {
  title?: string;
  description?: string;
  youtube_url?: string;
  duration_minutes?: number;
  is_free_preview?: boolean;
}

export interface CreateMaterialRequest {
  lesson_id: string;
  title: string;
  type: MaterialType;
  url: string;
}

export interface ReorderItem {
  id: string;
  order_index: number;
}

export interface MarkProgressRequest {
  lesson_id: string;
  watch_time_seconds?: number;
  completed?: boolean;
}

// Course with full nested data
export interface CourseWithModules extends Course {
  course_modules: CourseModuleWithLessons[];
}

// Filter types
export interface CourseFilters {
  status?: CourseStatus;
  visibility_type?: VisibilityType;
  search?: string;
}

export interface UserCourseFilters {
  filter?: 'all' | 'in_progress' | 'completed';
}
