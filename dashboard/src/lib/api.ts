const BASE = '/api'

interface ApiError {
  error: string
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as ApiError
    throw new Error(body.error || `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export interface User {
  id: number
  email: string
  name: string
  role: string
  plan_id: number
  email_verified: boolean
  created_at: string
  updated_at: string
  plan: Plan
}

export interface Plan {
  id: number
  name: string
  max_sessions: number
  max_api_keys: number
  max_webhooks: number
  max_webhook_deliveries: number
  rate_limit: number
}

export interface AuditLog {
  id: number
  user_id: number
  action: string
  resource: string
  resource_id: string
  ip: string
  user_agent: string
  metadata: string
  created_at: string
}

export interface PaginatedAuditLogs {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
}

export interface SystemStats {
  total_users: number
  total_sessions: number
  connected_sessions: number
  total_messages: number
  total_webhooks: number
  active_engines: number
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

export interface ApiKey {
  id: number
  user_id: number
  name: string
  key_prefix: string
  last_used_at: string | null
  created_at: string
}

export interface CreateApiKeyResponse extends ApiKey {
  plain_key: string
}

export interface Session {
  id: number
  user_id: number
  name: string
  status: 'disconnected' | 'connecting' | 'connected' | 'banned'
  phone_number: string | null
  proxy_config: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: number
  session_id: number
  user_id: number
  direction: 'in' | 'out'
  from_jid: string
  to_jid: string
  message_type: string
  content: string | null
  media_url: string | null
  media_mime_type: string | null
  wa_id: string | null
  status: string
  error_code: string | null
  sent_at: string | null
  created_at: string
}

export interface PaginatedMessages {
  messages: Message[]
  total: number
  page: number
  limit: number
}

export interface Webhook {
  id: number
  session_id: number
  user_id: number
  name: string
  url: string
  secret: string
  events: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface WebhookLog {
  id: number
  webhook_id: number
  event_type: string
  payload: string
  response_status: number
  response_body: string
  attempt: number
  max_attempts: number
  success: boolean
  error: string
  created_at: string
}

export interface CreateWebhookResponse extends Webhook {
  plain_secret?: string
}

export interface PaginatedWebhookLogs {
  logs: WebhookLog[]
  total: number
  page: number
  limit: number
}

export interface Contact {
  jid: string
  name: string
  push_name: string
}

export interface Group {
  id: number
  group_jid: string
  name: string
  member_count: number
}

export const api = {
  register: (body: { email: string; password: string; name: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  refresh: () =>
    request<AuthResponse>('/auth/refresh', { method: 'POST' }),

  logout: () =>
    request<void>('/auth/logout', { method: 'POST' }),

  getMe: () =>
    request<User>('/users/me'),

  updateMe: (body: { name?: string; email?: string }) =>
    request<User>('/users/me', { method: 'PUT', body: JSON.stringify(body) }),

  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ status: string }>('/users/me/password', { method: 'PUT', body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }) }),

  listApiKeys: () =>
    request<ApiKey[]>('/users/me/api-keys/'),

  createApiKey: (name: string) =>
    request<CreateApiKeyResponse>('/users/me/api-keys/', { method: 'POST', body: JSON.stringify({ name }) }),

  updateApiKey: (id: number, body: { name?: string; allowed_ips?: string; daily_limit?: number }) =>
    request<ApiKey>(`/users/me/api-keys/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteApiKey: (id: number) =>
    request<void>(`/users/me/api-keys/${id}`, { method: 'DELETE' }),

  listSessions: () =>
    request<Session[]>('/sessions'),

  getSession: (id: number) =>
    request<Session>(`/sessions/${id}`),

  getSessionStatus: (id: number) =>
    request<{ status: string; phone_number: string | null }>(`/sessions/${id}/status`),

  createSession: (name: string) =>
    request<Session>('/sessions', { method: 'POST', body: JSON.stringify({ name }) }),

  updateSession: (id: number, body: { name?: string; phone_number?: string; proxy_config?: string }) =>
    request<Session>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteSession: (id: number) =>
    request<void>(`/sessions/${id}`, { method: 'DELETE' }),

  startSession: (id: number) =>
    request<{ status: string }>(`/sessions/${id}/start`, { method: 'POST' }),

  stopSession: (id: number) =>
    request<{ status: string }>(`/sessions/${id}/stop`, { method: 'POST' }),

  logoutSession: (id: number) =>
    request<{ status: string }>(`/sessions/${id}/logout`, { method: 'POST' }),

  subscribeQRSession: (id: number, onQR: (code: string) => void): () => void => {
    const es = new EventSource(`/api/sessions/${id}/qr`)
    es.onmessage = (evt) => onQR(evt.data)
    es.onerror = () => es.close()
    return () => es.close()
  },

  getMessageHistory: (sessionId: number, page = 1, limit = 50) =>
    request<PaginatedMessages>(`/messages/${sessionId}?page=${page}&limit=${limit}`),

  sendTextMessage: (sessionId: number, to: string, text: string) =>
    request<Message>('/messages/text', { method: 'POST', body: JSON.stringify({ session_id: sessionId, to, text }) }),

  sendReaction: (sessionId: number, to: string, messageId: string, emoji: string) =>
    request<Message>('/messages/reaction', { method: 'POST', body: JSON.stringify({ session_id: sessionId, to, message_id: messageId, emoji }) }),

  sendBulk: (sessionId: number, to: string[], text: string) =>
    request<{ sent: number; failed: number }>('/messages/bulk', { method: 'POST', body: JSON.stringify({ session_id: sessionId, to, text }) }),

  listWebhooks: (sessionId: number) =>
    request<Webhook[]>(`/sessions/${sessionId}/webhooks`),

  getWebhook: (sessionId: number, webhookId: number) =>
    request<Webhook>(`/sessions/${sessionId}/webhooks/${webhookId}`),

  createWebhook: (sessionId: number, body: { name: string; url: string; secret?: string; events: string[] }) =>
    request<CreateWebhookResponse>(`/sessions/${sessionId}/webhooks`, { method: 'POST', body: JSON.stringify(body) }),

  updateWebhook: (sessionId: number, webhookId: number, body: { name?: string; url?: string; secret?: string; events?: string[]; active?: boolean }) =>
    request<Webhook>(`/sessions/${sessionId}/webhooks/${webhookId}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteWebhook: (sessionId: number, webhookId: number) =>
    request<void>(`/sessions/${sessionId}/webhooks/${webhookId}`, { method: 'DELETE' }),

  getWebhookLogs: (sessionId: number, webhookId: number, page = 1, limit = 50) =>
    request<PaginatedWebhookLogs>(`/sessions/${sessionId}/webhooks/${webhookId}/logs?page=${page}&limit=${limit}`),

  listContacts: (sessionId: number) =>
    request<Contact[]>(`/sessions/${sessionId}/contacts`),

  listGroups: (sessionId: number) =>
    request<Group[]>(`/sessions/${sessionId}/groups`),

  createGroup: (sessionId: number, name: string, participants: string[]) =>
    request<Group>(`/sessions/${sessionId}/groups`, { method: 'POST', body: JSON.stringify({ name, participants }) }),

  getGroup: (sessionId: number, groupJid: string) =>
    request<Group>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupJid)}`),

  deleteGroup: (sessionId: number, groupJid: string) =>
    request<void>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupJid)}`, { method: 'DELETE' }),

  getAuditLogs: (page = 1, limit = 50) =>
    request<PaginatedAuditLogs>(`/users/me/audit?page=${page}&limit=${limit}`),

  adminListUsers: (page = 1, limit = 50) =>
    request<{ users: User[]; total: number; page: number; limit: number }>(`/admin/users?page=${page}&limit=${limit}`),

  adminListSessions: (page = 1, limit = 50, userId?: number) =>
    request<{ sessions: Session[]; total: number; page: number; limit: number }>(
      `/admin/sessions?page=${page}&limit=${limit}${userId ? `&user_id=${userId}` : ''}`),

  adminGetStats: () =>
    request<SystemStats>('/admin/stats'),

  adminDeleteSession: (id: number) =>
    request<void>(`/admin/sessions/${id}`, { method: 'DELETE' }),
}
