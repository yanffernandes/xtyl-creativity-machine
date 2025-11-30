/**
 * Options for triggering a confirmation dialog
 */
export interface ConfirmOptions {
  /** Dialog title - displayed prominently */
  title: string;

  /** Descriptive text explaining the action */
  description: string;

  /** Text for the confirm button (default: "Confirm") */
  confirmLabel?: string;

  /** Text for the cancel button (default: "Cancel") */
  cancelLabel?: string;

  /** Visual variant affecting confirm button styling */
  variant?: "default" | "destructive";
}

/**
 * Return type of useConfirm hook
 */
export type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>;

/**
 * Internal state for ConfirmDialogProvider
 */
export interface ConfirmDialogState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
}
