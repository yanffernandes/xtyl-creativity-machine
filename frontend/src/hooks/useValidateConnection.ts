/**
 * useValidateConnection Hook
 *
 * Validates connections between workflow nodes based on their
 * input/output type compatibility. Provides visual feedback for
 * invalid connection attempts.
 */

import { useCallback, useState } from "react";
import { Connection, useReactFlow } from "reactflow";
import {
  isConnectionValid,
  getConnectionError,
  NODE_TYPE_CONFIGS,
} from "@/lib/workflow-types";

export interface ConnectionValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface UseValidateConnectionReturn {
  /** Validate a connection between two nodes */
  validateConnection: (connection: Connection) => ConnectionValidationResult;
  /** Check if a connection is valid (for use in onConnect) */
  isValidConnection: (connection: Connection) => boolean;
  /** Current error message for invalid connection attempt */
  connectionError: string | null;
  /** Clear the current connection error */
  clearConnectionError: () => void;
  /** Set an error message for invalid connection attempt */
  setConnectionError: (error: string | null) => void;
  /** Get the node type from a node ID */
  getNodeType: (nodeId: string) => string | undefined;
}

export function useValidateConnection(): UseValidateConnectionReturn {
  const { getNode } = useReactFlow();
  const [connectionError, setConnectionError] = useState<string | null>(null);

  /**
   * Get the type of a node by its ID
   */
  const getNodeType = useCallback(
    (nodeId: string): string | undefined => {
      const node = getNode(nodeId);
      return node?.type;
    },
    [getNode]
  );

  /**
   * Validate a connection between two nodes
   */
  const validateConnection = useCallback(
    (connection: Connection): ConnectionValidationResult => {
      const { source, target } = connection;

      if (!source || !target) {
        return { isValid: false, error: "Invalid connection: missing source or target" };
      }

      const sourceType = getNodeType(source);
      const targetType = getNodeType(target);

      if (!sourceType || !targetType) {
        return { isValid: false, error: "Invalid connection: unknown node type" };
      }

      // Check if source has output capability
      const sourceConfig = NODE_TYPE_CONFIGS[sourceType];
      if (!sourceConfig) {
        return { isValid: false, error: `Unknown source node type: ${sourceType}` };
      }

      // Check if target has input capability
      const targetConfig = NODE_TYPE_CONFIGS[targetType];
      if (!targetConfig) {
        return { isValid: false, error: `Unknown target node type: ${targetType}` };
      }

      // Validate type compatibility
      if (!isConnectionValid(sourceType, targetType)) {
        const error = getConnectionError(sourceType, targetType);
        return { isValid: false, error };
      }

      return { isValid: true, error: null };
    },
    [getNodeType]
  );

  /**
   * Check if a connection is valid (boolean return for ReactFlow onConnect)
   */
  const isValidConnection = useCallback(
    (connection: Connection): boolean => {
      const result = validateConnection(connection);

      if (!result.isValid) {
        setConnectionError(result.error);
      } else {
        setConnectionError(null);
      }

      return result.isValid;
    },
    [validateConnection]
  );

  /**
   * Clear the current connection error
   */
  const clearConnectionError = useCallback(() => {
    setConnectionError(null);
  }, []);

  return {
    validateConnection,
    isValidConnection,
    connectionError,
    clearConnectionError,
    setConnectionError,
    getNodeType,
  };
}
