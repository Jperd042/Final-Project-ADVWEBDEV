import { useEffect, useId, useRef } from 'react'
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Inbox, LoaderCircle, Search, X } from 'lucide-react'
import { number, statusLabels, stockStatus } from '../lib/format'

export function Brand() {
  return <div className="brand"><div><strong>Stock X</strong><span>Inventory management</span></div></div>
}

export function IconButton({ icon: Icon, label, className = '', ...props }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} {...props}><Icon size={17} aria-hidden="true" /></button>
}

export function Loading({ label = 'Loading...' }) {
  return <div className="state-block" role="status"><LoaderCircle className="spin" size={24} aria-hidden="true" /><span>{label}</span></div>
}

export function ErrorNotice({ message, onRetry }) {
  if (!message) return null
  return <div className="alert alert-danger notice" role="alert"><AlertCircle size={18} aria-hidden="true" /><span>{message}</span>{onRetry && <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>Try again</button>}</div>
}

export function SuccessNotice({ message, onDismiss }) {
  if (!message) return null
  return <div className="alert alert-success notice" role="status"><CheckCircle2 size={18} aria-hidden="true" /><span>{message}</span>{onDismiss && <IconButton icon={X} label="Dismiss notification" onClick={onDismiss} />}</div>
}

export function EmptyState({ title = 'Nothing here yet', detail, action }) {
  return <div className="state-block"><Inbox size={30} strokeWidth={1.5} aria-hidden="true" /><strong>{title}</strong>{detail && <p>{detail}</p>}{action}</div>
}

export function PageHeader({ title, subtitle, action }) {
  return <header className="page-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</header>
}

export function SearchInput({ value, onChange, placeholder = 'Search', label = 'Search' }) {
  return <div className="search-field"><Search size={18} aria-hidden="true" /><input type="search" className="form-control" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={label} maxLength={120} /></div>
}

export function StatusBadge({ product }) {
  const status = stockStatus(product)
  return <span className={`stock-badge ${status}`}><span aria-hidden="true" />{statusLabels[status]}</span>
}

export function Pagination({ page, pages, total, onChange, limit = 10 }) {
  const lastPage = Math.max(1, pages)
  return <div className="pagination-bar"><span>{total ? `${number((page - 1) * limit + 1)}-${number(Math.min(page * limit, total))} of ${number(total)}` : '0 results'}</span><div><IconButton icon={ChevronLeft} label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} /><span aria-live="polite">Page {page} of {lastPage}</span><IconButton icon={ChevronRight} label="Next page" disabled={page >= lastPage} onClick={() => onChange(page + 1)} /></div></div>
}

export function Field({ label, children, hint, ...props }) {
  const id = useId()
  return <div className="field"><label className="form-label" htmlFor={id}>{label}</label>{children ? children(id) : <input id={id} className="form-control" {...props} />}{hint && <div className="field-hint">{hint}</div>}</div>
}

export function SubmitButton({ busy, children, icon: Icon, className = 'btn-primary', ...props }) {
  return <button type="submit" className={`btn ${className}`} disabled={busy} {...props}>{busy ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : Icon && <Icon size={17} aria-hidden="true" />}{busy ? 'Saving...' : children}</button>
}

export function Modal({ title, children, onClose, busy = false, wide = false }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = oldOverflow
      previous?.focus()
    }
  }, [])
  return <dialog ref={ref} className={`app-dialog ${wide ? 'dialog-wide' : ''}`} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}><div className="dialog-header"><h2 id={titleId}>{title}</h2><IconButton icon={X} label="Close dialog" onClick={onClose} disabled={busy} /></div>{children}</dialog>
}
