export interface ChatAttachment {
  type: string;
  content: string;
  filename: string;
  metadata?: Record<string, unknown>;
}

export interface CurrentDocument {
  id: string;
  title: string;
  content: string;
}

export interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  attachments?: ChatAttachment[];
}

export interface ChatCompletionRequest {
  messages: ChatMessageInput[];
  model: string;
  workspace_id?: string;
  conversation_id?: string | null;
  project_id?: string;
  active_board_id?: string | null;
  use_rag?: boolean;
  current_document?: CurrentDocument;
  current_document_id?: string;
  document_ids?: string[];
  folder_ids?: string[];
  autonomous_mode?: boolean;
  runtime?: string;
}
