export interface CommonMessages {
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  create: string;
  search: string;
  loading: string;
  confirm: string;
  back: string;
  next: string;
  previous: string;
  close: string;
  open: string;
  yes: string;
  no: string;
  ok: string;
  retry: string;
  refresh: string;
  noResults: string;
  selectAll: string;
  deselectAll: string;
  actions: string;
  more: string;
  less: string;
  all: string;
  none: string;
  selected: string;
  copy: string;
  paste: string;
  download: string;
  upload: string;
  export: string;
  import: string;
}

export interface ProfileMessages {
  title: string;
  subtitle: string;
  personalInfo: string;
  fullName: string;
  email: string;
  newPassword: string;
  keepCurrentPassword: string;
  saveChanges: string;
  language: string;
  selectLanguage: string;
  updateSuccess: string;
  updateError: string;
}

export interface AuthMessages {
  login: string;
  logout: string;
  register: string;
  email: string;
  password: string;
  confirmPassword: string;
  forgotPassword: string;
  resetPassword: string;
  rememberMe: string;
  signIn: string;
  signUp: string;
  signOut: string;
  alreadyHaveAccount: string;
  dontHaveAccount: string;
}

export interface NavigationMessages {
  home: string;
  dashboard: string;
  projects: string;
  templates: string;
  workflows: string;
  settings: string;
  profile: string;
  aiUsage: string;
}

export interface WorkspaceMessages {
  title: string;
  create: string;
  settings: string;
  members: string;
  invite: string;
  leave: string;
  delete: string;
  noProjects: string;
}

export interface ProjectMessages {
  title: string;
  create: string;
  settings: string;
  documents: string;
  visualAssets: string;
  workflows: string;
  delete: string;
  archive: string;
}

export interface DocumentMessages {
  title: string;
  create: string;
  edit: string;
  delete: string;
  share: string;
  duplicate: string;
  export: string;
  untitled: string;
}

export interface WorkflowMessages {
  title: string;
  create: string;
  execute: string;
  stop: string;
  pause: string;
  resume: string;
  templates: string;
  executions: string;
  nodes: string;
  variables: string;
  running: string;
  completed: string;
  failed: string;
}

export interface ErrorMessages {
  generic: string;
  network: string;
  notFound: string;
  unauthorized: string;
  forbidden: string;
  serverError: string;
  timeout: string;
  tryAgain: string;
  contactSupport: string;
}

export interface ValidationMessages {
  required: string;
  email: string;
  minLength: string;
  maxLength: string;
  passwordMatch: string;
  invalidFormat: string;
}

export interface SuccessMessages {
  saved: string;
  created: string;
  updated: string;
  deleted: string;
  copied: string;
}

export interface Messages {
  common: CommonMessages;
  profile: ProfileMessages;
  auth?: AuthMessages;
  navigation?: NavigationMessages;
  workspace?: WorkspaceMessages;
  project?: ProjectMessages;
  document?: DocumentMessages;
  workflow?: WorkflowMessages;
  errors?: ErrorMessages;
  validation?: ValidationMessages;
  success?: SuccessMessages;
}
