// Temporal Workflow Types

export interface SaveBaseStructureInput {
  projectId: number;
  userId: string;
  categories: string[];
  articles: Array<{
    id: string;
    title: string;
    category: string;
  }>;
  installationType: "fast" | "custom";
  authorToggle: boolean;
  logoToggle: boolean;
  titleToggle: boolean;
  niche: string;
}

export interface SaveBaseStructureResult {
  success: boolean;
  categoriesCreated: number;
  articlesCreated: number;
  errors?: string[];
}

export interface Project {
  id: number;
  domain: string;
  token: string;
  name: string;
  userId: string;
  status?: string;
}

export interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  alreadyExisted?: boolean;
}

export interface ArticleRecord {
  id: number;
  title: string;
  projectId: number;
  userId: string;
  wpCategoriesId: number;
  isApprovalArticle: boolean;
  creditsUsed: number;
  date: string;
}

export interface WorkflowStatus {
  workflowId: string;
  status: "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | "TERMINATED";
  startTime?: Date;
  closeTime?: Date;
  result?: SaveBaseStructureResult;
}

// Project Creation Types
export interface CreateProjectInput {
  userId: string;
  name: string;
  domain: string;
  defaultLanguage?: string;
  login: string;
}

export interface CreateProjectResult {
  success: boolean;
  project?: {
    id: number;
    name: string;
    domain: string;
    status: boolean;
  };
  error?: string;
}

export interface TestWordPressConnectionInput {
  domain: string;
  login: string;
  password: string;
}

export interface TestWordPressConnectionResult {
  success: boolean;
  message: string;
  wpVersion?: string;
}
