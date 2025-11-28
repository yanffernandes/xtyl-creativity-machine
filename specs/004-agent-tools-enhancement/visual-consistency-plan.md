# Plano de Consistência Visual e Revisão do Workflow Builder

## Resumo

Este plano aborda a melhoria visual e revisão lógica do Workflow Builder para alinhar com o padrão de design "Apple Liquid Glass" já implementado na tela Kanban e no Assistente de IA.

---

## 1. Análise do Estado Atual

### 1.1 Padrão Visual Referência (Apple Liquid Glass)

Encontrado em `ChatSidebar.tsx` e `WorkspaceSidebar.tsx`:

```tsx
// Classes CSS para efeito glass flutuante
"bg-white/[0.03] dark:bg-white/[0.02]",
"backdrop-blur-2xl backdrop-saturate-150",
"border border-white/[0.1]",
"rounded-2xl",
"shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.05)_inset]",
"dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.03)_inset]"
```

### 1.2 Componentes do Workflow Builder (Estado Atual)

| Componente | Arquivo | Problema |
|------------|---------|----------|
| NodePalette | `workflow/NodePalette.tsx` | Usa `bg-white dark:bg-gray-900` sem glass effect |
| NodePropertiesPanel | `workflow/NodePropertiesPanel.tsx` | Mesmo problema, sem glass effect |
| Model Selector | Select simples | Não tem busca, lista estática de 3-4 modelos |
| WorkflowCanvas | `workflow/WorkflowCanvas.tsx` | Background básico, sem integração visual |

### 1.3 Seletor de Modelo no AI Assistant (Referência)

O ChatSidebar usa Command + Popover para seleção de modelo:
- Busca de modelos com `CommandInput`
- Grupos "Recomendados" e "Todos os Modelos"
- Fetch dinâmico de `/chat/models`
- Ícones e badges de performance

---

## 2. Tarefas de Implementação

### Fase 1: Visual - NodePalette (Sidebar Esquerda)

**Arquivo:** `frontend/src/components/workflow/NodePalette.tsx`

**Alterações:**
1. Substituir `bg-white dark:bg-gray-900 border-r` por classes glass
2. Adicionar gradient sutil no header
3. Aplicar `backdrop-blur-2xl backdrop-saturate-150`
4. Cards de nós com hover effect consistente
5. Bordas arredondadas (`rounded-2xl`)

**De:**
```tsx
<div className="w-64 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
```

**Para:**
```tsx
<div className={cn(
  "w-64 h-full flex flex-col",
  "bg-white/[0.03] dark:bg-white/[0.02]",
  "backdrop-blur-2xl backdrop-saturate-150",
  "border-r border-white/[0.1]",
  "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.1)]"
)}>
```

---

### Fase 2: Visual - NodePropertiesPanel (Sidebar Direita)

**Arquivo:** `frontend/src/components/workflow/NodePropertiesPanel.tsx`

**Alterações:**
1. Aplicar mesmo padrão glass da NodePalette
2. Header com gradient sutil
3. Inputs com estilo translúcido
4. Botão fechar com hover suave

---

### Fase 3: Model Selector com Busca

**Arquivos:**
- `frontend/src/components/workflow/NodePropertiesPanel.tsx`
- Novo: `frontend/src/components/workflow/ModelSelector.tsx`

**Implementação:**

Criar componente `ModelSelector` reutilizável baseado no padrão do ChatSidebar:

```tsx
interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  type: "text" | "image"; // Filtra modelos relevantes
}
```

**Funcionalidades:**
- Popover com Command para busca
- Fetch de modelos via `/chat/models` API
- Filtrar por tipo (text generation vs image generation)
- Grupos: Recomendados / Todos
- Ícones de provider (OpenAI, Anthropic, etc.)
- Performance badges (Fast, Standard, Creative)

---

### Fase 4: WorkflowCanvas Background

**Arquivo:** `frontend/src/components/workflow/WorkflowCanvas.tsx`

**Alterações:**
1. Background com gradient sutil ao invés de `bg-gray-50`
2. Controls e MiniMap com glass effect
3. Panel de info (nodes/edges) com glass effect

---

### Fase 5: Revisão da Lógica do Workflow

**Verificações Necessárias:**

#### 5.1 Passagem de Prompt para Image Generation

**Backend:** `backend/services/node_executor.py` (linhas 173-243)

**Status:** ✅ Funcionando corretamente

O código atual:
```python
async def execute_generate_image_node(...):
    prompt_template = data.get("prompt", "")
    # Substitui variáveis de template
    prompt = prompt_template
    for key, value in execution.config_json.items():
        prompt = prompt.replace(f"{{{key}}}", str(value))
```

**Porém**, há uma limitação: só substitui variáveis do `config_json`, não de outros nós.

#### 5.2 Variable Resolver

**Backend:** `backend/services/variable_resolver.py`

**Status:** ✅ Implementado corretamente

O `VariableResolver` processa sintaxe `{{node.field}}`:
- `parse_variables()` - extrai referências
- `resolve_variables()` - substitui com valores do contexto
- `build_execution_order()` - ordem topológica

**Integração necessária:** Verificar se `workflow_executor.py` está usando o `variable_resolver` antes de chamar `execute_generate_image_node`.

#### 5.3 Fluxo de Dados Entre Nós

Verificar em `workflow_executor.py`:
1. Contexto de execução é passado entre nós?
2. Output de TextGeneration está disponível para ImageGeneration?
3. Variable resolution acontece antes de cada node execution?

---

## 3. Ordem de Execução

1. **NodePalette** - Glass effect na sidebar esquerda
2. **NodePropertiesPanel** - Glass effect na sidebar direita
3. **ModelSelector** - Criar componente com busca
4. **Integrar ModelSelector** - Substituir Select nos painéis de Text e Image
5. **WorkflowCanvas** - Ajustes visuais menores
6. **Verificar fluxo de dados** - Garantir que prompts com variáveis funcionam

---

## 4. Estimativa de Mudanças

| Componente | Arquivos Afetados | Complexidade |
|------------|-------------------|--------------|
| NodePalette | 1 | Baixa |
| NodePropertiesPanel | 1 | Baixa |
| ModelSelector | 1 novo + 1 update | Média |
| WorkflowCanvas | 1 | Baixa |
| Revisão Lógica | Backend (verificação) | Baixa |

---

## 5. Riscos e Considerações

1. **Performance do backdrop-blur**: Pode impactar em máquinas fracas - usar `will-change: transform` para otimizar
2. **Consistência de cores**: Garantir que as cores dos nós (verde, vermelho, etc.) não conflitem com o glass effect
3. **API de modelos**: Endpoint `/chat/models` precisa suportar filtro por tipo

---

## 6. Aprovação

Aguardando aprovação para iniciar implementação.

**Perguntas pendentes:**
- Deseja que eu crie o componente ModelSelector em arquivo separado ou inline no NodePropertiesPanel?
- Deseja manter os mesmos modelos hardcoded como fallback se a API falhar?
