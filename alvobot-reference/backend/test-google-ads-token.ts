/**
 * Script para testar se um Developer Token do Google Ads funciona
 *
 * Uso:
 * npx ts-node test-google-ads-token.ts
 *
 * Antes de rodar, configure as variáveis abaixo ou use as do .env
 */

import { GoogleAdsApi } from 'google-ads-api';
import * as dotenv from 'dotenv';

dotenv.config();

// ============================================
// CONFIGURAÇÃO - Edite aqui ou use o .env
// ============================================

const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || 'SEU_DEVELOPER_TOKEN_AQUI';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET || '';

// Pegar um refresh_token de uma conexão existente no banco
// Ou cole aqui manualmente para teste
const REFRESH_TOKEN = process.env.TEST_REFRESH_TOKEN || '1//0h00o99-1B3ntCgYIARAAGBESNwF-L9Ir3y7FYswZXuT7rD1Q2bbC13lywiPYVPvT8O-JHdSC66ab6mXMSRW5fD-YIxlHV-ER6TQ';

// ============================================

async function testToken() {
  console.log('\n🔍 Testando Google Ads Developer Token...\n');
  console.log('Developer Token:', DEVELOPER_TOKEN ? `${DEVELOPER_TOKEN.substring(0, 8)}...` : 'NÃO CONFIGURADO');
  console.log('Client ID:', CLIENT_ID ? `${CLIENT_ID.substring(0, 20)}...` : 'NÃO CONFIGURADO');
  console.log('Client Secret:', CLIENT_SECRET ? '***configurado***' : 'NÃO CONFIGURADO');
  console.log('Refresh Token:', REFRESH_TOKEN ? `${REFRESH_TOKEN.substring(0, 20)}...` : 'NÃO CONFIGURADO');
  console.log('');

  if (!DEVELOPER_TOKEN || DEVELOPER_TOKEN === 'SEU_DEVELOPER_TOKEN_AQUI') {
    console.error('❌ Developer Token não configurado!');
    console.log('   Edite o arquivo e coloque seu Developer Token na variável DEVELOPER_TOKEN');
    return;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Client ID ou Client Secret não configurados!');
    return;
  }

  if (!REFRESH_TOKEN) {
    console.error('❌ Refresh Token não configurado!');
    console.log('   Para testar, você precisa de um refresh_token de uma conexão OAuth existente.');
    console.log('   Pegue da tabela "connections" no Supabase, campo "refresh_token"');
    return;
  }

  try {
    const googleAdsApi = new GoogleAdsApi({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      developer_token: DEVELOPER_TOKEN,
    });

    console.log('📡 Chamando listAccessibleCustomers...');

    const response = await googleAdsApi.listAccessibleCustomers(REFRESH_TOKEN);

    console.log('\n✅ SUCESSO! O Developer Token está funcionando!\n');
    console.log('Contas acessíveis:');

    const resourceNames = response.resource_names || [];
    if (resourceNames.length === 0) {
      console.log('   (nenhuma conta encontrada - pode ser normal para tokens de teste)');
    } else {
      resourceNames.forEach((name: string) => {
        const customerId = name.replace('customers/', '');
        console.log(`   - Customer ID: ${customerId}`);
      });
    }

    console.log(`\nTotal: ${resourceNames.length} conta(s)`);

  } catch (error: any) {
    console.error('\n❌ ERRO ao testar o token:\n');

    if (error.code === 7) {
      console.log('Código: PERMISSION_DENIED');
      console.log('');
      console.log('Possíveis causas:');
      console.log('1. Developer Token em modo "Test" tentando acessar conta de produção');
      console.log('2. Developer Token inválido ou expirado');
      console.log('3. Conta Google Ads não tem permissão');
      console.log('');
      console.log('Se seu token é de "Test", você precisa:');
      console.log('- Criar uma MCC de TESTE separada (ads.google.com/home/tools/manager-accounts)');
      console.log('- OU aplicar para "Basic Access" no Google Ads API Center');
    } else {
      console.log('Erro:', error.message);
      console.log('Código:', error.code);
    }

    if (error.statusDetails) {
      console.log('\nDetalhes:', JSON.stringify(error.statusDetails, null, 2));
    }
  }
}

testToken();
