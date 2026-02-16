import { useState, useEffect } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Input, Select, Spinner, Alert } from '@/shared/components'
import styles from './ArticleEditPage.module.css'
import { useCreateBaseArticle, useUpdateArticle } from '../api/mutations'
import { useArticle } from '../api/useArticle'
import { TiptapEditor } from '../components/TiptapEditor'
import type { ArticleStatus } from '../types'

const statusOptions = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'published', label: 'Publicado' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'archived', label: 'Arquivado' },
]

export function ArticleEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const articleId = isNew ? 0 : parseInt(id || '0', 10)

  const { data: article, isLoading: isLoadingArticle } = useArticle(articleId)
  const createMutation = useCreateBaseArticle()
  const updateMutation = useUpdateArticle('base')

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [status, setStatus] = useState<ArticleStatus>('draft')
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    if (article) {
      setTitle(article.title || '')
      setContent(article.content || '')
      setExcerpt(article.excerpt || '')
      setStatus(article.status || 'draft')
      setKeyword(article.keyword_used || '')
    }
  }, [article])

  const handleSave = async () => {
    if (isNew) {
      // TODO: Add project selector for new articles
      // For now, we don't support creating new articles from this page
      // Articles should be created from the ArticlesPage with a project selected
      console.warn('Creating new articles from this page is not supported yet')
      return
    }

    await updateMutation.mutateAsync({
      id: articleId,
      title,
      content,
      excerpt,
      status,
      keyword_used: keyword || undefined,
    })
  }

  const isLoading = isLoadingArticle && !isNew
  const isSaving = createMutation.isPending || updateMutation.isPending
  const error = createMutation.error || updateMutation.error

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft size={18} />}
          onClick={() => navigate('/articles')}
        >
          Voltar
        </Button>
        <div className={styles.headerActions}>
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value as ArticleStatus)}
            className={styles.statusSelect}
          />
          <Button
            leftIcon={<Save size={18} />}
            onClick={handleSave}
            isLoading={isSaving}
          >
            Salvar
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" className={styles.alert}>
          Erro ao salvar artigo: {error.message}
        </Alert>
      )}

      <div className={styles.content}>
        <div className={styles.main}>
          <Input
            placeholder="Título do artigo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.titleInput}
          />

          <TiptapEditor
            content={content}
            onChange={setContent}
            placeholder="Comece a escrever seu artigo..."
          />
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>SEO</h3>
            <Input
              label="Keyword principal"
              placeholder="Ex: marketing digital"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              fullWidth
            />
            <Input
              label="Resumo (excerpt)"
              placeholder="Breve descrição do artigo"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              fullWidth
            />
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Estatísticas</h3>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Palavras</span>
                <span className={styles.statValue}>
                  {content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length}
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Caracteres</span>
                <span className={styles.statValue}>
                  {content.replace(/<[^>]*>/g, '').length}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
