import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { User } from '../lib/api'
import { AlertCircle, Loader2, Check } from 'lucide-react'

export default function Account() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [pwOld, setPwOld] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  const load = () => {
    setLoading(true)
    api.getMe()
      .then(u => { setUser(u); setName(u.name); setEmail(u.email) })
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [navigate])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    try {
      const updated = await api.updateMe({ name, email })
      setUser(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwNew !== pwConfirm) {
      setPwError('Passwords do not match')
      return
    }
    if (pwNew.length < 8) {
      setPwError('Password must be at least 8 characters')
      return
    }
    setPwError('')
    setPwSaved(false)
    setPwLoading(true)
    try {
      await api.changePassword(pwOld, pwNew)
      setPwOld('')
      setPwNew('')
      setPwConfirm('')
      setPwSaved(true)
      setTimeout(() => setPwSaved(false), 3000)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Password change failed')
    } finally {
      setPwLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and security</p>
      </div>

      <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/10 p-6 animate-slideUp">
        <h2 className="font-semibold mb-2">{user.plan.name} Plan</h2>
        <p className="text-sm text-muted-foreground">
          {user.plan.max_sessions} sessions &middot; {user.plan.max_api_keys} API keys &middot; {user.plan.max_webhooks} webhooks
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl animate-slideUp">
        <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 mb-6 flex items-start gap-3 border border-destructive/20 animate-slideDown">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {saved && (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm rounded-lg px-4 py-3 mb-6 flex items-start gap-3 border border-green-200 dark:border-green-900/40 animate-slideDown">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Profile updated successfully</span>
            </div>
          )}
          <form onSubmit={handleUpdate} className="space-y-5">
            <div>
              <label className="block mb-2 text-sm font-medium">Full Name</label>
              <input
                type="text"
                className="w-full border rounded-lg px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all shadow-sm"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">Email Address</label>
              <input
                type="email"
                className="w-full border rounded-lg px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all shadow-sm"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-semibold hover:shadow-lg transition-all active:scale-95"
            >
              Save Changes
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-6">Change Password</h2>
          {pwError && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 mb-6 flex items-start gap-3 border border-destructive/20 animate-slideDown">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{pwError}</span>
            </div>
          )}
          {pwSaved && (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm rounded-lg px-4 py-3 mb-6 flex items-start gap-3 border border-green-200 dark:border-green-900/40 animate-slideDown">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Password changed successfully</span>
            </div>
          )}
          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <label className="block mb-2 text-sm font-medium">Current Password</label>
              <input
                type="password"
                className="w-full border rounded-lg px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all shadow-sm"
                value={pwOld}
                onChange={e => setPwOld(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">New Password</label>
              <input
                type="password"
                className="w-full border rounded-lg px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all shadow-sm"
                value={pwNew}
                onChange={e => setPwNew(e.target.value)}
                required
                minLength={8}
              />
              {pwNew && pwNew.length < 8 && (
                <p className="text-xs text-destructive mt-2">Password must be at least 8 characters</p>
              )}
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">Confirm Password</label>
              <input
                type="password"
                className="w-full border rounded-lg px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all shadow-sm"
                value={pwConfirm}
                onChange={e => setPwConfirm(e.target.value)}
                required
                minLength={8}
              />
              {pwConfirm && pwNew !== pwConfirm && (
                <p className="text-xs text-destructive mt-2">Passwords do not match</p>
              )}
            </div>
            <button
              type="submit"
              disabled={pwLoading || pwNew.length < 8 || pwNew !== pwConfirm}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {pwLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {pwLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
