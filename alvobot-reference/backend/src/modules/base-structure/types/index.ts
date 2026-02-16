// Types for Base Structure Module

export interface NicheSuggestion {
  id: string;
  name: string;
  description: string;
  confidence?: number;
}

export interface CategoryGroup {
  title: string;
}

export interface GeneratedCategories {
  categories: CategoryGroup[][];
}

export interface ArticleTitle {
  id: string;
  title: string;
  category: string;
}

export interface AuthorData {
  name: string;
  description: string;
  sex: "M" | "F";
}

export interface LogoConfig {
  icon: string;
  font: string;
  color: string;
}

export interface BlogSettings {
  title: string;
  description: string;
}

export interface SaveStructureResult {
  success: boolean;
  articlesCreated: number;
  categoriesCreated: number;
  authorCreated?: boolean;
  logoCreated?: boolean;
  titleUpdated?: boolean;
}

export interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
}

export interface ArrowArticleContent {
  title: string;
  excerpt: string;
  content: string;
}

export interface BaseArticleContent {
  content: string;
  excerpt: string;
}
