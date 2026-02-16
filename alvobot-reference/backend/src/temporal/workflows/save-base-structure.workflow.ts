import { proxyActivities, sleep, workflowInfo } from "@temporalio/workflow";
import type * as activities from "../activities";
import { SaveBaseStructureInput, SaveBaseStructureResult } from "../types";

// Configure activities with retry policies
const {
  getProject,
  saveArticle,
  updateProjectApprovalStatus,
  logWorkflowStart,
  logWorkflowComplete,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "30 seconds",
  retry: {
    maximumAttempts: 3,
    initialInterval: "1 second",
    backoffCoefficient: 2,
  },
});

const {
  createCategoryInWordPress,
  configureAuthorInWordPress,
  configureTitleInWordPress,
  configureLogoInWordPress,
  checkWordPressHealth,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "2 minutes", // WordPress pode ser mais lento
  retry: {
    maximumAttempts: 3,
    initialInterval: "2 seconds",
    backoffCoefficient: 2,
  },
});

/**
 * Workflow: Save Base Structure
 *
 * Este workflow é executado quando o usuário submete a estrutura de base para aprovação.
 * Ele configura o WordPress com categorias, autor, título e logo, e salva os artigos no Supabase.
 *
 * Passos:
 * 1. Buscar dados do projeto
 * 2. Verificar se WordPress está acessível
 * 3. Configurar autor, título e logo (em paralelo, se habilitados)
 * 4. Criar categorias no WordPress
 * 5. Salvar artigos no Supabase
 * 6. Atualizar status do projeto
 */
export async function saveBaseStructureWorkflow(
  input: SaveBaseStructureInput,
): Promise<SaveBaseStructureResult> {
  const { workflowId } = workflowInfo();
  const errors: string[] = [];

  // Log workflow start
  await logWorkflowStart(input.projectId, workflowId, "save-base-structure");

  // Marcar projeto como "processando"
  await updateProjectApprovalStatus(input.projectId, "processing");

  try {
    // 1. Buscar dados do projeto
    const project = await getProject(input.projectId);

    // 2. Verificar se WordPress está acessível
    const isWordPressHealthy = await checkWordPressHealth(project);
    if (!isWordPressHealthy) {
      throw new Error(
        `WordPress não está acessível em ${project.domain}. Verifique se o site está online.`,
      );
    }

    // 3. Configurações opcionais do WordPress (em paralelo)
    const configPromises: Promise<void>[] = [];

    if (input.authorToggle) {
      configPromises.push(
        configureAuthorInWordPress(project, input.niche).catch((err) => {
          errors.push(`Erro ao configurar autor: ${err.message}`);
        }),
      );
    }

    if (input.titleToggle) {
      configPromises.push(
        configureTitleInWordPress(project, input.niche).catch((err) => {
          errors.push(`Erro ao configurar título: ${err.message}`);
        }),
      );
    }

    if (input.logoToggle) {
      configPromises.push(
        configureLogoInWordPress(project, input.niche).catch((err) => {
          errors.push(`Erro ao configurar logo: ${err.message}`);
        }),
      );
    }

    // Aguarda todas as configurações
    if (configPromises.length > 0) {
      await Promise.all(configPromises);
    }

    // 4. Criar categorias no WordPress
    const categoryMap = new Map<string, number>();

    for (const categoryName of input.categories) {
      try {
        const category = await createCategoryInWordPress(project, categoryName);
        categoryMap.set(categoryName, category.id);

        // Pequeno delay entre criações para não sobrecarregar a API
        await sleep("500ms");
      } catch (err) {
        const error = err as Error;
        errors.push(
          `Erro ao criar categoria "${categoryName}": ${error.message}`,
        );
      }
    }

    // Se nenhuma categoria foi criada, falha o workflow
    if (categoryMap.size === 0) {
      throw new Error("Nenhuma categoria foi criada. Verifique os erros.");
    }

    // 5. Salvar artigos no Supabase
    let articlesCreated = 0;

    // Remove duplicatas baseado no título
    const uniqueArticles = input.articles.filter(
      (article, index, self) =>
        index === self.findIndex((a) => a.title === article.title),
    );

    for (const article of uniqueArticles) {
      const wpCategoryId = categoryMap.get(article.category);

      if (!wpCategoryId) {
        errors.push(
          `Categoria "${article.category}" não encontrada para artigo "${article.title}"`,
        );
        continue;
      }

      try {
        await saveArticle({
          userId: input.userId,
          projectId: input.projectId,
          title: article.title,
          wpCategoriesId: wpCategoryId,
        });

        articlesCreated++;

        // Pequeno delay para não sobrecarregar o Supabase
        await sleep("100ms");
      } catch (err) {
        const error = err as Error;
        errors.push(
          `Erro ao salvar artigo "${article.title}": ${error.message}`,
        );
      }
    }

    // 6. Marcar projeto como "completo"
    await updateProjectApprovalStatus(input.projectId, "completed");

    const result: SaveBaseStructureResult = {
      success: true,
      categoriesCreated: categoryMap.size,
      articlesCreated,
      errors: errors.length > 0 ? errors : undefined,
    };

    // Log workflow completion
    await logWorkflowComplete(workflowId, "completed", result);

    return result;
  } catch (err) {
    const error = err as Error;

    // Em caso de erro crítico, marcar projeto como "falhou"
    await updateProjectApprovalStatus(input.projectId, "failed");

    // Log workflow failure
    await logWorkflowComplete(workflowId, "failed", undefined, error.message);

    throw error;
  }
}
