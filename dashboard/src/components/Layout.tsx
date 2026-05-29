import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api, type User } from '../lib/api'
import { Home, MessageSquare, Key, Settings, Shield, Sun, Moon, LogOut } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/sessions', label: 'Sessions', icon: MessageSquare },
  { path: '/api-keys', label: 'API Keys', icon: Key },
  { path: '/account', label: 'Account', icon: Settings },
  { path: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    setLoading(true)
    api.getMe()
      .then(setUser)
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false))
  }, [navigate])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const handleLogout = async () => {
    try { await api.logout() } catch {}
    navigate('/login')
  }

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <aside className="fixed left-0 top-0 h-full w-56 border-r border-border/40 bg-card/50 backdrop-blur-sm flex flex-col shadow-sm dark:border-border/20">
        <div className="p-6 border-b border-border/40 dark:border-border/20">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
              <span className="text-lg font-bold text-white">W</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Warpgate</h1>
              <p className="text-xs text-muted-foreground">WhatsApp SaaS</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.filter(item => !item.adminOnly || user?.role === 'admin').map(item => {
            const Icon = item.icon as any
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border/40 p-4 space-y-3 dark:border-border/20">
          {user && (
            <div className="px-2 py-2 rounded-lg bg-muted/30">
              <p className="text-xs font-semibold truncate">{user.name || user.email}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className="flex-1 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-all"
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{dark ? 'Light' : 'Dark'}</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 text-xs text-destructive hover:text-destructive/80 px-2 py-1.5 rounded-lg hover:bg-destructive/10 transition-all"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-56 min-h-screen">
        <div className="p-8">
          <div className="max-w-7xl mx-auto animate-slideUp">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
