import { Project, WordPressCategory } from "../types";

/**
 * Cria uma categoria no WordPress via REST API
 */
export async function createCategoryInWordPress(
  project: Project,
  categoryName: string,
): Promise<WordPressCategory> {
  const authToken = Buffer.from(`alvobot:${project.token}`).toString("base64");

  const response = await fetch(`${project.domain}/wp-json/wp/v2/categories`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: categoryName }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // Se a categoria já existe, retorna o ID existente
    if (errorData.code === "term_exists") {
      return {
        id: errorData.data?.term_id || 0,
        name: categoryName,
        slug:
          errorData.data?.term_slug ||
          categoryName.toLowerCase().replace(/\s+/g, "-"),
        alreadyExisted: true,
      };
    }

    throw new Error(
      `WordPress API error: ${errorData.message || response.statusText}`,
    );
  }

  const data = await response.json();

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    alreadyExisted: false,
  };
}

/**
 * Configura o autor no WordPress (via webhook externo)
 * Este webhook cria um autor com base no nicho do projeto
 */
export async function configureAuthorInWordPress(
  project: Project,
  niche: string,
): Promise<void> {
  const webhookUrl =
    process.env.WEBHOOK_AUTHOR_URL ||
    "https://webhook-app.crisfranklin.com.br/webhook/cd7bfc18-ab8e-4257-8e15-58c722326ec4";

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      alvobot_token: project.token,
      wp_url: project.domain,
      niche,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Failed to configure author: ${errorText}`);
  }
}

/**
 * Configura o título do site no WordPress (via webhook externo)
 */
export async function configureTitleInWordPress(
  project: Project,
  niche: string,
): Promise<void> {
  const webhookUrl =
    process.env.WEBHOOK_TITLE_URL ||
    "https://webhook-app.crisfranklin.com.br/webhook/25101007-4668-4035-bf5e-b07218564460";

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      alvobot_token: project.token,
      wp_url: project.domain,
      niche,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Failed to configure title: ${errorText}`);
  }
}

/**
 * Configura o logo do site no WordPress (via webhook externo)
 */
export async function configureLogoInWordPress(
  project: Project,
  niche: string,
): Promise<void> {
  const webhookUrl =
    process.env.WEBHOOK_LOGO_URL ||
    "https://webhook-app.crisfranklin.com.br/webhook/18b254b9-d702-497f-9525-fda429689a90";

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      alvobot_token: project.token,
      wp_url: project.domain,
      niche,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Failed to configure logo: ${errorText}`);
  }
}

/**
 * Verifica se o WordPress está acessível
 */
export async function checkWordPressHealth(project: Project): Promise<boolean> {
  try {
    const response = await fetch(`${project.domain}/wp-json/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
