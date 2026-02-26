"use client";

import { useConfirmContext } from "./ConfirmDialogProvider";

/**
 * Hook to access the imperative confirm function
 *
 * @example
 * ```tsx
 * const confirm = useConfirm();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: "Delete Item",
 *     description: "Are you sure you want to delete this item?",
 *     variant: "destructive",
 *   });
 *
 *   if (!confirmed) return;
 *   await deleteItem();
 * };
 * ```
 */
export function useConfirm() {
  return useConfirmContext();
}
