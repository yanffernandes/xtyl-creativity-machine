import api from "@/lib/api";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  toolExecutions?: any[];
  taskList?: any[];
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  summary: string | null;
  message_count: number;
  model_used: string | null;
  is_archived: boolean;
  last_message_at: string | null;
  created_at: string;
}

export interface ConversationDetail extends ConversationSummary {
  project_id: string | null;
  workspace_id: string;
  messages: ChatMessage[];
  document_ids_context: string[];
  folder_ids_context: string[];
  created_document_ids: string[];
  updated_at: string | null;
}

export interface ConversationList {
  conversations: ConversationSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateConversationData {
  workspace_id: string;
  project_id?: string;
  title?: string;
  messages: ChatMessage[];
  model_used?: string;
  document_ids_context?: string[];
  folder_ids_context?: string[];
}

export interface UpdateConversationData {
  title?: string;
  messages?: ChatMessage[];
  is_archived?: boolean;
  created_document_ids?: string[];
}

// Create a new conversation
export async function createConversation(
  data: CreateConversationData
): Promise<ConversationDetail> {
  const response = await api.post("/conversations/", data);
  return response.data;
}

// List conversations
export async function listConversations(
  workspaceId: string,
  projectId?: string,
  isArchived: boolean = false,
  page: number = 1,
  pageSize: number = 20
): Promise<ConversationList> {
  const params: any = {
    workspace_id: workspaceId,
    is_archived: isArchived,
    page,
    page_size: pageSize,
  };
  if (projectId) {
    params.project_id = projectId;
  }
  const response = await api.get("/conversations/", { params });
  return response.data;
}

// Get a specific conversation
export async function getConversation(
  conversationId: string
): Promise<ConversationDetail> {
  const response = await api.get(`/conversations/${conversationId}`);
  return response.data;
}

// Update a conversation
export async function updateConversation(
  conversationId: string,
  data: UpdateConversationData
): Promise<ConversationDetail> {
  const response = await api.put(`/conversations/${conversationId}`, data);
  return response.data;
}

// Add messages to a conversation
export async function addMessages(
  conversationId: string,
  messages: ChatMessage[]
): Promise<ConversationDetail> {
  const response = await api.post(
    `/conversations/${conversationId}/messages`,
    messages
  );
  return response.data;
}

// Add a created document to the conversation
export async function addCreatedDocument(
  conversationId: string,
  documentId: string
): Promise<ConversationDetail> {
  const response = await api.post(
    `/conversations/${conversationId}/add-document`,
    null,
    { params: { document_id: documentId } }
  );
  return response.data;
}

// Delete a conversation
export async function deleteConversation(
  conversationId: string
): Promise<void> {
  await api.delete(`/conversations/${conversationId}`);
}

// Archive a conversation
export async function archiveConversation(
  conversationId: string
): Promise<ConversationDetail> {
  const response = await api.post(`/conversations/${conversationId}/archive`);
  return response.data;
}

// Unarchive a conversation
export async function unarchiveConversation(
  conversationId: string
): Promise<ConversationDetail> {
  const response = await api.post(`/conversations/${conversationId}/unarchive`);
  return response.data;
}
