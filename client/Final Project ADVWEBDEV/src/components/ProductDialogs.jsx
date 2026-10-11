import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, Pencil, Trash2 } from 'lucide-react'
import { api, errorMessage } from '../lib/api'
import { dateTime, money, number } from '../lib/format'
import { useResource } from '../hooks/useResource'
import { ErrorNotice, Field, Loading, Modal, StatusBadge, SubmitButton } from './ui'

export function ProductForm({ product, categories, onClose, onSaved }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [values, setValues] = useState({ name: product?.name || '', sku: product?.sku || '', category: product?.category || '', price: product?.price ?? '', quantity: 0, reorderLevel: product?.reorderLevel ?? 5, description: product?.description || '' })
  const update = (event) => setValues((previous) => ({ ...previous, [event.target.name]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    const payload = { name: values.name.trim(), sku: values.sku.trim(), category: values.category.trim(), price: Number(values.price), reorderLevel: Number(values.reorderLevel), description: values.description.trim() }
    if (!payload.name || !payload.sku || !payload.category) return setError('Name, SKU, and category cannot be blank.')
    if (!product) payload.quantity = Number(values.quantity)
    setBusy(true)
    setError('')
    try {
      if (product) await api.patch(`/products/${product._id}`, payload)
      else await api.post('/products', payload)
      onSaved(product ? 'Product updated.' : 'Product added.')
    } catch (failure) { setError(errorMessage(failure)) } finally { setBusy(false) }
  }

  return <Modal title={product ? 'Edit product' : 'Add product'} onClose={onClose} busy={busy} wide><form onSubmit={submit}><div className="dialog-body"><ErrorNotice message={error} /><fieldset disabled={busy} className="form-grid">
    <div className="span-2"><Field label="Product name" name="name" value={values.name} onChange={update} required maxLength={120} autoFocus /></div>
    <Field label="SKU" name="sku" value={values.sku} onChange={update} required maxLength={40} />
    <Field label="Category" name="category" value={values.category} onChange={update} required maxLength={60} list="product-categories" /><datalist id="product-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist>
    <Field label="Unit price (PHP)" name="price" type="number" min="0" max="1000000000" step="0.01" value={values.price} onChange={update} required />
    <Field label="Reorder level" name="reorderLevel" type="number" min="0" max="1000000000" step="1" value={values.reorderLevel} onChange={update} required />
    {!product && <Field label="Opening quantity" name="quantity" type="number" min="0" max="1000000000" step="1" value={values.quantity} onChange={update} required />}
    <div className="span-2"><Field label="Description (optional)">{(id) => <textarea id={id} className="form-control" name="description" rows={3} maxLength={500} value={values.description} onChange={update} />}</Field></div>
  </fieldset></div><div className="dialog-footer"><button className="btn btn-light" type="button" onClick={onClose} disabled={busy}>Cancel</button><SubmitButton busy={busy} icon={Check}>{product ? 'Save changes' : 'Add product'}</SubmitButton></div></form></Modal>
}

export function StockDialog({ product, initialType = 'in', onClose, onSaved }) {
  const [type, setType] = useState(initialType)
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const amount = Number(quantity)
  const balance = product.quantity + (type === 'in' ? amount : -amount)
  const max = type === 'out' ? product.quantity : 1000000000 - product.quantity
  const valid = Number.isInteger(amount) && amount > 0 && amount <= max

  async function submit(event) {
    event.preventDefault()
    if (!valid) return setError('Enter a valid quantity within the available balance.')
    setBusy(true)
    setError('')
    try {
      await api.post(`/products/${product._id}/stock`, { type, quantity: amount, note: note.trim() })
      onSaved(type === 'in' ? 'Stock received.' : 'Stock issued.')
    } catch (failure) { setError(errorMessage(failure)) } finally { setBusy(false) }
  }

  return <Modal title="Adjust stock" onClose={onClose} busy={busy}><form onSubmit={submit}><div className="dialog-body"><div className="dialog-product"><strong>{product.name}</strong><span>{product.sku}</span></div><ErrorNotice message={error} /><fieldset disabled={busy}>
    <div className="segmented-control" role="group" aria-label="Movement type"><button type="button" className={type === 'in' ? 'selected' : ''} aria-pressed={type === 'in'} onClick={() => { setType('in'); setError('') }}><ArrowDownLeft size={18} aria-hidden="true" />Stock in</button><button type="button" className={type === 'out' ? 'selected' : ''} aria-pressed={type === 'out'} onClick={() => { setType('out'); setError('') }}><ArrowUpRight size={18} aria-hidden="true" />Stock out</button></div>
    <div className="balance-line"><span>Current stock</span><strong>{number(product.quantity)} units</strong></div>
    <Field label="Quantity" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} min="1" max={Math.max(1, max)} step="1" required autoFocus />
    {max === 0 && <p className="text-danger small mt-2">{type === 'out' ? 'No stock available to issue.' : 'Maximum stock capacity reached.'}</p>}
    <div className="mt-3"><Field label="Note (optional)">{(id) => <textarea id={id} className="form-control" value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={250} />}</Field></div>
    <div className="balance-line balance-result"><span>New balance</span><strong className={balance < 0 ? 'text-danger' : ''}>{valid ? `${number(balance)} units` : '-'}</strong></div>
  </fieldset></div><div className="dialog-footer"><button className="btn btn-light" type="button" onClick={onClose} disabled={busy}>Cancel</button><SubmitButton busy={busy} icon={type === 'in' ? ArrowDownLeft : ArrowUpRight} disabled={busy || !valid}>{type === 'in' ? 'Receive stock' : 'Issue stock'}</SubmitButton></div></form></Modal>
}

export function DeleteDialog({ product, onClose, onSaved }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function remove(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try { await api.delete(`/products/${product._id}`); onSaved('Product deleted.') } catch (failure) { setError(errorMessage(failure)) } finally { setBusy(false) }
  }
  return <Modal title="Delete product?" onClose={onClose} busy={busy}><form onSubmit={remove}><div className="dialog-body"><ErrorNotice message={error} /><p className="mb-0">Delete <strong>{product.name}</strong> ({product.sku})? This action cannot be undone.</p></div><div className="dialog-footer"><button className="btn btn-light" type="button" onClick={onClose} disabled={busy} autoFocus>Cancel</button><SubmitButton busy={busy} icon={Trash2} className="btn-danger">Delete product</SubmitButton></div></form></Modal>
}

export function ProductDetail({ id, onClose, onEdit, onStock }) {
  const { data, loading, error, refresh } = useResource(`/products/${id}`)
  const product = data?.product
  return <Modal title="Product details" onClose={onClose} wide><div className="dialog-body">{loading ? <Loading label="Loading product..." /> : error ? <ErrorNotice message={error} onRetry={refresh} /> : product && <><div className="detail-heading"><div className="dialog-product"><h3>{product.name}</h3><span>{product.sku}</span></div><StatusBadge product={product} /></div><dl className="detail-grid"><div><dt>Category</dt><dd>{product.category}</dd></div><div><dt>Unit price</dt><dd>{money(product.price)}</dd></div><div><dt>On hand</dt><dd>{number(product.quantity)} units</dd></div><div><dt>Reorder level</dt><dd>{number(product.reorderLevel)} units</dd></div><div><dt>Inventory value</dt><dd>{money(product.price * product.quantity)}</dd></div><div><dt>Last updated</dt><dd>{dateTime(product.updatedAt)}</dd></div><div className="span-2"><dt>Created</dt><dd>{dateTime(product.createdAt)}</dd></div><div className="span-2"><dt>Description</dt><dd className="description-text">{product.description || 'No description.'}</dd></div></dl></>}</div><div className="dialog-footer"><button className="btn btn-light" type="button" onClick={onClose}>Close</button>{product && <><button className="btn btn-outline-secondary" type="button" onClick={() => onEdit(product)}><Pencil size={16} aria-hidden="true" />Edit</button><button className="btn btn-primary" type="button" onClick={() => onStock(product)}><ArrowDownLeft size={17} aria-hidden="true" />Adjust stock</button></>}</div></Modal>
}
