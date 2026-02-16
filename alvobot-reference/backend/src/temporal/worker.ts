import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities";
import * as dotenv from "dotenv";

// Carrega variáveis de ambiente
dotenv.config();

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || "localhost:7233";
const TEMPORAL_USE_TLS = process.env.TEMPORAL_USE_TLS === "true";
const TASK_QUEUE = process.env.TEMPORAL_TASK_QUEUE || "alvobot-tasks";

async function run() {
  console.log(
    `Connecting to Temporal at ${TEMPORAL_ADDRESS} (TLS: ${TEMPORAL_USE_TLS})...`,
  );

  // Conecta ao Temporal Server
  const connection = await NativeConnection.connect({
    address: TEMPORAL_ADDRESS,
    tls: TEMPORAL_USE_TLS ? {} : undefined,
  });

  console.log("Connected to Temporal Server");

  // Cria o worker
  const worker = await Worker.create({
    connection,
    namespace: "default",
    taskQueue: TASK_QUEUE,
    workflowsPath: require.resolve("./workflows"),
    activities,
  });

  console.log(`Temporal Worker started on task queue: ${TASK_QUEUE}`);
  console.log("Waiting for tasks...");

  // Roda o worker (bloqueante)
  await worker.run();
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down worker...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down worker...");
  process.exit(0);
});

// Run the worker
run().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
