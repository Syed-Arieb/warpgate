import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api, type User } from '../lib/api'

const navItems = [
  { path: '/', label: 'Home', icon: '⊞' },
  { path: '/sessions', label: 'Sessions', icon: '⊡' },
  { path: '/api-keys', label: 'API Keys', icon: '⚷' },
  { path: '/account', label: 'Account', icon: '⚿' },
  { path: '/admin', label: 'Admin', icon: '⚙', adminOnly: true },
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
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 h-full w-56 border-r bg-card flex flex-col">
        <div className="p-5 border-b">
          <h1 className="text-lg font-bold tracking-tight">Warpgate</h1>
          <p className="text-xs text-muted-foreground mt-0.5">WhatsApp SaaS</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.filter(item => !item.adminOnly || user?.role === 'admin').map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t p-4 space-y-2">
          {user && (
            <div className="px-1">
              <p className="text-xs font-medium truncate">{user.name || user.email}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
          <div className="flex items-center gap-3 px-1 pt-1">
            <button
              onClick={() => setDark(!dark)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {dark ? '☀ Light' : '☾ Dark'}
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-56 p-8">
        <div className="max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
