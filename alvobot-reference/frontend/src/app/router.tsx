import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { Spinner } from '@/shared/components'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { MainLayout } from '@/shared/layouts/MainLayout'

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('@/features/auth/pages/SignupPage').then(m => ({ default: m.SignupPage })))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))

// Admin pages (lazy loaded)
const AdminLayout = lazy(() => import('@/features/admin/components/AdminLayout').then(m => ({ default: m.AdminLayout })))
const AdminProtectedRoute = lazy(() => import('@/features/admin/components/AdminProtectedRoute').then(m => ({ default: m.AdminProtectedRoute })))
const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const AdminUsersPage = lazy(() => import('@/features/admin/pages/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminSubscriptionsPage = lazy(() => import('@/features/admin/pages/AdminSubscriptionsPage').then(m => ({ default: m.AdminSubscriptionsPage })))
const AdminSettingsPage = lazy(() => import('@/features/admin/pages/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })))
const AdminAdminsPage = lazy(() => import('@/features/admin/pages/AdminAdminsPage').then(m => ({ default: m.AdminAdminsPage })))
const AdminWorkspacesPage = lazy(() => import('@/features/admin/pages/AdminWorkspacesPage').then(m => ({ default: m.AdminWorkspacesPage })))
const AdminPlansPage = lazy(() => import('@/features/admin/pages/AdminPlansPage').then(m => ({ default: m.AdminPlansPage })))
const AdminAuditPage = lazy(() => import('@/features/admin/pages/AdminAuditPage').then(m => ({ default: m.AdminAuditPage })))
const AdminSystemPromptsPage = lazy(() => import('@/features/admin/pages/AdminSystemPromptsPage').then(m => ({ default: m.AdminSystemPromptsPage })))
const AdminGoogleAdsPage = lazy(() => import('@/features/admin/pages/AdminGoogleAdsPage').then(m => ({ default: m.AdminGoogleAdsPage })))
// Admin Courses (Feature 027)
const AdminCoursesPage = lazy(() => import('@/features/admin/pages/courses/AdminCoursesPage').then(m => ({ default: m.AdminCoursesPage })))
const AdminCourseEditorPage = lazy(() => import('@/features/admin/pages/courses/AdminCourseEditorPage').then(m => ({ default: m.AdminCourseEditorPage })))
// Admin Menu Visibility (Feature 029)
const AdminMenuVisibilityPage = lazy(() => import('@/features/admin/pages/AdminMenuVisibilityPage').then(m => ({ default: m.AdminMenuVisibilityPage })))
// Admin Credits (Feature 032)
const AdminCreditsPage = lazy(() => import('@/features/admin/pages/AdminCreditsPage').then(m => ({ default: m.AdminCreditsPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ProjectsPage = lazy(() => import('@/features/projects/pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })))
const ArticlesPage = lazy(() => import('@/features/articles/pages/ArticlesPage').then(m => ({ default: m.ArticlesPage })))
const ArticleEditPage = lazy(() => import('@/features/articles/pages/ArticleEditPage').then(m => ({ default: m.ArticleEditPage })))
const TasksPage = lazy(() => import('@/features/tasks/pages/TasksPage').then(m => ({ default: m.TasksPage })))
const CalendarPage = lazy(() => import('@/features/calendar/pages/CalendarPage').then(m => ({ default: m.CalendarPage })))
const FlowsPage = lazy(() => import('@/features/flows/pages/FlowsPage').then(m => ({ default: m.FlowsPage })))
const FlowEditorPage = lazy(() => import('@/features/flows/pages/FlowEditorPage').then(m => ({ default: m.FlowEditorPage })))
const KeywordsPage = lazy(() => import('@/features/keywords/pages/KeywordsPage').then(m => ({ default: m.KeywordsPage })))
const GoogleAdsTransparencyPage = lazy(() => import('@/features/google-ads-transparency/pages/GoogleAdsTransparencyPage').then(m => ({ default: m.GoogleAdsTransparencyPage })))
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const BaseStructureWizard = lazy(() => import('@/features/base-structure/pages/BaseStructureWizard').then(m => ({ default: m.BaseStructureWizard })))
// BaseArticlesPage removed - unified into ArticlesPage with ?type=base
const ConnectionsPage = lazy(() => import('@/features/connections/pages/ConnectionsPage').then(m => ({ default: m.ConnectionsPage })))
const MetaCallbackPage = lazy(() => import('@/features/connections/pages/MetaCallbackPage').then(m => ({ default: m.MetaCallbackPage })))
// Unified Google OAuth callback page - handles all Google services (AdSense, Ad Manager, Analytics, Search Console, Ads)
const GoogleCallbackPage = lazy(() => import('@/features/connections/pages/GoogleCallbackPage').then(m => ({ default: m.GoogleCallbackPage })))
const RunsPage = lazy(() => import('@/features/runs/pages/RunsPage').then(m => ({ default: m.RunsPage })))
const AlvoAdsMetaPage = lazy(() => import('@/features/alvoads-meta/pages/AlvoAdsMetaPage').then(m => ({ default: m.AlvoAdsMetaPage })))
// Legacy CampaignWizardPage removed - use MetaAdsWizardPage instead
const MetaAdsWizardPage = lazy(() => import('@/features/alvoads-meta/pages/MetaAdsWizardPage').then(m => ({ default: m.MetaAdsWizardPage })))
const CreativeLibraryPage = lazy(() => import('@/features/alvoads-meta/pages/CreativeLibraryPage').then(m => ({ default: m.CreativeLibraryPage })))
const TriggersPage = lazy(() => import('@/features/triggers/pages/TriggersPage').then(m => ({ default: m.TriggersPage })))
// ArrowArticlesPage removed - unified into ArticlesPage with ?type=arrow
const WorkspaceSettingsPage = lazy(() => import('@/features/workspace/pages/WorkspaceSettingsPage').then(m => ({ default: m.WorkspaceSettingsPage })))
const AcceptInvitationPage = lazy(() => import('@/features/workspace/pages/AcceptInvitationPage').then(m => ({ default: m.AcceptInvitationPage })))
const AlvoAdsGooglePage = lazy(() => import('@/features/alvoads-google/pages/AlvoAdsGooglePage').then(m => ({ default: m.AlvoAdsGooglePage })))
const GoogleAdsWizardPage = lazy(() => import('@/features/alvoads-google/pages/GoogleAdsWizardPage').then(m => ({ default: m.GoogleAdsWizardPage })))
const BulkLocationPage = lazy(() => import('@/features/alvoads-google/pages/BulkLocationPage').then(m => ({ default: m.BulkLocationPage })))
const SpreadsheetImportPage = lazy(() => import('@/features/alvoads-google/pages/SpreadsheetImportPage').then(m => ({ default: m.SpreadsheetImportPage })))
const DuplicateCampaignPage = lazy(() => import('@/features/alvoads-google/pages/DuplicateCampaignPage').then(m => ({ default: m.DuplicateCampaignPage })))
// Google Ads Dashboard (Feature 025) - Main page integrated into AlvoAdsGooglePage
const AutomationsPage = lazy(() => import('@/features/alvoads-google-dashboard/pages/AutomationsPage').then(m => ({ default: m.AutomationsPage })))
const ActionHistoryPage = lazy(() => import('@/features/alvoads-google-dashboard/pages/ActionHistoryPage').then(m => ({ default: m.ActionHistoryPage })))
const SubscriptionPage = lazy(() => import('@/features/subscription/pages/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })))
// Revenue Dashboard (Feature 026 + 028 AdSense)
const RevenueDashboardPage = lazy(() => import('@/features/revenue-dashboard/pages/AdManagerDashboardPage').then(m => ({ default: m.AdManagerDashboardPage })))
// Search Console Dashboard (legacy analytics)
const SearchConsoleDashboardPage = lazy(() => import('@/features/search-console-dashboard/pages/SearchConsoleDashboardPage').then(m => ({ default: m.SearchConsoleDashboardPage })))
// Search Console Indexing Monitor
const SearchConsoleIndexingPage = lazy(() => import('@/features/search-console-indexing/pages/SearchConsoleIndexingPage').then(m => ({ default: m.SearchConsoleIndexingPage })))
// Analytics Dashboard
const AnalyticsDashboardPage = lazy(() => import('@/features/analytics-dashboard/pages/AnalyticsDashboardPage').then(m => ({ default: m.AnalyticsDashboardPage })))
const TestFlowPage = lazy(() => import('@/pages/TestFlowPage').then(m => ({ default: m.TestFlowPage })))
const DesignSystemPage = lazy(() => import('@/features/design-system/pages/DesignSystemPage').then(m => ({ default: m.DesignSystemPage })))
// Unified Ads Dashboard (Feature 031) - Separate pages for better consistency
const AdsPerformancePage = lazy(() => import('@/features/ads-unified/pages/AdsPerformancePage').then(m => ({ default: m.AdsPerformancePage })))
const AdsDraftsPage = lazy(() => import('@/features/ads-unified/pages/AdsDraftsPage').then(m => ({ default: m.AdsDraftsPage })))
const AdsAutomationsPage = lazy(() => import('@/features/ads-unified/pages/AdsAutomationsPage').then(m => ({ default: m.AdsAutomationsPage })))
const AdsHistoryPage = lazy(() => import('@/features/ads-unified/pages/AdsHistoryPage').then(m => ({ default: m.AdsHistoryPage })))
// Courses (Feature 027)
const CoursesPage = lazy(() => import('@/features/courses/pages/CoursesPage').then(m => ({ default: m.CoursesPage })))
const CourseDetailPage = lazy(() => import('@/features/courses/pages/CourseDetailPage').then(m => ({ default: m.CourseDetailPage })))
const LessonPage = lazy(() => import('@/features/courses/pages/LessonPage').then(m => ({ default: m.LessonPage })))

// Placeholder pages for other routes
const PlaceholderPage = ({ title }: { title: string }) => (
  <div style={{ padding: '2rem' }}>
    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{title}</h1>
    <p style={{ color: '#6B7280' }}>Esta página está em desenvolvimento.</p>
  </div>
)

// Loading fallback
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Spinner size="lg" />
    </div>
  )
}

export function AppRouter() {
  const { initializeAuth } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Test route (public) */}
        <Route path="/teste" element={<TestFlowPage />} />

        {/* Design System (public for development) */}
        <Route path="/design-system" element={<DesignSystemPage />} />

        {/* Workspace invitation (public - users may not be logged in) */}
        <Route path="/workspace/invitations/:token" element={<AcceptInvitationPage />} />

        {/* OAuth callback routes (authenticated but no layout) */}
        <Route
          path="/callback/meta"
          element={
            <ProtectedRoute>
              <MetaCallbackPage />
            </ProtectedRoute>
          }
        />
        {/* Unified Google OAuth callback - handles all Google services */}
        <Route
          path="/callback/google"
          element={
            <ProtectedRoute>
              <GoogleCallbackPage />
            </ProtectedRoute>
          }
        />

        {/* Protected routes with main layout */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<PlaceholderPage title="Detalhes do Projeto" />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/articles/:id" element={<ArticleEditPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/flows" element={<FlowsPage />} />
          <Route path="/flows/:id" element={<FlowEditorPage />} />
          <Route path="/runs" element={<RunsPage />} />
          <Route path="/runs/:id" element={<PlaceholderPage title="Detalhes da Execução" />} />
          <Route path="/keywords" element={<KeywordsPage />} />
                    <Route path="/google-ads" element={<GoogleAdsTransparencyPage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="/base-structure" element={<BaseStructureWizard />} />
          {/* Legacy routes - redirect to unified articles page */}
          <Route path="/base-articles" element={<Navigate to="/articles?type=base" replace />} />
          <Route path="/arrow-articles" element={<Navigate to="/articles?type=arrow" replace />} />
          <Route path="/alvoads-meta" element={<AlvoAdsMetaPage />} />
          <Route path="/alvoads-meta/criar" element={<MetaAdsWizardPage />} />
          <Route path="/alvoads-meta/editar/:templateId" element={<MetaAdsWizardPage />} />
          <Route path="/alvoads-meta/wizard" element={<MetaAdsWizardPage />} />
          <Route path="/alvoads-meta/biblioteca" element={<CreativeLibraryPage />} />
          {/* Legacy route removed - redirects to new wizard */}
          <Route path="/alvoads-meta/legacy" element={<MetaAdsWizardPage />} />
          <Route path="/alvoads-google" element={<AlvoAdsGooglePage />} />
          <Route path="/alvoads-google/wizard" element={<GoogleAdsWizardPage />} />
          <Route path="/alvoads-google/bulk/location" element={<BulkLocationPage />} />
          <Route path="/alvoads-google/import" element={<SpreadsheetImportPage />} />
          <Route path="/alvoads-google/duplicate" element={<DuplicateCampaignPage />} />
          {/* Google Ads Dashboard (Feature 025) - Main dashboard integrated into /alvoads-google */}
          <Route path="/google-ads-dashboard" element={<Navigate to="/alvoads-google" replace />} />
          <Route path="/alvoads-google/automations" element={<AutomationsPage />} />
          <Route path="/alvoads-google/history" element={<ActionHistoryPage />} />
          {/* Revenue Dashboard (Feature 026 + 028 AdSense) */}
          <Route path="/revenue" element={<RevenueDashboardPage />} />
          {/* Search Console Indexing */}
          <Route path="/search-console" element={<SearchConsoleIndexingPage />} />
          <Route path="/search-console/analytics" element={<SearchConsoleDashboardPage />} />
          {/* Analytics Dashboard */}
          <Route path="/analytics" element={<AnalyticsDashboardPage />} />
          {/* Backwards compatibility redirects */}
          <Route path="/receita" element={<Navigate to="/revenue" replace />} />
          <Route path="/ad-manager" element={<Navigate to="/revenue" replace />} />
          <Route path="/triggers" element={<TriggersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/workspace" element={<WorkspaceSettingsPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/design-system" element={<DesignSystemPage />} />
          {/* Unified Ads Dashboard (Feature 031) - Separate pages */}
          <Route path="/ads" element={<AdsPerformancePage />} />
          <Route path="/ads/drafts" element={<AdsDraftsPage />} />
          <Route path="/ads/automations" element={<AdsAutomationsPage />} />
          <Route path="/ads/history" element={<AdsHistoryPage />} />
          {/* Courses (Feature 027) */}
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:slug" element={<CourseDetailPage />} />
          <Route path="/courses/:slug/lesson/:lessonId" element={<LessonPage />} />
        </Route>

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="workspaces" element={<AdminWorkspacesPage />} />
          <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="plans" element={<AdminPlansPage />} />
          <Route path="admins" element={<AdminAdminsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
          <Route path="system-prompts" element={<AdminSystemPromptsPage />} />
          <Route path="google-ads" element={<AdminGoogleAdsPage />} />
          {/* Courses (Feature 027) */}
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="courses/:id" element={<AdminCourseEditorPage />} />
          <Route path="reports" element={<PlaceholderPage title="Relatorios" />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          {/* Menu Visibility (Feature 029) */}
          <Route path="menu-visibility" element={<AdminMenuVisibilityPage />} />
          {/* Extra Credits (Feature 032) */}
          <Route path="credits" element={<AdminCreditsPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
