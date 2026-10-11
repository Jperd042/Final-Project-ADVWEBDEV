import { useState } from 'react'
import { LoaderCircle, Save, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api, errorMessage } from '../lib/api'
import { dateTime } from '../lib/format'
import { ErrorNotice, Field, Modal, PageHeader, SubmitButton, SuccessNotice } from '../components/ui'

export default function Profile() {
  const { user, setUser } = useAuth()
  const [values, setValues] = useState({ name: user.name, currentPassword: '', password: '', confirm: '' })
  const [deleting, setDeleting] = useState(false)
  const [changePassword, setChangePassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const update = (event) => setValues((previous) => ({ ...previous, [event.target.name]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    setNotice('')
    if (values.name.trim().length < 2) return setError('Enter a username with at least 2 characters.')
    if (changePassword && values.password !== values.confirm) return setError('New passwords do not match.')
    setError('')
    setBusy(true)
    try {
      const payload = { name: values.name.trim() }
      if (changePassword) Object.assign(payload, { currentPassword: values.currentPassword, password: values.password })
      const { data } = await api.patch('/auth/profile', payload)
      setUser(data.user)
      setValues({ name: data.user.name, currentPassword: '', password: '', confirm: '' })
      setChangePassword(false)
      setNotice('Profile updated successfully.')
    } catch (failure) { setError(errorMessage(failure)) } finally { setBusy(false) }
  }

  return <>
    <PageHeader title="Profile" subtitle="Your account details and sign-in security." />
    <div className="profile-page">
      <SuccessNotice message={notice} onDismiss={() => setNotice('')} />
      <ErrorNotice message={error} />
      <div className="profile-identity"><span className="avatar avatar-large" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span><div><h2>{user.name}</h2><p>{user.email}</p><span>Member since {dateTime(user.createdAt)}</span></div></div>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <section className="settings-section">
            <div className="settings-heading"><UserRound size={19} aria-hidden="true" /><h2>Personal information</h2></div>
            <div className="form-grid">
              <Field label="Username" name="name" autoComplete="nickname" minLength={2} maxLength={80} value={values.name} onChange={update} required />
              <Field label="Email address" type="email" name="email" value={user.email} disabled />
            </div>
          </section>
          <section className="settings-section">
            <div className="settings-heading"><ShieldCheck size={19} aria-hidden="true" /><h2>Security</h2></div>
            <div className="form-check form-switch"><input className="form-check-input" id="change-password" type="checkbox" role="switch" checked={changePassword} onChange={(event) => { setChangePassword(event.target.checked); setValues((previous) => ({ ...previous, currentPassword: '', password: '', confirm: '' })) }} /><label className="form-check-label" htmlFor="change-password">Change password</label></div>
            {changePassword && <div className="form-grid password-settings"><div className="span-2"><Field label="Current password" type="password" name="currentPassword" autoComplete="current-password" maxLength={72} value={values.currentPassword} onChange={update} required /></div><Field label="New password" type="password" name="password" autoComplete="new-password" minLength={8} maxLength={72} value={values.password} onChange={update} required /><Field label="Confirm new password" type="password" name="confirm" autoComplete="new-password" minLength={8} maxLength={72} value={values.confirm} onChange={update} required /></div>}
          </section>
        </fieldset>
        <div className="settings-footer"><SubmitButton busy={busy} icon={Save}>Save changes</SubmitButton></div>
      </form>
      <section className="account-deletion">
        <div><h2>Delete account</h2><p>Permanently delete your account, inventory, and stock history. This cannot be undone.</p></div>
        <button type="button" className="btn btn-outline-danger" disabled={busy} onClick={() => setDeleting(true)}><Trash2 size={17} aria-hidden="true" />Delete account</button>
      </section>
    </div>
    {deleting && <DeleteAccountDialog onClose={() => setDeleting(false)} />}
  </>
}

function DeleteAccountDialog({ onClose }) {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!confirmed) return
    setBusy(true)
    setError('')
    try {
      await api.delete('/auth/account', { data: { currentPassword: password, confirmation: 'DELETE' } })
      setUser(null)
      navigate('/login', { replace: true })
    } catch (failure) {
      setError(errorMessage(failure))
      setBusy(false)
    }
  }

  return <Modal title="Permanently delete account?" onClose={onClose} busy={busy}>
    <form onSubmit={submit}>
      <div className="dialog-body">
        <p>Your account, all products, and stock history will be permanently deleted. This cannot be undone.</p>
        <ErrorNotice message={error} />
        <fieldset disabled={busy}>
          <Field label="Current password" type="password" autoComplete="current-password" maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} />
          <div className="form-check mt-3"><input className="form-check-input" type="checkbox" id="confirm-account-deletion" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required /><label className="form-check-label" htmlFor="confirm-account-deletion">I understand this permanently deletes my account and inventory.</label></div>
        </fieldset>
      </div>
      <div className="dialog-footer">
        <button type="button" className="btn btn-light" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn-danger" disabled={busy || !confirmed || !password}>{busy ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}{busy ? 'Deleting...' : 'Delete permanently'}</button>
      </div>
    </form>
  </Modal>
}
