-- =============================================================================
-- META APP CREDENTIALS - ADICIONAR DEFAULT_FOR
-- =============================================================================
-- Adiciona coluna para definir qual app é o default para cada funcionalidade
-- Valores possíveis no array: 'messenger', 'ads', 'whatsapp', 'instagram'
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Adicionar coluna default_for
-- -----------------------------------------------------------------------------
ALTER TABLE meta_app_credentials
ADD COLUMN IF NOT EXISTS default_for TEXT[] DEFAULT NULL;

-- -----------------------------------------------------------------------------
-- 2. Adicionar comentário explicativo
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN meta_app_credentials.default_for IS
'Array de funcionalidades para as quais este app é o default. Valores: messenger, ads, whatsapp, instagram. NULL = não é default de nada.';

-- -----------------------------------------------------------------------------
-- 3. Criar índice para busca por default_for (otimiza queries com @> operator)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_meta_app_credentials_default_for
ON meta_app_credentials USING GIN (default_for);

-- =============================================================================
-- EXEMPLOS DE USO
-- =============================================================================
/*
-- Definir um app como default para messenger:
UPDATE meta_app_credentials
SET default_for = ARRAY['messenger']
WHERE app_name = 'AlvoBot Messenger';

-- Definir um app como default para ads:
UPDATE meta_app_credentials
SET default_for = ARRAY['ads']
WHERE app_name = 'AlvoBot Ads';

-- Definir um app como default para múltiplas funcionalidades:
UPDATE meta_app_credentials
SET default_for = ARRAY['messenger', 'ads', 'instagram']
WHERE app_name = 'AlvoBot Full';

-- Remover default:
UPDATE meta_app_credentials
SET default_for = NULL
WHERE app_name = 'AlvoBot Backup';

-- Buscar app default para messenger (query usada pelo backend):
SELECT * FROM meta_app_credentials
WHERE is_active = true
  AND is_banned = false
  AND default_for @> ARRAY['messenger']
LIMIT 1;
*/
