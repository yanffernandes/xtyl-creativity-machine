# Data Model: Workspaces Migration

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              WORKSPACE LAYER                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────────┐
│   workspaces     │         │  workspace_members   │
├──────────────────┤         ├──────────────────────┤
│ id (PK)          │◄────────┤ workspace_id (FK)    │
│ name             │         │ user_id (FK) ────────┼──────┐
│ slug (UNIQUE)    │         │ role                 │      │
│ description      │         │ permissions (JSONB)  │      │
│ logo_url         │         │ status               │      │
│ settings (JSONB) │         │ invited_by (FK)      │      │
│ max_projects     │         │ invited_at           │      │
│ max_members      │         │ accepted_at          │      │
│ owner_user_id────┼────┐    └──────────────────────┘      │
│ plan_id (FK)     │    │                                  │
│ created_at       │    │    ┌──────────────────────┐      │
│ deleted_at       │    │    │workspace_invitations │      │
└──────────────────┘    │    ├──────────────────────┤      │
         │              │    │ workspace_id (FK)────┼──────┤
         │              │    │ email                │      │
         │              │    │ role                 │      │
         │              │    │ token (UNIQUE)       │      │
         │              │    │ invited_by (FK)──────┼──────┤
         │              │    │ expires_at           │      │
         │              │    │ status               │      │
         │              │    └──────────────────────┘      │
         │              │                                  │
         │              └───────────────┐                  │
         │                              │                  │
         │                              ▼                  │
┌────────┼─────────────────────────────────────────────────┼──────────────────────┐
│        │                   USER LAYER                    │                      │
└────────┼─────────────────────────────────────────────────┼──────────────────────┘
         │                              │                  │
         │              ┌───────────────┴──────────────────┘
         │              │
         │              ▼
         │    ┌──────────────────┐       ┌──────────────────┐
         │    │   auth.users     │       │   public.users   │
         │    ├──────────────────┤       ├──────────────────┤
         │    │ id (PK)          │◄──────┤ id (FK)          │
         │    │ email            │       │ name             │
         │    │ ...              │       │ email            │
         │    └──────────────────┘       │ phone            │
         │              ▲                │ image            │
         │              │                └──────────────────┘
         │              │
         │              │
┌────────┼──────────────┼─────────────────────────────────────────────────────────┐
│        │              │            PROJECT LAYER                                 │
└────────┼──────────────┼─────────────────────────────────────────────────────────┘
         │              │
         ▼              │
┌──────────────────┐    │
│    projects      │    │
├──────────────────┤    │
│ id (PK)          │    │
│ workspace_id(FK)─┼────┤ ◄── NOVO (nullable para compatibilidade)
│ user_id (FK) ────┼────┘     MANTIDO (compatibilidade WeWeb)
│ name             │
│ domain           │
│ login            │
│ pass (encrypted) │
│ status           │
│ connection_status│
│ wp_version       │
│ plugins (JSON)   │
│ is_deleted       │
└──────────────────┘
         │
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            RESOURCES LAYER                                        │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   connections    │    │ message_triggers │    │  message_flows   │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│ id (PK)          │    │ id (PK)          │    │ id (PK)          │
│ project_id (FK)──┼────┤ workspace_id(FK) │    │ project_id (FK)  │ ✓ ja existe
│ user_id (FK)     │    │ project_id (FK)──┼────┤ name             │
│ platform_name    │    │ owner_user_id    │    │ flow (JSONB)     │
│ access_token     │    │ title            │    │ status           │
│ is_active        │    │ trigger_type     │    │ is_active        │
│ ...              │    │ page_ids         │    │ ...              │
└──────────────────┘    │ flow_id (FK) ────┼────┘                  │
         │              │ ...              │                        │
         ▼              └──────────────────┘                        │
┌──────────────────┐                                               │
│   meta_pages     │                                               │
├──────────────────┤                                               │
│ id (PK)          │                                               │
│ connection_id(FK)│                                               │
│ user_id (FK)     │                                               │
│ page_name        │                                               │
│ page_id          │                                               │
│ ...              │                                               │
└──────────────────┘                                               │
                                                                   │
┌──────────────────┐    ┌──────────────────┐                       │
│     tasks        │    │    articles      │                       │
├──────────────────┤    ├──────────────────┤                       │
│ id (PK)          │    │ id (PK)          │                       │
│ workspace_id(FK) │    │ project_id (FK)──┼───────────────────────┘
│ project_id (FK)  │    │ user_id (FK)     │
│ user_id (FK)     │    │ title            │
│ name             │    │ content          │
│ status           │    │ status           │
│ ...              │    │ ...              │
└──────────────────┘    └──────────────────┘
```

## Legenda de Mudancas

```
┌─────────────────────────────────────────────────────────────────┐
│  LEGENDA                                                        │
├─────────────────────────────────────────────────────────────────┤
│  ◄── NOVO      = Nova coluna/tabela adicionada                  │
│  MANTIDO       = Coluna existente mantida para compatibilidade  │
│  ✓ ja existe   = Estrutura que ja existia e sera aproveitada    │
│  (FK)          = Foreign Key                                    │
│  (PK)          = Primary Key                                    │
│  (nullable)    = Coluna pode ser NULL (compatibilidade)         │
└─────────────────────────────────────────────────────────────────┘
```

## Roles e Permissoes

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PERMISSION MATRIX                                      │
├──────────────────┬─────────┬─────────┬─────────┬─────────┬─────────────────────┤
│ Action           │ Owner   │ Admin   │ Member  │ Viewer  │ Non-member          │
├──────────────────┼─────────┼─────────┼─────────┼─────────┼─────────────────────┤
│ View workspace   │   ✓     │   ✓     │   ✓     │   ✓     │   ✗                 │
│ Edit workspace   │   ✓     │   ✓     │   ✗     │   ✗     │   ✗                 │
│ Delete workspace │   ✓     │   ✗     │   ✗     │   ✗     │   ✗                 │
├──────────────────┼─────────┼─────────┼─────────┼─────────┼─────────────────────┤
│ Invite members   │   ✓     │   ✓     │   ✗     │   ✗     │   ✗                 │
│ Remove members   │   ✓     │   ✓*    │   ✗     │   ✗     │   ✗                 │
│ Change roles     │   ✓     │   ✓*    │   ✗     │   ✗     │   ✗                 │
├──────────────────┼─────────┼─────────┼─────────┼─────────┼─────────────────────┤
│ Create project   │   ✓     │   ✓     │   ✓     │   ✗     │   ✗                 │
│ Edit project     │   ✓     │   ✓     │   ✓     │   ✗     │   ✗                 │
│ Delete project   │   ✓     │   ✓     │   ✗     │   ✗     │   ✗                 │
├──────────────────┼─────────┼─────────┼─────────┼─────────┼─────────────────────┤
│ Manage billing   │   ✓     │   ✗     │   ✗     │   ✗     │   ✗                 │
│ View billing     │   ✓     │   ✓     │   ✗     │   ✗     │   ✗                 │
├──────────────────┼─────────┼─────────┼─────────┼─────────┼─────────────────────┤
│ Create content   │   ✓     │   ✓     │   ✓     │   ✗     │   ✗                 │
│ Edit content     │   ✓     │   ✓     │   ✓     │   ✗     │   ✗                 │
│ Delete content   │   ✓     │   ✓     │   ✓*    │   ✗     │   ✗                 │
│ View content     │   ✓     │   ✓     │   ✓     │   ✓     │   ✗                 │
└──────────────────┴─────────┴─────────┴─────────┴─────────┴─────────────────────┘

* Admin nao pode alterar Owner
* Member so pode deletar conteudo proprio (configuravel via permissions)
```

## Fluxo de Dados: Conexoes por Projeto

```
ANTES (User-Centric):
=====================

User A
  │
  ├── Connection 1 (Meta)
  │     └── Page 1, Page 2, Page 3
  │
  ├── Project 1 (Blog X)
  │
  └── Project 2 (Blog Y)

Problema: Como saber quais paginas vao para qual blog?
Solucao atual: Selecionar manualmente page_ids no trigger


DEPOIS (Project-Centric):
=========================

Workspace "Minha Empresa"
  │
  ├── Project 1 (Blog X)
  │     └── Connection 1 (Meta)
  │           └── Page 1, Page 2, Page 3 (300 paginas)
  │
  └── Project 2 (Blog Y)
        └── Connection 2 (Meta)
              └── Page 4, Page 5

Beneficio: Trigger vinculado a projeto = todas as paginas automaticamente
```

## Migracao de Dados: Cenarios

```
CENARIO 1: Usuario com 1 projeto e 1 conexao
============================================
ANTES:
  User A
    ├── Project 1
    └── Connection 1 (user_id = A)

DEPOIS:
  Workspace "User A" (auto-criado)
    └── Project 1
          └── Connection 1 (project_id = 1)

Migracao: Automatica (inferencia)


CENARIO 2: Usuario com multiplos projetos e 1 conexao
=====================================================
ANTES:
  User A
    ├── Project 1
    ├── Project 2
    └── Connection 1 (user_id = A)

DEPOIS:
  Workspace "User A" (auto-criado)
    ├── Project 1
    ├── Project 2
    └── Connection 1 (user_id = A, project_id = NULL)

Migracao: Manter user-level, usuario decide depois


CENARIO 3: Usuario com multiplos projetos e multiplas conexoes
==============================================================
ANTES:
  User A
    ├── Project 1 (domain: blog1.com)
    ├── Project 2 (domain: blog2.com)
    ├── Connection 1 (pages: Blog1 Page)
    └── Connection 2 (pages: Blog2 Page)

DEPOIS:
  Workspace "User A"
    ├── Project 1
    │     └── Connection 1 (inferido pelo nome?)
    └── Project 2
          └── Connection 2

Migracao: Requer interacao do usuario ou heuristica complexa
```

## RLS Policy Flow

```
Query: SELECT * FROM projects

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   auth.uid() = 'user-123'                                                       │
│                                                                                 │
│   ┌───────────────────────────────────────────────────────────────────────┐     │
│   │ RLS Policy: projects_workspace_access                                 │     │
│   └───────────────────────────────────────────────────────────────────────┘     │
│                           │                                                     │
│           ┌───────────────┴───────────────┐                                     │
│           ▼                               ▼                                     │
│   ┌───────────────────┐           ┌───────────────────┐                         │
│   │ NOVO MODELO       │           │ MODELO LEGADO     │                         │
│   │                   │           │                   │                         │
│   │ workspace_id IN ( │    OR     │ user_id =         │                         │
│   │   SELECT w_id     │           │ auth.uid()        │                         │
│   │   FROM members    │           │                   │                         │
│   │   WHERE user_id   │           │                   │                         │
│   │   = auth.uid()    │           │                   │                         │
│   │ )                 │           │                   │                         │
│   └───────────────────┘           └───────────────────┘                         │
│           │                               │                                     │
│           └───────────────┬───────────────┘                                     │
│                           ▼                                                     │
│   ┌───────────────────────────────────────────────────────────────────────┐     │
│   │ Retorna projetos que:                                                 │     │
│   │ - Pertencem a workspace onde usuario e membro                         │     │
│   │ - OU pertencem diretamente ao usuario (legado)                        │     │
│   └───────────────────────────────────────────────────────────────────────┘     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Estado Final Desejado

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SISTEMA HIBRIDO                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────┐     ┌─────────────────────────────┐           │
│  │      REACT (NOVO)           │     │      WEWEB (LEGADO)         │           │
│  │                             │     │                             │           │
│  │  - Usa workspace_id         │     │  - Usa user_id              │           │
│  │  - Workspace switcher       │     │  - Sem workspaces           │           │
│  │  - Convites/membros         │     │  - Single user              │           │
│  │  - Conexoes por projeto     │     │  - Conexoes por user        │           │
│  │                             │     │                             │           │
│  └──────────────┬──────────────┘     └──────────────┬──────────────┘           │
│                 │                                   │                           │
│                 └─────────────┬─────────────────────┘                           │
│                               │                                                 │
│                               ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        SUPABASE (MESMO BANCO)                           │   │
│  │                                                                         │   │
│  │   RLS Policies:                                                         │   │
│  │   - workspace_id IN members(user_id) OR user_id = auth.uid()            │   │
│  │                                                                         │   │
│  │   Colunas:                                                              │   │
│  │   - workspace_id (nullable) ← novo                                      │   │
│  │   - user_id ← mantido                                                   │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```
