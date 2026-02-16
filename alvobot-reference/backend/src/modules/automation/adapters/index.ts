// Platform adapter interface & types
export {
  type PlatformAutomationAdapter,
  type PlatformEntity,
  type ActionConfig,
  type ActionResult,
  type ConnectionHealth,
  PLATFORM_ADAPTER_TOKEN,
} from './platform-adapter.interface';

// Adapter implementations
export { GoogleAutomationAdapter } from './google-automation.adapter';
export { MetaAutomationAdapter } from './meta-automation.adapter';
