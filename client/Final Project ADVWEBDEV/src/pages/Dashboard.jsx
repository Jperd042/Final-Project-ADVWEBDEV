import { useState } from 'react'
import { AlertTriangle, ArrowDownLeft, ArrowRight, Boxes, CircleDollarSign, Package, PackageX, Plus, RotateCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useResource } from '../hooks/useResource'
import { money, number } from '../lib/format'
import { EmptyState, ErrorNotice, IconButton, Loading, PageHeader, StatusBadge, SuccessNotice } from '../components/ui'
import MovementTable from '../components/MovementTable'
import { ProductForm, StockDialog } from '../components/ProductDialogs'

export default function Dashboard() {
  const { data, loading, error, refresh } = useResource('/dashboard')
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  const stats = data ? [
    { label: 'Total products', value: number(data.summary.products), icon: Boxes, color: 'emerald', to: '/products' },
    { label: 'Units on hand', value: number(data.summary.totalUnits), icon: Package, color: 'blue', to: '/products' },
    { label: 'Inventory value', value: money(data.summary.inventoryValue), icon: CircleDollarSign, color: 'neutral', to: '/products' },
    { label: 'Low stock', value: number(data.summary.lowStock), icon: AlertTriangle, color: 'amber', to: '/products?status=low' },
    { label: 'Out of stock', value: number(data.summary.outOfStock), icon: PackageX, color: 'red', to: '/products?status=out' },
  ] : []

  function saved(message) {
    setDialog(null)
    setNotice(message)
    refresh()
  }

  return <><PageHeader title="Overview" subtitle="A current view of your inventory." action={<div className="heading-actions"><IconButton icon={RotateCw} label="Refresh overview" onClick={refresh} disabled={loading} /><button className="btn btn-primary" onClick={() => setDialog({ type: 'add' })}><Plus size={18} aria-hidden="true" />Add product</button></div>} /><SuccessNotice message={notice} onDismiss={() => setNotice('')} />
    {loading ? <Loading label="Loading overview..." /> : error ? <ErrorNotice message={error} onRetry={refresh} /> : data && <>
      <section className="stats-grid" aria-label="Inventory summary">{stats.map(({ label, value, icon: Icon, color, to }) => <Link key={label} className="stat-item" to={to}><div className="stat-label"><span>{label}</span><Icon size={18} className={`stat-icon ${color}`} aria-hidden="true" /></div><strong className={label === 'Inventory value' ? 'stat-value currency-value' : 'stat-value'}>{value}</strong><span className="stat-link">View products<ArrowRight size={13} aria-hidden="true" /></span></Link>)}</section>
      <section className="data-section dashboard-section"><div className="section-heading"><div><h2>Stock alerts <span className="count-badge">{number(data.summary.lowStock + data.summary.outOfStock)}</span></h2><p>Products at or below their reorder level.</p></div><Link className="text-link" to="/products?status=low">View low stock<ArrowRight size={15} aria-hidden="true" /></Link></div>
        {data.lowStock.length ? <div className="table-responsive"><table className="table stock-table"><thead><tr><th>Product</th><th>Category</th><th className="text-end">On hand</th><th className="text-end">Reorder level</th><th>Status</th><th className="text-end">Action</th></tr></thead><tbody>{data.lowStock.map((product) => <tr key={product._id}><td><div className="product-cell"><strong>{product.name}</strong><span>{product.sku}</span></div></td><td className="category-cell">{product.category}</td><td className="text-end numeric"><strong>{number(product.quantity)}</strong></td><td className="text-end numeric">{number(product.reorderLevel)}</td><td><StatusBadge product={product} /></td><td className="text-end"><button className="btn btn-sm btn-outline-secondary" onClick={() => setDialog({ type: 'stock', product })}><ArrowDownLeft size={15} aria-hidden="true" />Receive</button></td></tr>)}</tbody></table></div> : <EmptyState title={data.summary.products ? 'Stock levels look good' : 'No stock alerts'} detail={data.summary.products ? 'No products are below their reorder level.' : 'No inventory has been added yet.'} />}
      </section>
      <section className="data-section dashboard-section"><div className="section-heading"><div><h2>Recent activity</h2><p>The latest inventory movements.</p></div><Link className="text-link" to="/activity">View all<ArrowRight size={15} aria-hidden="true" /></Link></div>{data.recentMovements.length ? <MovementTable items={data.recentMovements} compact /> : <EmptyState title="No stock movements yet" detail="Your inventory activity will appear here." />}</section>
    </>}
    {dialog?.type === 'add' && <ProductForm categories={[]} onClose={() => setDialog(null)} onSaved={saved} />}
    {dialog?.type === 'stock' && <StockDialog product={dialog.product} onClose={() => setDialog(null)} onSaved={saved} />}
  </>
}
