import { useState } from 'react'
import { Activity, Boxes, ChevronRight, LayoutDashboard, LogOut, Menu, UserRound, X } from 'lucide-react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { errorMessage } from '../lib/api'
import { Brand, ErrorNotice, IconButton, Loading } from './ui'

export function ProtectedRoute() {
  const { user, loading, error, checkSession } = useAuth()
  const location = useLocation()
  if (loading) return <div className="full-page-state"><Brand /><Loading label="Checking your session..." /></div>
  if (error) return <div className="full-page-state"><Brand /><ErrorNotice message={error} onRetry={checkSession} /></div>
  return user ? <Outlet /> : <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
}

const navigation = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Boxes },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/profile', label: 'Profile', icon: UserRound },
]

export function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { pathname } = useLocation()

  async function signOut() {
    setBusy(true)
    setError('')
    try { await logout() } catch (failure) { setError(errorMessage(failure)) } finally { setBusy(false) }
  }

  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a>
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <div className="sidebar-brand"><Link to="/" onClick={() => setOpen(false)} aria-label="Stock X overview"><Brand /></Link><IconButton className="mobile-only" icon={X} label="Close navigation" onClick={() => setOpen(false)} /></div>
      <div className="nav-caption">INVENTORY</div>
      <nav aria-label="Main navigation">{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}><Icon size={19} aria-hidden="true" /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><button type="button" className="sign-out" onClick={signOut} disabled={busy}><LogOut size={18} aria-hidden="true" />{busy ? 'Signing out...' : 'Sign out'}</button></div>
    </aside>
    {open && <button className="nav-overlay" aria-label="Close navigation" title="Close navigation" onClick={() => setOpen(false)} />}
    <div className="main-shell"><header className="topbar"><div className="breadcrumb-trail"><IconButton className="mobile-only" icon={Menu} label="Open navigation" onClick={() => setOpen(true)} aria-expanded={open} /><span className="desktop-only">Stock X</span><ChevronRight size={14} className="desktop-only" aria-hidden="true" /><strong>{navigation.find((item) => item.to === pathname)?.label || 'Stock X'}</strong></div><Link to="/profile" className="account-link" title="Your profile"><span className="account-name">{user.name}</span><span className="avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span></Link></header>
      <main id="main-content" tabIndex={-1}><ErrorNotice message={error} /><Outlet /></main>
    </div>
  </div>
}
