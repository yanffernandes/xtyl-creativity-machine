/**
 * useConditionBuilder Hook
 * T056: Manages condition tree state for automation rules
 *
 * This hook provides functionality to:
 * - Add/remove conditions and groups
 * - Update condition values
 * - Change logical operators (AND/OR)
 * - Navigate and manipulate nested condition trees
 */

import { useState, useCallback } from 'react';
import type {
  ConditionTree,
  ConditionGroup,
  Condition,
  MetricType,
  ConditionOperator,
  LogicalOperator,
  PeriodType,
} from '../types';

// Generate unique IDs for conditions/groups
let idCounter = 0;
const generateId = () => `condition_${Date.now()}_${idCounter++}`;

// Helper to create a new condition
export const createCondition = (
  metric: MetricType = 'impressions',
  operator: ConditionOperator = '>',
  value = 0,
  period?: PeriodType
): Condition & { id: string } => ({
  id: generateId(),
  type: 'condition',
  metric,
  operator,
  value,
  period,
});

// Helper to create a new condition group
export const createConditionGroup = (
  operator: LogicalOperator = 'AND',
  children: Array<ConditionGroup | Condition> = []
): ConditionGroup & { id: string } => ({
  id: generateId(),
  type: 'group',
  operator,
  children,
});

// Type for condition/group with ID
type ConditionWithId = Condition & { id: string };
type GroupWithId = ConditionGroup & { id: string; children: ConditionTreeWithId[] };
export type ConditionTreeWithId = ConditionWithId | GroupWithId;

interface UseConditionBuilderReturn {
  // State
  conditions: ConditionTreeWithId;

  // Actions
  addCondition: (parentId: string | null, condition?: Partial<Condition>) => void;
  addGroup: (parentId: string | null, operator?: LogicalOperator) => void;
  removeNode: (nodeId: string) => void;
  updateCondition: (nodeId: string, updates: Partial<Condition>) => void;
  updateGroupOperator: (nodeId: string, operator: LogicalOperator) => void;

  // Utilities
  reset: (initialConditions?: ConditionTree) => void;
  toConditionTree: () => ConditionTree;
  isValid: () => boolean;
  getValidationErrors: () => string[];
}

// Helper to add IDs to a condition tree
const addIdsToTree = (tree: ConditionTree): ConditionTreeWithId => {
  if (tree.type === 'condition') {
    return { ...tree, id: generateId() };
  }
  return {
    ...tree,
    id: generateId(),
    children: tree.children.map(addIdsToTree),
  };
};

// Helper to remove IDs from a condition tree
const removeIdsFromTree = (tree: ConditionTreeWithId): ConditionTree => {
  if (tree.type === 'condition') {
    const { id: _id, ...rest } = tree;
    void _id;
    return rest;
  }
  const { id: _id, children, ...rest } = tree;
  void _id;
  return {
    ...rest,
    children: children.map(removeIdsFromTree),
  };
};

// Find and update a node in the tree
const findAndUpdate = (
  tree: ConditionTreeWithId,
  nodeId: string,
  updater: (node: ConditionTreeWithId) => ConditionTreeWithId | null
): ConditionTreeWithId | null => {
  if (tree.id === nodeId) {
    return updater(tree);
  }

  if (tree.type === 'group') {
    const newChildren: ConditionTreeWithId[] = [];
    for (const child of tree.children) {
      const result = findAndUpdate(child, nodeId, updater);
      if (result !== null) {
        newChildren.push(result);
      }
    }
    return {
      ...tree,
      children: newChildren,
    };
  }

  return tree;
};

// Add a child to a group
const addChildToGroup = (
  tree: ConditionTreeWithId,
  parentId: string | null,
  child: ConditionTreeWithId
): ConditionTreeWithId => {
  // If parentId is null, add to root if it's a group
  if (parentId === null) {
    if (tree.type === 'group') {
      return {
        ...tree,
        children: [...tree.children, child],
      };
    }
    // If root is a condition, wrap it in a group
    return createConditionGroup('AND', [tree, child]) as GroupWithId;
  }

  return findAndUpdate(tree, parentId, (node) => {
    if (node.type === 'group') {
      return {
        ...node,
        children: [...node.children, child],
      };
    }
    return node;
  }) || tree;
};

export function useConditionBuilder(
  initialConditions?: ConditionTree
): UseConditionBuilderReturn {
  // Initialize with a default group if no conditions provided
  const getInitialState = useCallback((): ConditionTreeWithId => {
    if (initialConditions) {
      return addIdsToTree(initialConditions);
    }
    // Default: empty AND group with one condition
    const defaultCondition = createCondition('impressions', '==', 0);
    return createConditionGroup('AND', [defaultCondition]) as GroupWithId;
  }, [initialConditions]);

  const [conditions, setConditions] = useState<ConditionTreeWithId>(getInitialState);

  // Add a new condition
  const addCondition = useCallback((
    parentId: string | null,
    partialCondition?: Partial<Condition>
  ) => {
    const newCondition = createCondition(
      partialCondition?.metric || 'impressions',
      partialCondition?.operator || '>',
      partialCondition?.value || 0,
      partialCondition?.period
    );

    setConditions((prev) => addChildToGroup(prev, parentId, newCondition));
  }, []);

  // Add a new group
  const addGroup = useCallback((
    parentId: string | null,
    operator: LogicalOperator = 'AND'
  ) => {
    const defaultCondition = createCondition('impressions', '>', 0);
    const newGroup = createConditionGroup(operator, [defaultCondition]) as GroupWithId;

    setConditions((prev) => addChildToGroup(prev, parentId, newGroup));
  }, []);

  // Remove a node
  const removeNode = useCallback((nodeId: string) => {
    setConditions((prev) => {
      // Can't remove root
      if (prev.id === nodeId) {
        return prev;
      }

      const result = findAndUpdate(prev, nodeId, () => null);

      // If we removed all children from a group, add a default condition
      if (result && result.type === 'group' && result.children.length === 0) {
        return {
          ...result,
          children: [createCondition('impressions', '>', 0)],
        };
      }

      return result || prev;
    });
  }, []);

  // Update a condition
  const updateCondition = useCallback((
    nodeId: string,
    updates: Partial<Condition>
  ) => {
    setConditions((prev) =>
      findAndUpdate(prev, nodeId, (node) => {
        if (node.type === 'condition') {
          return { ...node, ...updates };
        }
        return node;
      }) || prev
    );
  }, []);

  // Update a group's logical operator
  const updateGroupOperator = useCallback((
    nodeId: string,
    operator: LogicalOperator
  ) => {
    setConditions((prev) =>
      findAndUpdate(prev, nodeId, (node) => {
        if (node.type === 'group') {
          return { ...node, operator };
        }
        return node;
      }) || prev
    );
  }, []);

  // Reset to initial state or new conditions
  const reset = useCallback((newConditions?: ConditionTree) => {
    if (newConditions) {
      setConditions(addIdsToTree(newConditions));
    } else {
      setConditions(getInitialState());
    }
  }, [getInitialState]);

  // Convert back to ConditionTree (without IDs)
  const toConditionTree = useCallback((): ConditionTree => {
    return removeIdsFromTree(conditions);
  }, [conditions]);

  // Get validation errors
  const getValidationErrors = useCallback((): string[] => {
    const errors: string[] = [];

    const validateNode = (node: ConditionTreeWithId): void => {
      if (node.type === 'condition') {
        if (node.value < 0 && !['ctr', 'cpa', 'roas'].includes(node.metric)) {
          errors.push(`Valor não pode ser negativo para ${node.metric}`);
        }
        if (node.metric === 'ctr' && (node.value < 0 || node.value > 100)) {
          errors.push('CTR deve estar entre 0 e 100%');
        }
        if (node.metric === 'budget_spent_percent' && (node.value < 0 || node.value > 100)) {
          errors.push('Percentual de orçamento deve estar entre 0 e 100%');
        }
      } else {
        if (node.children.length === 0) {
          errors.push('Grupo não pode estar vazio');
        }
        node.children.forEach(validateNode);
      }
    };

    validateNode(conditions);
    return errors;
  }, [conditions]);

  // Validate the condition tree
  const isValid = useCallback((): boolean => {
    const errors = getValidationErrors();
    return errors.length === 0;
  }, [getValidationErrors]);

  return {
    conditions,
    addCondition,
    addGroup,
    removeNode,
    updateCondition,
    updateGroupOperator,
    reset,
    toConditionTree,
    isValid,
    getValidationErrors,
  };
}

export default useConditionBuilder;
