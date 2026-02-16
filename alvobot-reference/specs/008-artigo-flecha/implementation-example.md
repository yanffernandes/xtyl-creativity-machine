# Arrow Articles - Implementation Examples

## Frontend Implementation Examples

### 1. TanStack Query Hook for Listing Arrow Articles

```typescript
// frontend/src/features/arrow-articles/api/queries.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/utils/supabase'
import type { ArrowArticle } from '../types'

interface UseArrowArticlesOptions {
  project_id?: number
  status?: string
  search?: string
}

export function useArrowArticles(options: UseArrowArticlesOptions = {}) {
  return useQuery({
    queryKey: ['arrow-articles', options],
    queryFn: async () => {
      let query = supabase
        .from('arrow_articles')
        .select(`
          id,
          title,
          status,
          primary_keyword,
          cta_config,
          template_type,
          created_at,
          published_at,
          project:projects(id, name, domain)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      // Apply filters
      if (options.project_id) {
        query = query.eq('project_id', options.project_id)
      }

      if (options.status) {
        query = query.eq('status', options.status)
      }

      if (options.search) {
        query = query.or(
          `title.ilike.%${options.search}%,primary_keyword.ilike.%${options.search}%`
        )
      }

      const { data, error } = await query

      if (error) throw error
      return data as ArrowArticle[]
    },
  })
}

export function useArrowArticle(id: string) {
  return useQuery({
    queryKey: ['arrow-articles', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('arrow_articles')
        .select(`
          *,
          project:projects(id, name, domain, login, pass)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as ArrowArticle
    },
    enabled: !!id,
  })
}
```

### 2. Create Arrow Article Mutation

```typescript
// frontend/src/features/arrow-articles/api/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/utils/supabase'
import type { CreateArrowArticleInput } from '../types'

export function useCreateArrowArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateArrowArticleInput) => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Insert article
      const { data, error } = await supabase
        .from('arrow_articles')
        .insert({
          user_id: user.id,
          project_id: input.project_id,
          title: input.title,
          meta_description: input.meta_description,
          excerpt: input.excerpt,
          primary_keyword: input.primary_keyword,
          secondary_keywords: input.secondary_keywords,
          keyword_density_target: input.keyword_density_target || 1.5,
          cta_config: input.cta_config,
          template_type: input.template_type,
          target_word_count: input.target_word_count || 1500,
          status: 'draft',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['arrow-articles'] })
    },
  })
}

export function useUpdateArrowArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: Partial<CreateArrowArticleInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('arrow_articles')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['arrow-articles'] })
      queryClient.invalidateQueries({ queryKey: ['arrow-articles', data.id] })
    },
  })
}

export function useDeleteArrowArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('arrow_articles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arrow-articles'] })
    },
  })
}
```

### 3. Backend API Calls

```typescript
// frontend/src/features/arrow-articles/api/backend.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'

interface GenerateContentInput {
  arrow_article_id: string
}

export function useGenerateContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ arrow_article_id }: GenerateContentInput) => {
      const { data } = await api.post(
        `/arrow-articles/${arrow_article_id}/generate`
      )
      return data
    },
    onSuccess: (_, variables) => {
      // Refetch the article to get updated content
      queryClient.invalidateQueries({
        queryKey: ['arrow-articles', variables.arrow_article_id],
      })
      queryClient.invalidateQueries({ queryKey: ['arrow-articles'] })
    },
  })
}

interface PublishToWordPressInput {
  arrow_article_id: string
  status: 'draft' | 'publish'
  categories?: number[]
  tags?: number[]
  featured_image_url?: string
  publish_date?: string
}

export function usePublishToWordPress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: PublishToWordPressInput) => {
      const { arrow_article_id, ...options } = input
      const { data } = await api.post(
        `/arrow-articles/${arrow_article_id}/publish`,
        options
      )
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['arrow-articles', variables.arrow_article_id],
      })
      queryClient.invalidateQueries({ queryKey: ['arrow-articles'] })
    },
  })
}

export function useArrowArticleMetrics(arrow_article_id: string) {
  return useQuery({
    queryKey: ['arrow-article-metrics', arrow_article_id],
    queryFn: async () => {
      const { data } = await api.get(
        `/arrow-articles/${arrow_article_id}/metrics`
      )
      return data
    },
    enabled: !!arrow_article_id,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}
```

### 4. Create Arrow Article Modal Component

```typescript
// frontend/src/features/arrow-articles/components/CreateArrowArticleModal.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Select } from '@/shared/components/ui/select'
import { useCreateArrowArticle } from '../api/mutations'
import { useProjects } from '@/features/projects/api/queries'

// Validation schema
const createArrowArticleSchema = z.object({
  project_id: z.number({ required_error: 'Projeto é obrigatório' }),
  title: z
    .string()
    .min(10, 'Título deve ter pelo menos 10 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres'),
  meta_description: z
    .string()
    .min(120, 'Meta description deve ter pelo menos 120 caracteres')
    .max(160, 'Meta description deve ter no máximo 160 caracteres'),
  excerpt: z.string().max(300).optional(),
  primary_keyword: z.string().min(2, 'Palavra-chave é obrigatória'),
  secondary_keywords: z.array(z.string()).optional(),
  keyword_density_target: z.number().min(0.5).max(5).optional(),
  target_word_count: z.number().min(500).max(5000).optional(),
  cta_config: z.object({
    type: z.enum(['button', 'form', 'link', 'banner']),
    text: z.string().min(1, 'Texto do CTA é obrigatório'),
    url: z.string().url('URL inválida'),
    position: z.enum(['top', 'middle', 'bottom', 'multiple']),
  }),
  template_type: z.enum(['listicle', 'howto', 'review', 'comparison', 'ultimate_guide']),
})

type FormData = z.infer<typeof createArrowArticleSchema>

interface CreateArrowArticleModalProps {
  open: boolean
  onClose: () => void
}

export function CreateArrowArticleModal({
  open,
  onClose,
}: CreateArrowArticleModalProps) {
  const [step, setStep] = useState(1)
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([])

  const { data: projects } = useProjects()
  const createMutation = useCreateArrowArticle()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(createArrowArticleSchema),
    defaultValues: {
      keyword_density_target: 1.5,
      target_word_count: 1500,
      cta_config: {
        type: 'button',
        position: 'middle',
      },
    },
  })

  const title = watch('title')
  const metaDescription = watch('meta_description')

  const onSubmit = async (data: FormData) => {
    try {
      await createMutation.mutateAsync({
        ...data,
        secondary_keywords: secondaryKeywords,
      })
      reset()
      setSecondaryKeywords([])
      setStep(1)
      onClose()
    } catch (error) {
      console.error('Error creating arrow article:', error)
    }
  }

  const handleNext = () => {
    setStep((prev) => Math.min(prev + 1, 5))
  }

  const handlePrevious = () => {
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const handleClose = () => {
    if (Object.keys(errors).length > 0 || watch('title')) {
      if (
        window.confirm(
          'Você tem alterações não salvas. Deseja realmente fechar?'
        )
      ) {
        reset()
        setStep(1)
        onClose()
      }
    } else {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Artigo Flecha</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded ${
                s <= step ? 'bg-yellow-400' : 'bg-gray-200'
              } ${s !== 5 ? 'mr-2' : ''}`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Project Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Selecione o Projeto</h3>
              <Select {...register('project_id')}>
                <option value="">Escolha um projeto</option>
                {projects?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.domain})
                  </option>
                ))}
              </Select>
              {errors.project_id && (
                <p className="text-red-500 text-sm">{errors.project_id.message}</p>
              )}
            </div>
          )}

          {/* Step 2: Content Settings */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Configurações de Conteúdo</h3>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Título ({title?.length || 0}/100)
                </label>
                <Input {...register('title')} placeholder="Digite o título do artigo" />
                {errors.title && (
                  <p className="text-red-500 text-sm">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Meta Description ({metaDescription?.length || 0}/160)
                </label>
                <Textarea
                  {...register('meta_description')}
                  placeholder="Descrição que aparecerá nos resultados de busca"
                  rows={3}
                />
                {errors.meta_description && (
                  <p className="text-red-500 text-sm">
                    {errors.meta_description.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Resumo (opcional)
                </label>
                <Textarea
                  {...register('excerpt')}
                  placeholder="Resumo breve do artigo"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Meta de Palavras
                </label>
                <Input
                  type="number"
                  {...register('target_word_count', { valueAsNumber: true })}
                  min={500}
                  max={5000}
                />
              </div>
            </div>
          )}

          {/* Step 3: SEO Configuration */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Configuração de SEO</h3>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Palavra-chave Principal
                </label>
                <Input
                  {...register('primary_keyword')}
                  placeholder="ex: email marketing estratégias"
                />
                {errors.primary_keyword && (
                  <p className="text-red-500 text-sm">
                    {errors.primary_keyword.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Palavras-chave Secundárias (máx. 5)
                </label>
                <TagsInput
                  value={secondaryKeywords}
                  onChange={setSecondaryKeywords}
                  maxTags={5}
                  placeholder="Digite e pressione Enter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Densidade de Palavra-chave Alvo (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  {...register('keyword_density_target', { valueAsNumber: true })}
                  min={0.5}
                  max={5}
                />
              </div>
            </div>
          )}

          {/* Step 4: CTA Setup */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Configuração de CTA</h3>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo de CTA</label>
                <Select {...register('cta_config.type')}>
                  <option value="button">Botão</option>
                  <option value="form">Formulário</option>
                  <option value="link">Link</option>
                  <option value="banner">Banner</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Texto do CTA</label>
                <Input
                  {...register('cta_config.text')}
                  placeholder="ex: Comece Agora Gratuitamente"
                />
                {errors.cta_config?.text && (
                  <p className="text-red-500 text-sm">
                    {errors.cta_config.text.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">URL do CTA</label>
                <Input
                  {...register('cta_config.url')}
                  placeholder="https://seusite.com/signup"
                />
                {errors.cta_config?.url && (
                  <p className="text-red-500 text-sm">
                    {errors.cta_config.url.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Posição do CTA
                </label>
                <Select {...register('cta_config.position')}>
                  <option value="top">Topo</option>
                  <option value="middle">Meio</option>
                  <option value="bottom">Final</option>
                  <option value="multiple">Múltiplas</option>
                </Select>
              </div>
            </div>
          )}

          {/* Step 5: Template Selection */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Escolha o Template</h3>

              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    value: 'listicle',
                    label: 'Lista',
                    description: 'Artigo em formato de lista numerada',
                  },
                  {
                    value: 'howto',
                    label: 'Como Fazer',
                    description: 'Guia passo a passo',
                  },
                  {
                    value: 'review',
                    label: 'Review',
                    description: 'Análise detalhada de produto/serviço',
                  },
                  {
                    value: 'comparison',
                    label: 'Comparação',
                    description: 'Comparação lado a lado',
                  },
                  {
                    value: 'ultimate_guide',
                    label: 'Guia Completo',
                    description: 'Guia abrangente sobre o tema',
                  },
                ].map((template) => (
                  <label
                    key={template.value}
                    className="flex flex-col p-4 border-2 rounded-lg cursor-pointer hover:border-yellow-400"
                  >
                    <input
                      type="radio"
                      {...register('template_type')}
                      value={template.value}
                      className="sr-only"
                    />
                    <span className="font-semibold">{template.label}</span>
                    <span className="text-sm text-gray-600">
                      {template.description}
                    </span>
                  </label>
                ))}
              </div>
              {errors.template_type && (
                <p className="text-red-500 text-sm">
                  {errors.template_type.message}
                </p>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={step === 1}
            >
              Anterior
            </Button>

            <div className="space-x-2">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>

              {step < 5 ? (
                <Button type="button" onClick={handleNext}>
                  Próximo
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-yellow-400 hover:bg-yellow-500 text-black"
                >
                  {createMutation.isPending ? 'Criando...' : 'Criar Artigo'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

## Backend Implementation Examples

### 1. Arrow Articles Controller

```typescript
// backend/src/modules/arrow-articles/arrow-articles.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common'
import { ArrowArticlesService } from './arrow-articles.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { GenerateContentDto } from './dto/generate-content.dto'
import { PublishWordPressDto } from './dto/publish-wordpress.dto'

@Controller('arrow-articles')
@UseGuards(JwtAuthGuard)
export class ArrowArticlesController {
  constructor(private readonly arrowArticlesService: ArrowArticlesService) {}

  @Post(':id/generate')
  async generateContent(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.sub
    return this.arrowArticlesService.generateContent(id, userId)
  }

  @Post(':id/publish')
  async publishToWordPress(
    @Param('id') id: string,
    @Body() dto: PublishWordPressDto,
    @Req() req: any
  ) {
    const userId = req.user.sub
    return this.arrowArticlesService.publishToWordPress(id, userId, dto)
  }

  @Get(':id/metrics')
  async getMetrics(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.sub
    return this.arrowArticlesService.getMetrics(id, userId)
  }
}
```

### 2. Content Generator Service

```typescript
// backend/src/modules/arrow-articles/services/content-generator.service.ts
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OpenAI from 'openai'

@Injectable()
export class ContentGeneratorService {
  private openai: OpenAI

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    })
  }

  async generateContent(input: {
    template_type: string
    title: string
    meta_description: string
    primary_keyword: string
    secondary_keywords?: string[]
    cta_config: any
    target_word_count: number
  }) {
    const prompt = this.buildPrompt(input)

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    })

    const content = completion.choices[0].message.content
    const { prompt_tokens, completion_tokens } = completion.usage

    return {
      content,
      input_tokens: prompt_tokens,
      output_tokens: completion_tokens,
      model_used: 'gpt-4-turbo-preview',
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert content writer specializing in conversion-optimized blog articles. Your goal is to create engaging, SEO-friendly content that drives user actions while maintaining natural readability and providing genuine value.

Key principles:
- Write for humans first, search engines second
- Use the primary keyword naturally throughout the content
- Incorporate secondary keywords where relevant
- Structure content with clear headings and subheadings
- Include actionable insights and practical examples
- Place CTAs strategically without being overly promotional
- Match the specified tone and template structure`
  }

  private buildPrompt(input: any): string {
    const secondaryKw = input.secondary_keywords?.join(', ') || 'None'

    return `Create a ${input.target_word_count}-word ${input.template_type} article with the following specifications:

Title: ${input.title}
Meta Description: ${input.meta_description}
Primary Keyword: ${input.primary_keyword}
Secondary Keywords: ${secondaryKw}

CTA Configuration:
- Type: ${input.cta_config.type}
- Text: ${input.cta_config.text}
- URL: ${input.cta_config.url}
- Position: ${input.cta_config.position}

Requirements:
- Include primary keyword "${input.primary_keyword}" naturally throughout
- Target keyword density: 1.5%
- Use semantic HTML (h1, h2, h3, p, ul, ol, strong, em)
- Include CTA at ${input.cta_config.position} position
- Ensure content is actionable and valuable
- Use conversational yet professional tone

Format the output as clean HTML ready for WordPress publishing.`
  }
}
```

### 3. WordPress Publisher Service

```typescript
// backend/src/modules/arrow-articles/services/wordpress-publisher.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import axios from 'axios'

@Injectable()
export class WordPressPublisherService {
  async publishArticle(input: {
    domain: string
    username: string
    app_password: string
    title: string
    content: string
    status: 'draft' | 'publish'
    categories?: number[]
    tags?: number[]
    featured_image_url?: string
  }) {
    const wpApiUrl = `${input.domain}/wp-json/wp/v2/posts`

    try {
      // Upload featured image if provided
      let featured_media_id: number | undefined

      if (input.featured_image_url) {
        featured_media_id = await this.uploadFeaturedImage(
          input.domain,
          input.username,
          input.app_password,
          input.featured_image_url
        )
      }

      // Create/update WordPress post
      const response = await axios.post(
        wpApiUrl,
        {
          title: input.title,
          content: input.content,
          status: input.status,
          categories: input.categories,
          tags: input.tags,
          featured_media: featured_media_id,
        },
        {
          auth: {
            username: input.username,
            password: input.app_password,
          },
        }
      )

      return {
        wpPost_id: response.data.id,
        wpPost_url: response.data.link,
        wpFeaturedMedia_id: featured_media_id,
        published_at: new Date(),
      }
    } catch (error) {
      if (error.response?.status === 401) {
        throw new HttpException(
          'WordPress credentials are invalid. Please check your settings.',
          HttpStatus.UNAUTHORIZED
        )
      }

      if (error.response?.status === 403) {
        throw new HttpException(
          'WordPress user does not have permission to publish posts.',
          HttpStatus.FORBIDDEN
        )
      }

      throw new HttpException(
        `Failed to publish to WordPress: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  private async uploadFeaturedImage(
    domain: string,
    username: string,
    app_password: string,
    image_url: string
  ): Promise<number> {
    const mediaApiUrl = `${domain}/wp-json/wp/v2/media`

    try {
      // Download image
      const imageResponse = await axios.get(image_url, {
        responseType: 'arraybuffer',
      })

      // Upload to WordPress
      const filename = image_url.split('/').pop() || 'image.jpg'

      const response = await axios.post(mediaApiUrl, imageResponse.data, {
        auth: {
          username,
          password: app_password,
        },
        headers: {
          'Content-Type': imageResponse.headers['content-type'],
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })

      return response.data.id
    } catch (error) {
      console.error('Failed to upload featured image:', error)
      // Don't fail the whole publish if image upload fails
      return undefined
    }
  }
}
```

This implementation example provides working code templates that follow the architecture defined in the spec. Developers can use these as a starting point and adapt them to their specific needs.
