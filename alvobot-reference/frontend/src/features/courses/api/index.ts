// Courses API - Barrel exports
// Feature: 027-courses-system

// Queries
export {
  // User queries
  useCoursesQuery,
  useCourseQuery,
  useLessonQuery,
  useUserProgressQuery,
  useCourseProgressQuery,
  useLessonProgressQuery,
  useLessonsProgressQuery,
  // Admin queries
  useAdminCoursesQuery,
  useAdminCourseQuery,
} from './queries'

// Mutations
export {
  // Course mutations
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
  useReorderCourses,
  // Module mutations
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useReorderModules,
  // Lesson mutations
  useCreateLesson,
  useUpdateLesson,
  useDeleteLesson,
  useReorderLessons,
  useMoveLesson,
  // Material mutations
  useCreateMaterial,
  useDeleteMaterial,
  useReorderMaterials,
  // Progress mutations
  useUpdateLessonProgress,
  useMarkLessonCompleted,
  useUnmarkLessonCompleted,
  // Storage mutations
  useUploadThumbnail,
  useUploadMaterial,
  useDeleteFile,
} from './mutations'
