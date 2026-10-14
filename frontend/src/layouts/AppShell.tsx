import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Avatar, DemoNotice } from '../components/UI'
import { Icon } from '../components/Icon'

const patientNavItems = [
  { to: '/', label: 'Overview', icon: 'home' as const, end: true },
  { to: '/appointments', label: 'Appointments', icon: 'calendar' as const },
  { to: '/health-score', label: 'Health score', icon: 'heart' as const },
  { to: '/medications', label: 'Medications', icon: 'shield' as const },
  { to: '/symptoms', label: 'Symptom info', icon: 'search' as const },
  { to: '/passport', label: 'Health passport', icon: 'user' as const },
  { to: '/profile', label: 'My profile', icon: 'user' as const },
]

const doctorNavItems = [
  { to: '/doctor', label: 'Patient summaries', icon: 'user' as const, end: true },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [search, setSearch] = useState('')
  const searchInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInput.current?.focus()
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [])
  if (!user) return null

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    navigate(`/appointments${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`)
    setSidebarOpen(false)
  }

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  const firstName = user.name.split(/\s+/)[0]
  return (
    <div className="app-layout">
      {sidebarOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Link className="brand" to="/" onClick={() => setSidebarOpen(false)}>
          <span className="brand-mark"><Icon name="heart" size={20} /></span>
          <span>care<span className="brand-light">connect</span><small>YOUR HEALTH, IN GOOD HANDS</small></span>
        </Link>
        <div className="workspace-label">{user.role === 'doctor' ? 'DOCTOR SPACE' : 'PATIENT SPACE'}</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {(user.role === 'doctor' ? doctorNavItems : patientNavItems).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
              <Icon name={item.icon} size={19} /><span>{item.label}</span>
              {item.to === '/appointments' && <span className="nav-count">1</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="care-card">
            <div className="care-card-icon"><Icon name="shield" size={17} /></div>
            <strong>Your care, together.</strong>
            <p>Your health information stays in your hands.</p>
            {user.role !== 'doctor' && <Link to="/profile" onClick={() => setSidebarOpen(false)}>Review profile <Icon name="arrow" size={13} /></Link>}
          </div>
          <button className="sidebar-user" onClick={() => void signOut()} title="Sign out">
            <Avatar name={user.name} size="small" />
            <span className="sidebar-user-copy"><strong>{user.name}</strong><small>{user.role === 'doctor' ? 'Doctor account' : 'Patient account'}</small></span>
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><span className="hamburger" /></button>
          <form className="top-search" onSubmit={submitSearch}>
            <Icon name="search" size={18} />
            <input ref={searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search doctors, care..." aria-label="Search doctors" />
            <kbd>Ctrl K</kbd>
          </form>
          <div className="topbar-actions">
            <div className="popover-wrap">
              <button className={`icon-button notification-button ${showNotifications ? 'is-open' : ''}`} aria-label="Notifications" onClick={() => { setShowNotifications(!showNotifications); setShowAccount(false) }}>
                <Icon name="bell" size={19} /><i />
              </button>
              {showNotifications && <div className="top-popover"><strong>You're all caught up</strong>{user.role === 'doctor' ? <p>Open a patient's Health Passport QR code to verify consent-gated access.</p> : <p>Your booked visit records stay up to date on the appointments page.</p>}<Link to={user.role === 'doctor' ? '/doctor' : '/appointments'} onClick={() => setShowNotifications(false)}>View {user.role === 'doctor' ? 'workspace' : 'appointments'}</Link></div>}
            </div>
            <div className="popover-wrap">
              <button className="top-profile" onClick={() => { setShowAccount(!showAccount); setShowNotifications(false) }}>
                <Avatar name={user.name} size="small" /><span><strong>{firstName}</strong><small>My account</small></span><Icon name="chevron" size={15} />
              </button>
              {showAccount && <div className="top-popover account-popover"><strong>{user.name}</strong><p>{user.email}</p>{user.role !== 'doctor' && <Link to="/profile" onClick={() => setShowAccount(false)}>Profile settings</Link>}<button onClick={() => void signOut()}><Icon name="logout" size={15} /> Sign out</button></div>}
            </div>
          </div>
        </header>
        <main className="page-content">
          {user.demo && <DemoNotice />}
          <Outlet />
          <footer className="app-footer"><span>Care Connect AI</span><span>Made for your well-being <span className="footer-heart">♥</span></span></footer>
        </main>
      </div>
    </div>
  )
}
