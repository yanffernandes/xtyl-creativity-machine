import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

let sdk: NodeSDK | null = null;

export interface TracerConfig {
  serviceName: string;
  /** OTLP collector endpoint. Defaults to http://localhost:4318/v1/traces */
  otlpEndpoint?: string;
  /** Set false to disable auto-instrumentations. Default true. */
  autoInstrument?: boolean;
}

/**
 * Initialize OpenTelemetry tracing SDK.
 * Must be called BEFORE any other imports/bootstrap (e.g. NestJS).
 */
export function initTracer(config: TracerConfig): void {
  if (sdk) return; // already initialized

  const endpoint = config.otlpEndpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  // Only set up exporter if an endpoint is configured
  const spanProcessor = endpoint
    ? new BatchSpanProcessor(new OTLPTraceExporter({ url: endpoint }))
    : undefined;

  sdk = new NodeSDK({
    serviceName: config.serviceName,
    ...(spanProcessor ? { spanProcessor } : {}),
    instrumentations:
      config.autoInstrument !== false
        ? [
            getNodeAutoInstrumentations({
              '@opentelemetry/instrumentation-fs': { enabled: false },
            }),
          ]
        : [],
  });

  sdk.start();
}

/**
 * Gracefully shut down the tracer (flush pending spans).
 */
export async function shutdownTracer(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
