import { useEffect, type ReactNode } from 'react'
import { Icon } from './Icon'

export function Avatar({ name, initials, tone = 'mint', size = 'normal' }: { name?: string; initials?: string; tone?: string; size?: 'normal' | 'small' | 'large' }) {
  const letters = initials ?? name?.split(/\s+/).map((part) => part[0]).slice(0, 2).join('') ?? 'CC'
  return <span className={`avatar avatar-${tone} avatar-${size}`} aria-label={name}>{letters}</span>
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="page-heading-action">{action}</div>}
    </div>
  )
}

export function DemoNotice() {
  return (
    <div className="demo-notice">
      <Icon name="shield" size={16} />
      <span><strong>Patient workspace demo</strong> · Health and visit details stay in this browser; they are not sent to the server.</span>
    </div>
  )
}

export function Modal({ title, description, onClose, children, footer }: { title: string; description?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header">
          <div><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}</div>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </section>
    </div>
  )
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="section-title"><h2>{title}</h2>{action}</div>
}

export function EmptyState({ icon = 'calendar', title, description, action }: { icon?: 'calendar' | 'heart' | 'shield'; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={24} /></span><h3>{title}</h3><p>{description}</p>{action}</div>
}
