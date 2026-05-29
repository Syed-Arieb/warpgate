import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { ApiKey, CreateApiKeyResponse } from '../lib/api'
import { Plus, Copy, Trash2, AlertCircle, Loader2, Check, Eye, EyeOff } from 'lucide-react'

export default function ApiKeys() {
  const navigate = useNavigate()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState<CreateApiKeyResponse | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [creating, setCreating] = useState(false)

  const load = () => {
    setLoading(true)
    api.listApiKeys()
      .then(setKeys)
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [navigate])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNewKey(null)
    setCreating(true)
    try {
      const result = await api.createApiKey(newName)
      setNewKey(result)
      setNewName('')
      setShowCreate(false)
      setSuccess('API key created successfully!')
      setTimeout(() => setSuccess(''), 3000)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    setDeleting(id)
    setError('')
    try {
      await api.deleteApiKey(id)
      if (newKey?.id === id) setNewKey(null)
      setSuccess('API key revoked successfully!')
      setTimeout(() => setSuccess(''), 3000)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(null)
    }
  }

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground mt-1">Create and manage API keys for your integrations</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-primary-foreground text-sm font-semibold hover:shadow-lg transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          New API Key
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 flex items-start gap-3 animate-slideDown border border-destructive/20">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm rounded-lg px-4 py-3 flex items-start gap-3 animate-slideDown border border-green-200 dark:border-green-900/40">
          <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {newKey && (
        <div className="rounded-2xl border border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-900/10 p-6 animate-slideUp">
          <p className="text-sm font-semibold mb-4">API Key Created</p>
          <p className="text-sm text-muted-foreground mb-4">Copy it now — you won't be able to see it again:</p>
          <div className="flex gap-3 items-center bg-white dark:bg-slate-950 rounded-lg p-3 border border-green-200 dark:border-green-900/30">
            <code className="flex-1 text-xs font-mono break-all">{newKey.plain_key}</code>
            <button
              onClick={() => handleCopy(newKey.plain_key)}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all font-semibold flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/10 p-6 animate-slideDown shadow-sm">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block mb-2 text-sm font-medium">API Key Name</label>
              <input
                type="text"
                placeholder="e.g., Production API"
                className="w-full border rounded-lg px-4 py-2.5 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all shadow-sm"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 active:scale-95"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3 animate-slideUp">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-border/40 bg-card/50 p-5 h-20 animate-shimmer" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-12 text-center animate-slideUp">
          <Key className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No API keys yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first API key to start integrating</p>
        </div>
      ) : (
        <div className="space-y-3 animate-slideUp">
          {keys.map((key, i) => (
            <div
              key={key.id}
              className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-5 hover:shadow-lg hover:border-primary/20 transition-all hover:scale-[1.01] transform animate-slideUp"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{key.name}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <code className="bg-muted/50 px-2 py-1 rounded font-mono">{key.key_prefix}...</code>
                    {key.last_used_at ? (
                      <span>Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                    ) : (
                      <span>Never used</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(key.id)}
                  disabled={deleting === key.id}
                  className="inline-flex items-center gap-2 text-destructive hover:text-destructive/80 px-3 py-1.5 rounded-lg hover:bg-destructive/10 transition-all disabled:opacity-50 flex-shrink-0"
                  title="Revoke key"
                >
                  {deleting === key.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">Revoke</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Key(props: { className: string }) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 16 -4 -4m4 4l3-3m-9 7a6 6 0 1 0 0 -12 6 6 0 0 0 0 12z"></path>
    </svg>
  )
}
