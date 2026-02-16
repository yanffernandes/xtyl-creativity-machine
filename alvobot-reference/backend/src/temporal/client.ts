import { Client, Connection } from "@temporalio/client";

let clientInstance: Client | null = null;
let connectionInstance: Connection | null = null;

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || "localhost:7233";

/**
 * Obtém uma instância singleton do Temporal Client
 */
export async function getTemporalClient(): Promise<Client> {
  if (!clientInstance) {
    connectionInstance = await Connection.connect({
      address: TEMPORAL_ADDRESS,
    });

    clientInstance = new Client({
      connection: connectionInstance,
    });
  }

  return clientInstance;
}

/**
 * Fecha a conexão com o Temporal (para shutdown graceful)
 */
export async function closeTemporalClient(): Promise<void> {
  if (connectionInstance) {
    await connectionInstance.close();
    connectionInstance = null;
    clientInstance = null;
  }
}
