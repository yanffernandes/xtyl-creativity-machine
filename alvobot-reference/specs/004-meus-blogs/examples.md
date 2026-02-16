# Code Examples - Meus Blogs (Projetos)

## Frontend Examples

### 1. Mutation para Teste de Conexão WordPress

```typescript
// frontend/src/features/projects/api/wordpress.ts

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'

interface TestConnectionRequest {
  projectId: number
}

interface TestConnectionResponse {
  success: boolean
  connectionStatus: 'connected' | 'error'
  errorMessage?: string
  siteInfo?: {
    wpVersion: string
    siteUrl: string
    siteName: string
    plugins: Array<{ name: string; version: string; active: boolean }>
    alvobotPluginActive: boolean
    userPermissions: string[]
  }
  responseTimeMs: number
}

export function useTestWordPressConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TestConnectionRequest) => {
      const response = await api.post<TestConnectionResponse>(
        '/wordpress/test-connection',
        data
      )
      return response.data
    },
    onSuccess: (data, variables) => {
      // Atualizar cache do projeto com novo status
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.list()
      })
    },
  })
}

export function useInstallWordPressPlugin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: number) => {
      const response = await api.post<{ success: boolean; message: string }>(
        '/wordpress/install-plugin',
        { projectId }
      )
      return response.data
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId)
      })
    },
  })
}
```

### 2. Componente ConnectionStatusBadge

```typescript
// frontend/src/features/projects/components/ConnectionStatusBadge.tsx

import { CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react'
import styles from './ConnectionStatusBadge.module.css'

type ConnectionStatus = 'connected' | 'error' | 'not_configured' | 'testing'

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus
  errorMessage?: string
  className?: string
}

export function ConnectionStatusBadge({
  status,
  errorMessage,
  className
}: ConnectionStatusBadgeProps) {
  const config = {
    connected: {
      icon: CheckCircle,
      label: 'Conectado',
      variant: 'success' as const,
    },
    error: {
      icon: XCircle,
      label: 'Erro de Conexão',
      variant: 'error' as const,
    },
    not_configured: {
      icon: AlertCircle,
      label: 'Não Configurado',
      variant: 'warning' as const,
    },
    testing: {
      icon: Loader,
      label: 'Testando...',
      variant: 'info' as const,
    },
  }

  const { icon: Icon, label, variant } = config[status]

  return (
    <div
      className={`${styles.badge} ${styles[variant]} ${className || ''}`}
      title={errorMessage || label}
    >
      <Icon size={16} className={status === 'testing' ? styles.spin : ''} />
      <span>{label}</span>
    </div>
  )
}
```

```css
/* frontend/src/features/projects/components/ConnectionStatusBadge.module.css */

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.success {
  background-color: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.error {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.warning {
  background-color: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
}

.info {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### 3. Atualização do ProjectCard

```typescript
// frontend/src/features/projects/components/ProjectCard.tsx (atualizado)

import { useState } from 'react'
import { MoreVertical, Globe, Calendar } from 'lucide-react'
import { Button, Card } from '@/shared/components'
import { ConnectionStatusBadge } from './ConnectionStatusBadge'
import type { Project } from '../types'
import styles from './ProjectCard.module.css'

interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
  onTestConnection?: (project: Project) => void
  articleCount: number
  lastArticleDate?: string
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  onTestConnection,
  articleCount,
  lastArticleDate
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleTestConnection = (e: React.MouseEvent) => {
    e.stopPropagation()
    onTestConnection?.(project)
  }

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>{project.name}</h3>
          <ConnectionStatusBadge
            status={project.connection_status}
            errorMessage={project.connection_error_message}
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <MoreVertical size={18} />
        </Button>

        {menuOpen && (
          <div className={styles.menu}>
            <button onClick={() => onEdit(project)}>Gerenciar</button>
            {onTestConnection && (
              <button onClick={handleTestConnection}>Testar Conexão</button>
            )}
            <button onClick={() => onDelete(project)} className={styles.danger}>
              Excluir
            </button>
          </div>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.infoItem}>
          <Globe size={16} />
          <span className={styles.domain}>{project.domain}</span>
        </div>

        {project.wp_version && (
          <div className={styles.infoItem}>
            <span className={styles.label}>WordPress:</span>
            <span>{project.wp_version}</span>
          </div>
        )}
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{articleCount}</span>
          <span className={styles.statLabel}>Artigos</span>
        </div>

        {lastArticleDate && (
          <div className={styles.stat}>
            <Calendar size={14} />
            <span className={styles.statLabel}>
              {new Date(lastArticleDate).toLocaleDateString('pt-BR')}
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}
```

### 4. Wizard Step - Teste de Conexão

```typescript
// frontend/src/features/projects/components/wizard-steps/ConnectionTestStep.tsx

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react'
import { Button, Alert } from '@/shared/components'
import { useTestWordPressConnection } from '../../api/wordpress'
import styles from './ConnectionTestStep.module.css'

interface ConnectionTestStepProps {
  projectId: number
  onSuccess: () => void
  onRetry: () => void
}

export function ConnectionTestStep({
  projectId,
  onSuccess,
  onRetry
}: ConnectionTestStepProps) {
  const [autoTested, setAutoTested] = useState(false)
  const testMutation = useTestWordPressConnection()

  useEffect(() => {
    if (!autoTested) {
      testMutation.mutate({ projectId })
      setAutoTested(true)
    }
  }, [autoTested, projectId])

  const handleRetry = () => {
    testMutation.mutate({ projectId })
  }

  if (testMutation.isPending) {
    return (
      <div className={styles.container}>
        <div className={styles.loader}>
          <Loader size={64} className={styles.spin} />
          <h3>Testando conexão com WordPress...</h3>
          <p>Isso pode levar alguns segundos</p>
        </div>
      </div>
    )
  }

  if (testMutation.isError) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <XCircle size={64} className={styles.errorIcon} />
          <h3>Falha na conexão</h3>
          <p>{testMutation.error?.message || 'Erro desconhecido'}</p>

          <div className={styles.actions}>
            <Button variant="outline" onClick={onRetry}>
              Voltar e corrigir
            </Button>
            <Button onClick={handleRetry}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (testMutation.isSuccess && testMutation.data.success) {
    const { siteInfo } = testMutation.data

    return (
      <div className={styles.container}>
        <div className={styles.success}>
          <CheckCircle size={64} className={styles.successIcon} />
          <h3>Conexão estabelecida!</h3>
          <p>Seu WordPress foi conectado com sucesso</p>

          {siteInfo && (
            <div className={styles.siteInfo}>
              <h4>Informações do site:</h4>
              <ul>
                <li><strong>Nome:</strong> {siteInfo.siteName}</li>
                <li><strong>URL:</strong> {siteInfo.siteUrl}</li>
                <li><strong>WordPress:</strong> {siteInfo.wpVersion}</li>
                <li>
                  <strong>Plugin AlvoBot:</strong>{' '}
                  {siteInfo.alvobotPluginActive ? (
                    <span className={styles.active}>Ativo</span>
                  ) : (
                    <span className={styles.inactive}>Inativo</span>
                  )}
                </li>
              </ul>

              {!siteInfo.alvobotPluginActive && (
                <Alert variant="warning" className={styles.alert}>
                  <AlertTriangle size={18} />
                  <span>
                    O plugin AlvoBot não está ativo. Instale e ative o plugin
                    para usar todos os recursos.
                  </span>
                </Alert>
              )}
            </div>
          )}

          <Button onClick={onSuccess} className={styles.continueBtn}>
            Continuar
          </Button>
        </div>
      </div>
    )
  }

  return null
}
```

## Backend Examples

### 1. WordPress Service

```typescript
// backend/src/modules/wordpress/wordpress.service.ts

import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { EncryptionUtil } from './utils/encryption.util'
import { SupabaseService } from '../../common/supabase/supabase.service'
import type { TestConnectionDto, TestConnectionResponse } from './dto'

@Injectable()
export class WordPressService {
  constructor(
    private readonly httpService: HttpService,
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionUtil,
  ) {}

  async testConnection(
    userId: string,
    dto: TestConnectionDto,
  ): Promise<TestConnectionResponse> {
    const startTime = Date.now()

    try {
      // 1. Buscar projeto do banco
      const { data: project, error } = await this.supabase.client
        .from('projects')
        .select('*')
        .eq('id', dto.projectId)
        .eq('user_id', userId)
        .single()

      if (error || !project) {
        throw new BadRequestException('Projeto não encontrado')
      }

      // 2. Descriptografar credenciais
      const decryptedPassword = this.encryption.decrypt(project.pass)

      // 3. Validar URL do WordPress
      const wpUrl = this.normalizeUrl(project.domain)

      // 4. Testar autenticação com /wp-json/wp/v2/users/me
      const authHeader = this.createAuthHeader(project.login, decryptedPassword)

      const userResponse = await firstValueFrom(
        this.httpService.get(`${wpUrl}/wp-json/wp/v2/users/me`, {
          headers: { Authorization: authHeader },
          timeout: 10000,
        }),
      )

      // 5. Buscar informações do site
      const siteInfo = await this.fetchSiteInfo(wpUrl, authHeader)

      // 6. Verificar plugin AlvoBot
      const alvobotActive = await this.checkAlvobotPlugin(wpUrl, authHeader)

      // 7. Atualizar status no banco
      await this.updateProjectStatus(dto.projectId, {
        connectionStatus: 'connected',
        wpVersion: siteInfo.wpVersion,
        lastConnectionTest: new Date().toISOString(),
        connectionErrorMessage: null,
      })

      const responseTimeMs = Date.now() - startTime

      return {
        success: true,
        connectionStatus: 'connected',
        siteInfo: {
          wpVersion: siteInfo.wpVersion,
          siteUrl: siteInfo.siteUrl,
          siteName: siteInfo.siteName,
          plugins: siteInfo.plugins,
          alvobotPluginActive: alvobotActive,
          userPermissions: userResponse.data.capabilities || [],
        },
        responseTimeMs,
      }
    } catch (error) {
      const responseTimeMs = Date.now() - startTime
      const errorMessage = this.parseErrorMessage(error)

      // Atualizar status de erro no banco
      await this.updateProjectStatus(dto.projectId, {
        connectionStatus: 'error',
        lastConnectionTest: new Date().toISOString(),
        connectionErrorMessage: errorMessage,
      })

      return {
        success: false,
        connectionStatus: 'error',
        errorMessage,
        responseTimeMs,
      }
    }
  }

  private normalizeUrl(url: string): string {
    let normalized = url.trim()

    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`
    }

    // Remover trailing slash
    normalized = normalized.replace(/\/$/, '')

    // Validar URL
    try {
      new URL(normalized)
    } catch {
      throw new BadRequestException('URL do WordPress inválida')
    }

    return normalized
  }

  private createAuthHeader(username: string, password: string): string {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64')
    return `Basic ${credentials}`
  }

  private async fetchSiteInfo(wpUrl: string, authHeader: string) {
    const response = await firstValueFrom(
      this.httpService.get(`${wpUrl}/wp-json`, {
        headers: { Authorization: authHeader },
        timeout: 5000,
      }),
    )

    return {
      wpVersion: response.data.version || 'Unknown',
      siteUrl: response.data.url || wpUrl,
      siteName: response.data.name || 'WordPress Site',
      plugins: [], // Buscar plugins se necessário
    }
  }

  private async checkAlvobotPlugin(
    wpUrl: string,
    authHeader: string,
  ): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${wpUrl}/wp-json/alvobot/v1/status`, {
          headers: { Authorization: authHeader },
          timeout: 5000,
        }),
      )
      return response.data?.active === true
    } catch {
      return false
    }
  }

  private async updateProjectStatus(
    projectId: number,
    updates: {
      connectionStatus: string
      wpVersion?: string
      lastConnectionTest: string
      connectionErrorMessage: string | null
    },
  ) {
    await this.supabase.client
      .from('projects')
      .update({
        connection_status: updates.connectionStatus,
        wp_version: updates.wpVersion,
        last_connection_test: updates.lastConnectionTest,
        connection_error_message: updates.connectionErrorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
  }

  private parseErrorMessage(error: any): string {
    if (error.response?.status === 401) {
      return 'Credenciais inválidas. Verifique usuário e Application Password.'
    }
    if (error.response?.status === 403) {
      return 'Sem permissões suficientes. Use uma conta de administrador.'
    }
    if (error.code === 'ENOTFOUND') {
      return 'Site WordPress não encontrado. Verifique a URL.'
    }
    if (error.code === 'ETIMEDOUT') {
      return 'Tempo esgotado ao conectar. Verifique se o site está online.'
    }
    return error.message || 'Erro desconhecido ao conectar ao WordPress'
  }
}
```

### 2. Encryption Utility

```typescript
// backend/src/modules/wordpress/utils/encryption.util.ts

import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'

@Injectable()
export class EncryptionUtil {
  private readonly algorithm = 'aes-256-gcm'
  private readonly key: Buffer

  constructor(private configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('WORDPRESS_ENCRYPTION_KEY')

    if (!encryptionKey) {
      throw new Error('WORDPRESS_ENCRYPTION_KEY não configurada')
    }

    // Garantir que a chave tenha 32 bytes (256 bits)
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32)
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    // Retornar: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  }

  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':')

    if (parts.length !== 3) {
      throw new Error('Formato de texto criptografado inválido')
    }

    const [ivHex, authTagHex, encrypted] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }
}
```

### 3. WordPress Controller

```typescript
// backend/src/modules/wordpress/wordpress.controller.ts

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { WordPressService } from './wordpress.service'
import { TestConnectionDto, InstallPluginDto } from './dto'

@Controller('wordpress')
@UseGuards(JwtAuthGuard)
export class WordPressController {
  constructor(private readonly wordpressService: WordPressService) {}

  @Post('test-connection')
  @HttpCode(HttpStatus.OK)
  async testConnection(
    @Request() req,
    @Body() dto: TestConnectionDto,
  ) {
    const userId = req.user.sub
    return this.wordpressService.testConnection(userId, dto)
  }

  @Post('install-plugin')
  @HttpCode(HttpStatus.OK)
  async installPlugin(
    @Request() req,
    @Body() dto: InstallPluginDto,
  ) {
    const userId = req.user.sub
    return this.wordpressService.installPlugin(userId, dto)
  }

  @Get('site-info/:projectId')
  async getSiteInfo(
    @Request() req,
    @Param('projectId') projectId: number,
  ) {
    const userId = req.user.sub
    return this.wordpressService.getSiteInfo(userId, projectId)
  }
}
```

## Database Migration Example

```sql
-- backend/migrations/004_add_wordpress_connection_fields.sql

-- Adicionar colunas de conexão WordPress à tabela projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'not_configured',
ADD COLUMN IF NOT EXISTS last_connection_test TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS connection_error_message TEXT;

-- Criar tipo enum para status de conexão
DO $$ BEGIN
  CREATE TYPE connection_status_enum AS ENUM (
    'connected',
    'error',
    'not_configured',
    'testing'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Migrar dados existentes
UPDATE projects
SET connection_status = 'not_configured'
WHERE connection_status IS NULL;

-- Alterar coluna para usar enum
ALTER TABLE projects
ALTER COLUMN connection_status TYPE connection_status_enum
USING connection_status::connection_status_enum;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_projects_connection_status
ON projects(connection_status)
WHERE is_deleted = false;

-- Criar tabela de logs (opcional)
CREATE TABLE IF NOT EXISTS wordpress_connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('manual', 'automatic', 'wizard')),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  response_time_ms INTEGER,
  wp_version TEXT,
  tested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para logs
CREATE INDEX IF NOT EXISTS idx_wp_logs_project ON wordpress_connection_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_wp_logs_user ON wordpress_connection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_wp_logs_tested_at ON wordpress_connection_logs(tested_at DESC);

-- RLS para logs
ALTER TABLE wordpress_connection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connection logs"
  ON wordpress_connection_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connection logs"
  ON wordpress_connection_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comentários
COMMENT ON COLUMN projects.connection_status IS 'Status atual da conexão WordPress';
COMMENT ON COLUMN projects.last_connection_test IS 'Timestamp do último teste de conexão';
COMMENT ON COLUMN projects.connection_error_message IS 'Mensagem de erro da última falha de conexão';
COMMENT ON TABLE wordpress_connection_logs IS 'Histórico de testes de conexão WordPress';
```

## Environment Variables Example

```bash
# backend/.env

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

# WordPress Integration
WORDPRESS_ENCRYPTION_KEY=your_32_char_minimum_encryption_key_here_make_it_random

# Server
BACKEND_PORT=3001
NODE_ENV=development
```

## WordPress Plugin Example

```php
<?php
/**
 * Plugin Name: AlvoBot Integration
 * Description: Integração entre WordPress e AlvoBot para publicação automatizada de conteúdo
 * Version: 1.0.0
 * Author: AlvoBot
 * Author URI: https://alvobot.com
 * License: GPL v2 or later
 * Requires at least: 5.5
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Registrar endpoint de status
add_action('rest_api_init', function () {
    register_rest_route('alvobot/v1', '/status', [
        'methods' => 'GET',
        'callback' => 'alvobot_status_callback',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);
});

function alvobot_status_callback() {
    global $wp_version;

    return new WP_REST_Response([
        'active' => true,
        'version' => '1.0.0',
        'wp_version' => $wp_version,
        'capabilities' => [
            'create_posts' => current_user_can('publish_posts'),
            'upload_files' => current_user_can('upload_files'),
            'manage_categories' => current_user_can('manage_categories'),
        ],
        'site_info' => [
            'name' => get_bloginfo('name'),
            'url' => get_site_url(),
            'language' => get_bloginfo('language'),
        ],
    ], 200);
}

// Adicionar configurações do plugin
add_action('admin_menu', function() {
    add_options_page(
        'AlvoBot Settings',
        'AlvoBot',
        'manage_options',
        'alvobot-settings',
        'alvobot_settings_page'
    );
});

function alvobot_settings_page() {
    ?>
    <div class="wrap">
        <h1>AlvoBot Integration</h1>
        <p>Plugin ativo e funcionando!</p>
        <p>Versão do WordPress: <?php echo get_bloginfo('version'); ?></p>
        <p>REST API habilitada: ✓</p>
    </div>
    <?php
}
```

## Testing Examples

### Unit Test - Encryption Utility

```typescript
// backend/src/modules/wordpress/utils/encryption.util.spec.ts

import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { EncryptionUtil } from './encryption.util'

describe('EncryptionUtil', () => {
  let encryptionUtil: EncryptionUtil

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EncryptionUtil,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => 'test-encryption-key-32-characters'),
          },
        },
      ],
    }).compile()

    encryptionUtil = module.get<EncryptionUtil>(EncryptionUtil)
  })

  it('should encrypt and decrypt text correctly', () => {
    const originalText = 'my-application-password-123'

    const encrypted = encryptionUtil.encrypt(originalText)
    expect(encrypted).not.toBe(originalText)
    expect(encrypted.split(':')).toHaveLength(3)

    const decrypted = encryptionUtil.decrypt(encrypted)
    expect(decrypted).toBe(originalText)
  })

  it('should generate different encrypted values for same input', () => {
    const text = 'same-password'

    const encrypted1 = encryptionUtil.encrypt(text)
    const encrypted2 = encryptionUtil.encrypt(text)

    expect(encrypted1).not.toBe(encrypted2)
    expect(encryptionUtil.decrypt(encrypted1)).toBe(text)
    expect(encryptionUtil.decrypt(encrypted2)).toBe(text)
  })

  it('should throw error for invalid encrypted format', () => {
    expect(() => encryptionUtil.decrypt('invalid')).toThrow()
  })
})
```

### E2E Test - Test Connection Flow

```typescript
// backend/test/wordpress.e2e-spec.ts

import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'

describe('WordPress Controller (e2e)', () => {
  let app: INestApplication
  let authToken: string

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    // Obter token de autenticação (mock)
    authToken = 'mock-jwt-token'
  })

  it('/wordpress/test-connection (POST) - success', () => {
    return request(app.getHttpServer())
      .post('/wordpress/test-connection')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ projectId: 1 })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('success')
        expect(res.body).toHaveProperty('connectionStatus')
      })
  })

  it('/wordpress/test-connection (POST) - unauthorized without token', () => {
    return request(app.getHttpServer())
      .post('/wordpress/test-connection')
      .send({ projectId: 1 })
      .expect(401)
  })

  afterAll(async () => {
    await app.close()
  })
})
```
