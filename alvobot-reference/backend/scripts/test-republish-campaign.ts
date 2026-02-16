/**
 * Script para republicar um template Meta Ads existente para testes
 *
 * Uso:
 *   cd backend
 *   npx ts-node scripts/test-republish-campaign.ts [templateId]
 *
 * Se não passar templateId, usa o último template publicado.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios no .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface CampaignTemplate {
  id: string
  name: string
  status: string
  campaign_data: {
    upload?: {
      adAccountId?: string
      pageId?: string
      mediaFiles?: Array<{ url: string; name: string }>
    }
    ads?: {
      creative?: {
        linkUrl?: string
        displayUrl?: string
      }
      creatives?: Array<{
        linkUrl?: string
        displayUrl?: string
      }>
    }
  }
  user_id: string
  created_at: string
}

async function getLatestTemplate(templateId?: string): Promise<CampaignTemplate | null> {
  if (templateId) {
    const { data, error } = await supabase
      .from('meta_campaign_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (error) {
      console.error('❌ Erro ao buscar template:', error.message)
      return null
    }
    return data
  }

  // Buscar último template publicado
  const { data, error } = await supabase
    .from('meta_campaign_templates')
    .select('*')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('❌ Erro ao buscar template:', error.message)
    return null
  }

  return data
}

async function getUserToken(userId: string): Promise<string | null> {
  // Para testes, vamos criar um token JWT manualmente
  // Ou buscar uma sessão ativa do usuário

  // Alternativa: usar service_role para chamar o endpoint diretamente
  // simulando o usuário
  console.log('⚠️  Para testes, você precisa de um token JWT válido.')
  console.log('   Use o frontend para pegar o token do localStorage/sessionStorage.')
  console.log('')
  console.log('   Ou use curl diretamente:')
  return null
}

async function main() {
  const templateId = process.argv[2]

  console.log('🔄 Buscando template para republicar...')
  console.log('')

  const template = await getLatestTemplate(templateId)

  if (!template) {
    console.error('❌ Nenhum template encontrado')
    process.exit(1)
  }

  console.log('📋 Template encontrado:')
  console.log(`   ID: ${template.id}`)
  console.log(`   Nome: ${template.name}`)
  console.log(`   Status: ${template.status}`)
  console.log(`   User ID: ${template.user_id}`)
  console.log('')

  // Mostrar dados relevantes
  const ads = template.campaign_data?.ads
  const firstCreative = ads?.creatives?.[0] || ads?.creative

  if (firstCreative) {
    console.log('🔗 Dados do Creative:')
    console.log(`   linkUrl: ${firstCreative.linkUrl || '(vazio)'}`)
    console.log(`   displayUrl: ${firstCreative.displayUrl || '(vazio)'}`)
  }

  const mediaFiles = template.campaign_data?.upload?.mediaFiles || []
  console.log(`📷 Media Files: ${mediaFiles.length}`)
  mediaFiles.forEach((f, i) => {
    console.log(`   ${i + 1}. ${f.name}: ${f.url?.substring(0, 60)}...`)
  })

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Para republicar este template, use o seguinte comando:')
  console.log('')
  console.log('1. Pegue seu token JWT do frontend (F12 > Application > Local Storage > sb-xxx-auth-token)')
  console.log('')
  console.log('2. Execute:')
  console.log('')
  console.log(`curl -X POST "${BACKEND_URL}/meta/campaigns/${template.id}/publish" \\`)
  console.log('  -H "Content-Type: application/json" \\')
  console.log('  -H "Authorization: Bearer SEU_TOKEN_JWT" \\')
  console.log('  -d \'{"dryRun": false}\'')
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('💡 Dica: Para dry-run (testar sem publicar), use:')
  console.log(`   -d '{"dryRun": true}'`)
  console.log('')

  // Verificar se há problemas conhecidos
  if (!firstCreative?.linkUrl) {
    console.log('⚠️  AVISO: linkUrl está vazio! A campanha pode usar URL incorreto.')
  }
  if (!firstCreative?.displayUrl) {
    console.log('⚠️  AVISO: displayUrl está vazio! O link de exibição não será preenchido.')
  }
  if (!template.campaign_data?.upload?.adAccountId) {
    console.log('⚠️  AVISO: adAccountId está vazio!')
  }
}

main().catch(console.error)
