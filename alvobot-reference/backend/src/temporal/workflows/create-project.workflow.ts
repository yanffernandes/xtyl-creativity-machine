import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "../activities";
import { CreateProjectInput, CreateProjectResult } from "../types";

const { checkDomainExists, createProject } = proxyActivities<typeof activities>(
  {
    startToCloseTimeout: "30s",
    retry: {
      maximumAttempts: 3,
      initialInterval: "1s",
      backoffCoefficient: 2,
    },
  },
);

/**
 * Workflow para criar um novo projeto
 *
 * 1. Verifica se o domínio já existe
 * 2. Se não existe, cria o projeto
 */
export async function createProjectWorkflow(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
  // Step 1: Verificar se domínio já existe
  const domainExists = await checkDomainExists(input.domain);

  if (domainExists) {
    return {
      success: false,
      error: "Este domínio já está cadastrado em outro projeto",
    };
  }

  // Step 2: Criar o projeto
  const result = await createProject(input);

  return result;
}
