// Types for Base Structure feature (4 Layers System)

export interface BaseStructureCategory {
  id: string
  project_id: number
  name: string
  slug?: string
  description?: string
  parent_id?: string | null  // For subcategories (layer 2)
  layer: 1 | 2 | 3  // 1=Category, 2=Subcategory, 3=Tag
  order: number
  created_at: string
  updated_at?: string
}

export interface BaseStructureAuthor {
  id: string
  project_id: number
  name: string
  display_name: string
  bio?: string
  avatar_url?: string
  role?: string  // e.g., "Writer", "Editor", "Reviewer"
  social_links?: {
    twitter?: string
    linkedin?: string
    website?: string
  }
  order: number
  created_at: string
  updated_at?: string
}

export interface BaseStructure {
  project_id: number
  categories: BaseStructureCategory[]  // Layer 1
  subcategories: BaseStructureCategory[]  // Layer 2
  tags: BaseStructureCategory[]  // Layer 3
  authors: BaseStructureAuthor[]  // Layer 4
  approval_status: 'draft' | 'pending' | 'approved' | 'rejected'
  submitted_at?: string
  approved_at?: string
  rejection_reason?: string
}

export interface CreateCategoryInput {
  project_id: number
  name: string
  slug?: string
  description?: string
  parent_id?: string | null
  layer: 1 | 2 | 3
}

export interface UpdateCategoryInput {
  name?: string
  slug?: string
  description?: string
  order?: number
}

export interface CreateAuthorInput {
  project_id: number
  name: string
  display_name: string
  bio?: string
  avatar_url?: string
  role?: string
}

export interface UpdateAuthorInput {
  name?: string
  display_name?: string
  bio?: string
  avatar_url?: string
  role?: string
  order?: number
}

export interface ValidationChecklistItem {
  id: string
  label: string
  check: (structure: BaseStructure) => boolean
  required: boolean
}

// Validation checklist for approval
export const VALIDATION_CHECKLIST: ValidationChecklistItem[] = [
  {
    id: 'min_categories',
    label: 'Pelo menos 3 categorias principais',
    check: (s) => s.categories.length >= 3,
    required: true,
  },
  {
    id: 'min_subcategories',
    label: 'Pelo menos 2 subcategorias por categoria',
    check: (s) => {
      if (s.categories.length === 0) return false
      return s.categories.every(
        cat => s.subcategories.filter(sub => sub.parent_id === cat.id).length >= 2
      )
    },
    required: true,
  },
  {
    id: 'min_tags',
    label: 'Pelo menos 5 tags definidas',
    check: (s) => s.tags.length >= 5,
    required: true,
  },
  {
    id: 'min_authors',
    label: 'Pelo menos 1 autor configurado',
    check: (s) => s.authors.length >= 1,
    required: true,
  },
  {
    id: 'authors_with_bio',
    label: 'Todos os autores têm biografia',
    check: (s) => s.authors.every(a => a.bio && a.bio.length > 10),
    required: false,
  },
  {
    id: 'authors_with_avatar',
    label: 'Todos os autores têm foto de perfil',
    check: (s) => s.authors.every(a => a.avatar_url),
    required: false,
  },
]
