import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { ApiKey, CreateApiKeyResponse } from '../lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export default function ApiKeys() {
  const navigate = useNavigate()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState<CreateApiKeyResponse | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null)

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
    try {
      const result = await api.createApiKey(newName)
      setNewKey(result)
      setNewName('')
      setShowCreate(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    }
  }

  const handleDelete = async (id: number) => {
    setDeleteTarget(null)
    try {
      await api.deleteApiKey(id)
      if (newKey?.id === id) setNewKey(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New API Key
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {newKey && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 mb-6">
          <p className="text-sm font-medium mb-2">API key created -- copy it now, it won't be shown again:</p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 text-xs bg-background border rounded-lg px-3 py-2 break-all font-mono">{newKey.plain_key}</code>
            <button
              onClick={() => handleCopy(newKey.plain_key)}
              className="text-xs px-3 py-2 rounded-lg border hover:bg-muted transition-colors font-medium"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-card border rounded-xl p-5 mb-6 flex gap-3">
          <input
            type="text"
            placeholder="Key name"
            className="flex-1 border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            required
            autoFocus
          />
          <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Create
          </button>
          <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-muted-foreground px-3 py-2 hover:text-foreground transition-colors">
            Cancel
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed p-12 text-center">
          <p className="text-muted-foreground">No API keys yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(key => (
            <div key={key.id} className="bg-card border rounded-xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="font-medium">{key.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {key.key_prefix}...
                  {key.last_used_at ? <> &middot; Last used {new Date(key.last_used_at).toLocaleDateString()}</> : ' &middot; Never used'}
                </p>
              </div>
              <button
                onClick={() => setDeleteTarget(key)}
                className="text-sm text-destructive px-3 py-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke <strong>{deleteTarget?.name}</strong>? This action cannot be undone. Any applications using this key will lose access immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={() => deleteTarget && handleDelete(deleteTarget.id)} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Revoke
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
