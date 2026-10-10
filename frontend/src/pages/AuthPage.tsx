import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Icon } from '../components/Icon'

export function AuthPage({ registration = false }: { registration?: boolean }) {
  const { user, login, register, signInDemo } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  if (user) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      if (registration) {
        const name = `${String(form.get('firstName')).trim()} ${String(form.get('lastName')).trim()}`.trim()
        await register(name, String(form.get('email')), String(form.get('password')))
      } else {
        await login(String(form.get('email')), String(form.get('password')))
      }
      const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'
      navigate(destination, { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function enterDemo() {
    signInDemo()
    navigate('/', { replace: true })
  }

  return (
    <div className="auth-page">
      <section className="auth-visual">
        <Link to="/login" className="brand auth-brand">
          <span className="brand-mark"><Icon name="heart" size={20} /></span>
          <span>care<span className="brand-light">connect</span><small>YOUR HEALTH, IN GOOD HANDS</small></span>
        </Link>
        <div className="auth-message">
          <div className="auth-kicker"><span /> A more personal kind of care</div>
          <h1>Better health starts with <em>feeling seen.</em></h1>
          <p>One thoughtful place for your care, your progress, and the people who help you feel your best.</p>
          <div className="auth-proof"><div className="proof-avatars"><span>MC</span><span>AP</span><span>OW</span><span>+</span></div><p><strong>Care that keeps up with you.</strong><br />Your health journey, all in one place.</p></div>
        </div>
        <div className="auth-visual-foot"><span>Thoughtful care. Clear next steps.</span><span>© 2026 Care Connect</span></div>
        <div className="visual-shape visual-shape-one" /><div className="visual-shape visual-shape-two" />
      </section>
      <section className="auth-panel">
        <div className="auth-panel-top"><span>Patient portal</span><span>Need help? <a href="mailto:support@careconnect.example">Contact us</a></span></div>
        <div className="auth-form-wrap">
          <span className="auth-mobile-mark"><Icon name="heart" size={22} /></span>
          <p className="eyebrow">{registration ? 'YOUR NEXT CHAPTER' : 'WELCOME BACK'}</p>
          <h2>{registration ? 'Create your account' : 'Good to see you again'}</h2>
          <p className="auth-subtitle">{registration ? 'A few details to get your care space ready.' : 'Sign in to pick up where you left off.'}</p>
          <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
            {registration && <div className="field-row">
              <label>First name<input name="firstName" autoComplete="given-name" placeholder="Alex" required maxLength={60} /></label>
              <label>Last name<input name="lastName" autoComplete="family-name" placeholder="Morgan" required maxLength={60} /></label>
            </div>}
            <label>Email address<input type="email" name="email" autoComplete="email" placeholder="you@example.com" required /></label>
            <label>Password<input type="password" name="password" autoComplete={registration ? 'new-password' : 'current-password'} placeholder={registration ? 'At least 12 characters' : 'Enter your password'} required minLength={registration ? 12 : undefined} maxLength={128} /></label>
            {!registration && <div className="form-meta"><span>Sessions are protected with a secure sign-in cookie.</span><span>Secure sign in</span></div>}
            {error && <div className="auth-error" role="alert"><Icon name="shield" size={17} />{error}</div>}
            <button className="button button-primary auth-submit" disabled={submitting}>{submitting ? 'Please wait…' : registration ? 'Create patient account' : 'Sign in'}<Icon name="arrow" size={16} /></button>
          </form>
          <div className="auth-divider"><span />or<span /></div>
          <button className="button button-secondary demo-button" onClick={enterDemo}><Icon name="sparkle" size={17} /> Explore the demo workspace</button>
          <p className="demo-caption">Synthetic patient data only · Nothing is saved to the server</p>
          <p className="auth-switch">{registration ? 'Already have an account?' : 'New to Care Connect?'} <Link to={registration ? '/login' : '/register'}>{registration ? 'Sign in' : 'Create an account'}</Link></p>
        </div>
        <div className="auth-panel-foot"><Icon name="shield" size={14} /> Your information is protected and private.</div>
      </section>
    </div>
  )
}
