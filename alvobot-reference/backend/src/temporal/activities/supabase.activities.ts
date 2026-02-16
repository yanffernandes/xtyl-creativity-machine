import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  Project,
  ArticleRecord,
  CreateProjectInput,
  CreateProjectResult,
} from "../types";

// Lazy initialization of Supabase client
let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
    }

    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

/**
 * Busca um projeto pelo ID
 */
export async function getProject(projectId: number): Promise<Project> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("projects")
    .select("id, domain, token, name, user_id, status")
    .eq("id", projectId)
    .single();

  if (error) {
    throw new Error(`Project not found: ${error.message}`);
  }

  return {
    id: data.id,
    domain: data.domain,
    token: data.token,
    name: data.name,
    userId: data.user_id,
    status: data.status,
  };
}

/**
 * Salva um artigo no Supabase
 */
export async function saveArticle(input: {
  userId: string;
  projectId: number;
  title: string;
  wpCategoriesId: number;
}): Promise<ArticleRecord> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("articles")
    .insert({
      user_id: input.userId,
      project_id: input.projectId,
      title: input.title,
      wpCategories_id: input.wpCategoriesId,
      is_approval_article: true,
      credits_used: 1,
      date: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save article: ${error.message}`);
  }

  return {
    id: data.id,
    title: data.title,
    projectId: data.project_id,
    userId: data.user_id,
    wpCategoriesId: data.wpCategories_id,
    isApprovalArticle: data.is_approval_article,
    creditsUsed: data.credits_used,
    date: data.date,
  };
}

/**
 * Atualiza o status do projeto
 */
export async function updateProjectApprovalStatus(
  projectId: number,
  status: "draft" | "processing" | "completed" | "failed",
): Promise<void> {
  const supabase = getSupabase();

  // Mapear status do workflow para status do projeto
  const projectStatus =
    status === "completed" ? "active" : status === "failed" ? "error" : status;

  const { error } = await supabase
    .from("projects")
    .update({
      status: projectStatus,
    })
    .eq("id", projectId);

  if (error) {
    throw new Error(`Failed to update project status: ${error.message}`);
  }
}

/**
 * Registra o início de um workflow na tabela de logs
 */
export async function logWorkflowStart(
  projectId: number,
  workflowId: string,
  workflowType: string,
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase.from("workflow_runs").insert({
    project_id: projectId,
    workflow_id: workflowId,
    workflow_type: workflowType,
    status: "running",
    started_at: new Date().toISOString(),
  });

  if (error) {
    // Log error but don't fail the workflow
    console.error("Failed to log workflow start:", error);
  }
}

/**
 * Atualiza o log de um workflow
 */
export async function logWorkflowComplete(
  workflowId: string,
  status: "completed" | "failed",
  result?: unknown,
  error?: string,
): Promise<void> {
  const supabase = getSupabase();

  const { error: updateError } = await supabase
    .from("workflow_runs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      result: result || null,
      error: error || null,
    })
    .eq("workflow_id", workflowId);

  if (updateError) {
    console.error("Failed to log workflow completion:", updateError);
  }
}

/**
 * Verifica se um domínio já existe (não deletado)
 */
export async function checkDomainExists(domain: string): Promise<boolean> {
  const supabase = getSupabase();

  // Normaliza domínio (remove trailing slash, converte para lowercase)
  const normalizedDomain = domain.replace(/\/$/, "").toLowerCase();

  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("is_deleted", false)
    .or(`domain.eq.${normalizedDomain},domain.eq.${normalizedDomain}/`)
    .limit(1);

  if (error) {
    console.error("Error checking domain:", error);
    throw new Error(`Failed to check domain: ${error.message}`);
  }

  return data && data.length > 0;
}

/**
 * Cria um novo projeto no Supabase
 */
export async function createProject(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: input.userId,
      name: input.name,
      domain: input.domain.replace(/\/$/, "").toLowerCase(),
      default_language: input.defaultLanguage || null,
      login: input.login,
      status: false,
      is_deleted: false,
      is_approved_on_adsense: false,
    })
    .select("id, name, domain, status")
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    project: {
      id: data.id,
      name: data.name,
      domain: data.domain,
      status: data.status,
    },
  };
}
