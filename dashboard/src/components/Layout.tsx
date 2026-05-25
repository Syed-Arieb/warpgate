import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api, type User } from '../lib/api'

const navItems = [
  { path: '/', label: 'Home', icon: '⊞' },
  { path: '/sessions', label: 'Sessions', icon: '⊡' },
  { path: '/api-keys', label: 'API Keys', icon: '⚷' },
  { path: '/account', label: 'Account', icon: '⚿' },
  { path: '/admin', label: 'Admin', icon: '⚙', adminOnly: true },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    api.getMe().then(setUser).catch(() => navigate('/login'))
  }, [navigate])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const handleLogout = async () => {
    document.cookie = 'access_token=; path=/; max-age=0'
    document.cookie = 'refresh_token=; path=/; max-age=0'
    navigate('/login')
  }

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path))

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 h-full w-56 border-r bg-card p-4 flex flex-col">
        <h1 className="text-lg font-bold mb-6">Warpgate</h1>
        <nav className="space-y-1 flex-1">
          {navItems.filter(item => !item.adminOnly || user?.role === 'admin').map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive(item.path)
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t pt-4 space-y-2">
          {user && <p className="text-xs text-muted-foreground px-3">{user.email}</p>}
          <div className="flex items-center gap-2 px-3">
            <button
              onClick={() => setDark(!dark)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {dark ? '☀ Light' : '☾ Dark'}
            </button>
            <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-foreground ml-auto">
              Logout
            </button>
          </div>
        </div>
      </aside>
      <main className="ml-56 p-6">
        {children}
      </main>
    </div>
  )
}
