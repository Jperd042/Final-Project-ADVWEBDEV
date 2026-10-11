import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { errorMessage } from '../lib/api'
import { Brand, ErrorNotice, Field, IconButton, Loading } from '../components/ui'

export default function AuthPage({ register = false }) {
  const { user, loading, error: sessionError, checkSession } = useAuth()
  const location = useLocation()
  if (loading) return <div className="full-page-state"><Brand /><Loading label="Checking your session..." /></div>
  if (sessionError) return <div className="full-page-state"><Brand /><ErrorNotice message={sessionError} onRetry={checkSession} /></div>
  if (user) return <Navigate to={location.state?.from || '/'} replace />
  return <div className="auth-page"><div className="auth-container"><Brand /><AuthForm key={register ? 'register' : 'login'} register={register} /></div><footer className="auth-footer">Stock X / Inventory management</footer></div>
}

function AuthForm({ register }) {
  const { authenticate } = useAuth()
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' })
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const update = (event) => setValues((previous) => ({ ...previous, [event.target.name]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    if (register && values.name.trim().length < 2) return setError('Enter a username with at least 2 characters.')
    if (register && values.password !== values.confirm) return setError('Passwords do not match.')
    setBusy(true)
    setError('')
    try {
      const payload = { email: values.email.trim(), password: values.password }
      if (register) payload.name = values.name.trim()
      await authenticate(register ? 'register' : 'login', payload)
    } catch (failure) { setError(errorMessage(failure)) } finally { setBusy(false) }
  }

  return <><div className="auth-heading"><h1>{register ? 'Create your account' : 'Welcome back'}</h1><p>{register ? 'Enter your information.' : 'Sign in to your account.'}</p></div><form onSubmit={submit}><ErrorNotice message={error} /><fieldset disabled={busy} className="auth-fields">{register && <Field label="Username" name="name" autoComplete="nickname" minLength={2} maxLength={80} required value={values.name} onChange={update} />}
    <Field label="Email address" type="email" name="email" autoComplete="email" required maxLength={254} value={values.email} onChange={update} />
    <Field label="Password">{(id) => <div className="password-field"><input id={id} className="form-control" type={visible ? 'text' : 'password'} name="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} maxLength={72} required value={values.password} onChange={update} /><IconButton icon={visible ? EyeOff : Eye} label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((value) => !value)} /></div>}</Field>
    {register && <Field label="Confirm password" type="password" name="confirm" autoComplete="new-password" minLength={8} maxLength={72} required value={values.confirm} onChange={update} />}
    <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : null}{busy ? (register ? 'Creating account...' : 'Signing in...') : (register ? 'Create account' : 'Sign in')}{!busy && <ArrowRight size={18} aria-hidden="true" />}</button>
  </fieldset></form><p className="auth-switch">{register ? 'Already have an account?' : 'New to Stock X?'} <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p></>
}
