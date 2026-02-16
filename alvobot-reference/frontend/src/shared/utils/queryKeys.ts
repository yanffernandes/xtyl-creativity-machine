// TanStack Query key factory for consistent cache management

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFilters = Record<string, any>

export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },

  // Projects
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters: AnyFilters, workspaceId?: string) =>
      [...queryKeys.projects.lists(), { ...filters, workspaceId }] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.projects.details(), id] as const,
    stats: () => [...queryKeys.projects.all, 'stats'] as const,
  },

  // Articles
  articles: {
    all: ['articles'] as const,
    lists: () => [...queryKeys.articles.all, 'list'] as const,
    list: (filters: AnyFilters, workspaceId?: string) =>
      [...queryKeys.articles.lists(), { ...filters, workspaceId }] as const,
    details: () => [...queryKeys.articles.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.articles.details(), id] as const,
  },

  // Tasks
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: AnyFilters, workspaceId?: string) =>
      [...queryKeys.tasks.lists(), { ...filters, workspaceId }] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
    byDate: (date: string, workspaceId?: string) =>
      [...queryKeys.tasks.all, 'byDate', date, workspaceId] as const,
  },

  // Keywords
  keywords: {
    all: ['keywords'] as const,
    lists: () => [...queryKeys.keywords.all, 'list'] as const,
    list: (filters: AnyFilters, workspaceId?: string) =>
      [...queryKeys.keywords.lists(), { ...filters, workspaceId }] as const,
    details: () => [...queryKeys.keywords.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.keywords.details(), id] as const,
  },

  // Flows
  flows: {
    all: ['flows'] as const,
    lists: () => [...queryKeys.flows.all, 'list'] as const,
    list: (filters: AnyFilters, workspaceId?: string) =>
      [...queryKeys.flows.lists(), { ...filters, workspaceId }] as const,
    details: () => [...queryKeys.flows.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.flows.details(), id] as const,
  },

  // Runs
  runs: {
    all: ['runs'] as const,
    lists: () => [...queryKeys.runs.all, 'list'] as const,
    list: (filters: AnyFilters, workspaceId?: string) =>
      [...queryKeys.runs.lists(), { ...filters, workspaceId }] as const,
    details: () => [...queryKeys.runs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.runs.details(), id] as const,
  },

  // Connections
  connections: {
    all: ['connections'] as const,
    lists: () => [...queryKeys.connections.all, 'list'] as const,
    list: (filters: AnyFilters, workspaceId?: string) =>
      [...queryKeys.connections.lists(), { ...filters, workspaceId }] as const,
    details: () => [...queryKeys.connections.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.connections.details(), id] as const,
    stats: (workspaceId?: string) => [...queryKeys.connections.all, 'stats', workspaceId] as const,
    needingReconnect: (workspaceId: string) =>
      [...queryKeys.connections.all, 'needingReconnect', workspaceId] as const,
  },

  // Search Console
  searchConsole: {
    all: ['search-console'] as const,
    status: (workspaceId?: string, urls?: string[], connectionId?: string) =>
      [...queryKeys.searchConsole.all, 'status', workspaceId, connectionId, urls || []] as const,
    quota: (workspaceId?: string, connectionId?: string) =>
      [...queryKeys.searchConsole.all, 'quota', workspaceId, connectionId] as const,
  },

  // Users (admin)
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: AnyFilters) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    metrics: () => [...queryKeys.dashboard.all, 'metrics'] as const,
    recentActivity: () => [...queryKeys.dashboard.all, 'recentActivity'] as const,
    stats: (userId: string, workspaceId?: string) => [...queryKeys.dashboard.all, 'stats', userId, workspaceId] as const,
    activity: (userId: string, workspaceId?: string) => [...queryKeys.dashboard.all, 'activity', userId, workspaceId] as const,
  },

  // Calendar
  calendar: {
    all: ['calendar'] as const,
    events: (filters: AnyFilters, workspaceId?: string) =>
      [...queryKeys.calendar.all, 'events', { ...filters, workspaceId }] as const,
  },

  // Base Structure (4 Layers)
  baseStructure: {
    all: ['baseStructure'] as const,
    details: () => [...queryKeys.baseStructure.all, 'detail'] as const,
    detail: (projectId: number) => [...queryKeys.baseStructure.details(), projectId] as const,
    categories: (projectId: number) => [...queryKeys.baseStructure.all, 'categories', projectId] as const,
    authors: (projectId: number) => [...queryKeys.baseStructure.all, 'authors', projectId] as const,
  },

  // Triggers
  triggers: {
    all: ['triggers'] as const,
    lists: () => [...queryKeys.triggers.all, 'list'] as const,
    list: (workspaceId: string | null, filters: AnyFilters) =>
      [...queryKeys.triggers.lists(), workspaceId, filters] as const,
    details: () => [...queryKeys.triggers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.triggers.details(), id] as const,
  },

  // Meta Ads
  metaAds: {
    all: ['metaAds'] as const,
    pages: (workspaceId?: string) => [...queryKeys.metaAds.all, 'pages', workspaceId] as const,
    campaigns: (filters: AnyFilters, workspaceId?: string) =>
      [...queryKeys.metaAds.all, 'campaigns', filters, workspaceId] as const,
    stats: (workspaceId?: string) => [...queryKeys.metaAds.all, 'stats', workspaceId] as const,
  },

  // Meta Pages
  metaPages: {
    all: ['metaPages'] as const,
    lists: () => [...queryKeys.metaPages.all, 'list'] as const,
    list: (filters: AnyFilters) => [...queryKeys.metaPages.lists(), filters] as const,
    active: (workspaceId?: string) => [...queryKeys.metaPages.all, 'active', workspaceId] as const,
  },

  // User Plan/Subscription
  userPlan: {
    all: ['userPlan'] as const,
    current: (userId: string) => [...queryKeys.userPlan.all, 'current', userId] as const,
    credits: (userId: string) => [...queryKeys.userPlan.all, 'credits', userId] as const,
  },

  // Workspaces
  workspaces: {
    all: ['workspaces'] as const,
    lists: () => [...queryKeys.workspaces.all, 'list'] as const,
    list: (filters: AnyFilters) => [...queryKeys.workspaces.lists(), filters] as const,
    details: () => [...queryKeys.workspaces.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.workspaces.details(), id] as const,
    members: (workspaceId: string) => [...queryKeys.workspaces.all, 'members', workspaceId] as const,
    invitations: (workspaceId: string) => [...queryKeys.workspaces.all, 'invitations', workspaceId] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (filters: AnyFilters) => [...queryKeys.notifications.lists(), filters] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'] as const,
  },

  // User Settings
  settings: {
    all: ['settings'] as const,
    user: () => [...queryKeys.settings.all, 'user'] as const,
  },

  // Credits
  credits: {
    all: ['credits'] as const,
    balance: (workspaceId?: string) => [...queryKeys.credits.all, 'balance', workspaceId] as const,
    transactions: (filters: AnyFilters, workspaceId?: string) =>
      [...queryKeys.credits.all, 'transactions', filters, workspaceId] as const,
    // Extra Credits (Feature 032)
    summary: (userId: string) => [...queryKeys.credits.all, 'summary', userId] as const,
    summaryV2: (userId: string) => [...queryKeys.credits.all, 'summary-v2', userId] as const,
    packages: (userId: string) => [...queryKeys.credits.all, 'packages', userId] as const,
    history: (userId: string, filters?: AnyFilters) => [...queryKeys.credits.all, 'history', userId, filters] as const,
    // Admin extra credits
    adminDashboard: () => [...queryKeys.credits.all, 'admin-dashboard'] as const,
    adminRecentTransactions: (filters?: AnyFilters) => [...queryKeys.credits.all, 'admin-recent', filters] as const,
    adminUserCredits: (userId: string) => [...queryKeys.credits.all, 'admin-user', userId] as const,
  },

  // Bug Reports
  bugReports: {
    all: ['bug-reports'] as const,
    lists: () => [...queryKeys.bugReports.all, 'list'] as const,
    list: (filters?: AnyFilters) => [...queryKeys.bugReports.lists(), filters] as const,
    details: () => [...queryKeys.bugReports.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.bugReports.details(), id] as const,
  },

  // Bug Report Settings
  bugReportSettings: {
    all: ['bug-report-settings'] as const,
    current: () => [...queryKeys.bugReportSettings.all, 'current'] as const,
  },

  // Google Ads Transparency
  googleAdsTransparency: {
    all: ['google-ads-transparency'] as const,
    lists: () => [...queryKeys.googleAdsTransparency.all, 'list'] as const,
    list: (filters: AnyFilters, page: number, limit: number) =>
      [...queryKeys.googleAdsTransparency.lists(), { filters, page, limit }] as const,
    details: () => [...queryKeys.googleAdsTransparency.all, 'detail'] as const,
    detail: (creativeId: string) => [...queryKeys.googleAdsTransparency.details(), creativeId] as const,
    advertisers: () => [...queryKeys.googleAdsTransparency.all, 'advertisers'] as const,
    advertiserOptions: () => [...queryKeys.googleAdsTransparency.all, 'advertiser-options'] as const,
    formatOptions: () => [...queryKeys.googleAdsTransparency.all, 'format-options'] as const,
  },

  // Google Ads Dashboard (Feature 025)
  googleAdsDashboard: {
    all: ['google-ads-dashboard'] as const,
    // Campaign metrics
    campaigns: () => [...queryKeys.googleAdsDashboard.all, 'campaigns'] as const,
    campaignList: (connectionId: string, filters: AnyFilters, workspaceId?: string) =>
      [...queryKeys.googleAdsDashboard.campaigns(), connectionId, filters, workspaceId] as const,
    // Automation rules
    automations: () => [...queryKeys.googleAdsDashboard.all, 'automations'] as const,
    automationList: (connectionId: string) =>
      [...queryKeys.googleAdsDashboard.automations(), 'list', connectionId] as const,
    automationDetail: (ruleId: string) =>
      [...queryKeys.googleAdsDashboard.automations(), 'detail', ruleId] as const,
    automationTest: (ruleId: string) =>
      [...queryKeys.googleAdsDashboard.automations(), 'test', ruleId] as const,
    // Action history
    history: () => [...queryKeys.googleAdsDashboard.all, 'history'] as const,
    actionHistory: (connectionId: string, filters: AnyFilters) =>
      [...queryKeys.googleAdsDashboard.history(), 'actions', connectionId, filters] as const,
    actionDetail: (actionId: string) =>
      [...queryKeys.googleAdsDashboard.history(), 'action', actionId] as const,
    actionStats: (connectionId: string, filters: AnyFilters) =>
      [...queryKeys.googleAdsDashboard.history(), 'stats', connectionId, filters] as const,
    // Notifications
    notifications: () => [...queryKeys.googleAdsDashboard.all, 'notifications'] as const,
    unreadNotifications: () =>
      [...queryKeys.googleAdsDashboard.notifications(), 'unread'] as const,
  },

  // Ad Manager Dashboard (Feature 026)
  adManagerDashboard: {
    all: ['ad-manager-dashboard'] as const,
    // Networks
    networks: () => [...queryKeys.adManagerDashboard.all, 'networks'] as const,
    networkList: (connectionId: string) =>
      [...queryKeys.adManagerDashboard.networks(), connectionId] as const,
    // Site analysis
    siteAnalysis: () => [...queryKeys.adManagerDashboard.all, 'site-analysis'] as const,
    siteAnalysisList: (connectionId: string, networkId: string, filters: AnyFilters) =>
      [...queryKeys.adManagerDashboard.siteAnalysis(), connectionId, networkId, filters] as const,
    // Expand levels (lazy loading)
    expand: () => [...queryKeys.adManagerDashboard.all, 'expand'] as const,
    expandDate: (connectionId: string, networkId: string, site: string, filters: AnyFilters) =>
      [...queryKeys.adManagerDashboard.expand(), 'date', connectionId, networkId, site, filters] as const,
    expandUri: (connectionId: string, networkId: string, site: string, date: string, filters: AnyFilters) =>
      [...queryKeys.adManagerDashboard.expand(), 'uri', connectionId, networkId, site, date, filters] as const,
    // Config status
    configStatus: () => [...queryKeys.adManagerDashboard.all, 'config-status'] as const,
    // Consolidated metrics (for Google Ads dashboard integration)
    consolidatedMetrics: () => [...queryKeys.adManagerDashboard.all, 'consolidated-metrics'] as const,
    consolidatedMetricsList: (connectionId: string, networkId: string, filters: AnyFilters) =>
      [...queryKeys.adManagerDashboard.consolidatedMetrics(), connectionId, networkId, filters] as const,
  },

  // Courses (Feature 027)
  courses: {
    all: ['courses'] as const,
    // User-facing queries
    lists: () => [...queryKeys.courses.all, 'list'] as const,
    list: (filters: AnyFilters) => [...queryKeys.courses.lists(), filters] as const,
    details: () => [...queryKeys.courses.all, 'detail'] as const,
    detail: (slug: string) => [...queryKeys.courses.details(), slug] as const,
    // Progress tracking
    progress: () => [...queryKeys.courses.all, 'progress'] as const,
    userProgress: (userId: string) => [...queryKeys.courses.progress(), userId] as const,
    courseProgress: (courseId: string) => [...queryKeys.courses.progress(), 'course', courseId] as const,
    // Lessons
    lessons: () => [...queryKeys.courses.all, 'lessons'] as const,
    lesson: (lessonId: string) => [...queryKeys.courses.lessons(), lessonId] as const,
    lessonProgress: (userId: string, lessonId: string) =>
      [...queryKeys.courses.lessons(), 'progress', userId, lessonId] as const,
    // Admin queries
    admin: () => [...queryKeys.courses.all, 'admin'] as const,
    adminList: (filters: AnyFilters) => [...queryKeys.courses.admin(), 'list', filters] as const,
    adminDetail: (id: string) => [...queryKeys.courses.admin(), 'detail', id] as const,
  },

  // Menu Visibility (Feature 029)
  menuVisibility: {
    all: ['menu-visibility'] as const,
    // User visibility (from view)
    user: () => [...queryKeys.menuVisibility.all, 'user'] as const,
    // Admin config
    config: () => [...queryKeys.menuVisibility.all, 'config'] as const,
    configList: () => [...queryKeys.menuVisibility.config(), 'list'] as const,
    configDetail: (menuItemKey: string) =>
      [...queryKeys.menuVisibility.config(), 'detail', menuItemKey] as const,
    // Preview
    preview: () => [...queryKeys.menuVisibility.all, 'preview'] as const,
    previewByPlan: (planId: number | null) =>
      [...queryKeys.menuVisibility.preview(), planId] as const,
  },

  // Unified Ads Dashboard (Feature 031)
  unifiedAds: {
    all: ['unified-ads'] as const,
    // Campaigns
    campaigns: () => [...queryKeys.unifiedAds.all, 'campaigns'] as const,
    campaignList: (platforms: string[], filters: AnyFilters, workspaceId?: string) =>
      [...queryKeys.unifiedAds.campaigns(), platforms.join(','), filters, workspaceId] as const,
    // Metrics
    metrics: () => [...queryKeys.unifiedAds.all, 'metrics'] as const,
    metricsSummary: (platforms: string[], filters: AnyFilters, workspaceId?: string) =>
      [...queryKeys.unifiedAds.metrics(), platforms.join(','), filters, workspaceId] as const,
    // Automations
    automations: () => [...queryKeys.unifiedAds.all, 'automations'] as const,
    automationList: (platforms: string[], connectionId?: string, workspaceId?: string) =>
      [...queryKeys.unifiedAds.automations(), platforms.join(','), connectionId, workspaceId] as const,
    // History
    history: () => [...queryKeys.unifiedAds.all, 'history'] as const,
    historyList: (platforms: string[], filters: AnyFilters, workspaceId?: string) =>
      [...queryKeys.unifiedAds.history(), platforms.join(','), filters, workspaceId] as const,
  },

  // PageSpeed Insights
  pagespeed: {
    all: ['pagespeed'] as const,
    history: (projectId: number, strategy?: string) =>
      [...queryKeys.pagespeed.all, 'history', projectId, strategy] as const,
    latest: (projectId: number, strategy?: string) =>
      [...queryKeys.pagespeed.all, 'latest', projectId, strategy] as const,
    quota: (workspaceId: string) =>
      [...queryKeys.pagespeed.all, 'quota', workspaceId] as const,
  },
}
