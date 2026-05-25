import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { ApiKey, CreateApiKeyResponse } from '../lib/api'
import Layout from '../components/Layout'

export default function ApiKeys() {
  const navigate = useNavigate()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState<CreateApiKeyResponse | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const load = () => {
    api.listApiKeys()
      .then(setKeys)
      .catch(() => navigate('/login'))
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
    if (!confirm('Revoke this API key?')) return
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
    <Layout>
      <div className="max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">API Keys</h1>
        </div>

        {error && <p className="text-destructive text-sm mb-4">{error}</p>}

        {newKey && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium mb-1">API key created - copy it now, it won't be shown again:</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 text-xs bg-background border rounded px-2 py-1 break-all">{newKey.plain_key}</code>
              <button onClick={() => handleCopy(newKey.plain_key)} className="text-xs px-2 py-1 rounded border hover:bg-muted">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm hover:opacity-90 mb-4"
        >
          + New API Key
        </button>

        {showCreate && (
          <form onSubmit={handleCreate} className="bg-card border rounded-lg p-4 mb-4 flex gap-2">
            <input
              type="text"
              placeholder="Key name"
              className="flex-1 border rounded px-3 py-2 bg-background"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" className="bg-primary text-primary-foreground px-3 py-2 rounded text-sm hover:opacity-90">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-muted-foreground px-3 py-2">
              Cancel
            </button>
          </form>
        )}

        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          <div className="space-y-2">
            {keys.map(key => (
              <div key={key.id} className="bg-card border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {key.key_prefix}...
                    {key.last_used_at ? ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}` : ' · Never used'}
                  </p>
                </div>
                <button onClick={() => handleDelete(key.id)} className="text-destructive hover:underline text-sm">
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
