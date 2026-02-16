import { Client, Connection } from "@temporalio/client";
import { saveBaseStructureWorkflow } from "./workflows";
import { SaveBaseStructureInput } from "./types";
import * as dotenv from "dotenv";

dotenv.config();

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || "localhost:7233";
const TASK_QUEUE = process.env.TEMPORAL_TASK_QUEUE || "alvobot-tasks";

async function run() {
  console.log(`Connecting to Temporal at ${TEMPORAL_ADDRESS}...`);

  const connection = await Connection.connect({
    address: TEMPORAL_ADDRESS,
  });

  const client = new Client({ connection });

  // Dados de teste
  const testInput: SaveBaseStructureInput = {
    projectId: 1,
    userId: "test-user-123",
    categories: ["Tecnologia", "Inovação", "Startups"],
    articles: [
      { id: "art-1", title: "O Futuro da IA", category: "Tecnologia" },
      { id: "art-2", title: "Startups em 2025", category: "Startups" },
    ],
    installationType: "fast",
    authorToggle: false,
    logoToggle: false,
    titleToggle: false,
    niche: "tech",
  };

  console.log("Starting workflow with test data...");
  console.log("Input:", JSON.stringify(testInput, null, 2));

  const handle = await client.workflow.start(saveBaseStructureWorkflow, {
    taskQueue: TASK_QUEUE,
    workflowId: `test-save-base-structure-${Date.now()}`,
    args: [testInput],
  });

  console.log(`\nWorkflow started!`);
  console.log(`Workflow ID: ${handle.workflowId}`);
  console.log(`Run ID: ${handle.firstExecutionRunId}`);
  console.log(
    `\nView in UI: http://localhost:8233/namespaces/default/workflows/${handle.workflowId}`,
  );

  console.log("\nWaiting for workflow to complete...");
  const result = await handle.result();

  console.log("\nWorkflow completed!");
  console.log("Result:", JSON.stringify(result, null, 2));

  await connection.close();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
