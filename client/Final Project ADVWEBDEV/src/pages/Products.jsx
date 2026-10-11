import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Eye, Pencil, Plus, RotateCw, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useDebouncedValue, useResource } from '../hooks/useResource'
import { money, number } from '../lib/format'
import { EmptyState, ErrorNotice, IconButton, Loading, PageHeader, Pagination, SearchInput, StatusBadge, SuccessNotice } from '../components/ui'
import { DeleteDialog, ProductDetail, ProductForm, StockDialog } from '../components/ProductDialogs'

export default function Products() {
  const [params, setParams] = useSearchParams()
  const status = ['low', 'out'].includes(params.get('status')) ? params.get('status') : 'all'
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [pagination, setPagination] = useState({ status, page: 1 })
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const page = pagination.status === status ? pagination.page : 1
  const setPage = (page) => setPagination({ status, page })
  const query = new URLSearchParams({ page, limit: 10, search: debouncedSearch, category, status })
  const { data, error, loading, refresh } = useResource(`/products?${query}`)
  const open = (type, product, initialType) => setDialog({ type, product, initialType })
  const close = () => setDialog(null)
  const categories = [...new Set([...(data?.categories || []), ...(category ? [category] : [])])].sort()

  function saved(message) {
    if (page > 1) setPage(1)
    else refresh()
    close()
    setNotice(message)
  }

  return <><PageHeader title="Products" subtitle="Your catalog and current stock levels." action={<button className="btn btn-primary" onClick={() => open('form')}><Plus size={18} aria-hidden="true" />Add product</button>} /><SuccessNotice message={notice} onDismiss={() => setNotice('')} />
    <section className="data-section" aria-label="Product catalog"><div className="table-toolbar"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} label="Search products" placeholder="Search name or SKU..." /><div className="filter-controls"><select className="form-select" aria-label="Filter by category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1) }}><option value="">All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select><select className="form-select" aria-label="Filter by stock status" value={status} onChange={(event) => { setParams(event.target.value === 'all' ? {} : { status: event.target.value }); setPage(1) }}><option value="all">All stock levels</option><option value="low">Low stock</option><option value="out">Out of stock</option></select><IconButton icon={RotateCw} label="Refresh products" onClick={refresh} disabled={loading} /></div></div>
      {loading ? <Loading label="Loading products..." /> : error ? <div className="section-padding"><ErrorNotice message={error} onRetry={refresh} /></div> : data?.items.length ? <><div className="table-responsive"><table className="table stock-table products-table"><thead><tr><th>Product</th><th>Category</th><th className="text-end">Unit price</th><th className="text-end">On hand</th><th>Status</th><th className="text-end">Actions</th></tr></thead><tbody>{data.items.map((product) => <tr key={product._id}><td><button className="product-cell product-link" onClick={() => open('detail', product)} title={`View ${product.name}`}><strong>{product.name}</strong><span>{product.sku}</span></button></td><td className="category-cell">{product.category}</td><td className="text-end numeric">{money(product.price)}</td><td className="text-end numeric"><strong>{number(product.quantity)}</strong><span className="stock-threshold">Min. {number(product.reorderLevel)}</span></td><td><StatusBadge product={product} /></td><td><div className="row-actions"><IconButton icon={Eye} label={`View ${product.name}`} onClick={() => open('detail', product)} /><IconButton icon={Pencil} label={`Edit ${product.name}`} onClick={() => open('form', product)} /><IconButton icon={ArrowDownLeft} label={`Receive ${product.name}`} onClick={() => open('stock', product, 'in')} /><IconButton icon={ArrowUpRight} label={`Issue ${product.name}`} disabled={product.quantity === 0} onClick={() => open('stock', product, 'out')} /><IconButton icon={Trash2} label={`Delete ${product.name}`} className="danger-action" onClick={() => open('delete', product)} /></div></td></tr>)}</tbody></table></div><Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} /></> : <EmptyState title={search || category || status !== 'all' ? 'No matching products' : 'No products yet'} detail={search || category || status !== 'all' ? 'No products match the current filters.' : 'Your product catalog is empty.'} action={search || category || status !== 'all' ? <button className="btn btn-outline-secondary" onClick={() => { setSearch(''); setCategory(''); setParams({}); setPage(1) }}>Clear filters</button> : <button className="btn btn-primary" onClick={() => open('form')}><Plus size={17} aria-hidden="true" />Add product</button>} />}
    </section>
    {dialog?.type === 'form' && <ProductForm key={dialog.product?._id || 'new'} product={dialog.product} categories={categories} onClose={close} onSaved={saved} />}
    {dialog?.type === 'detail' && <ProductDetail id={dialog.product._id} onClose={close} onEdit={(product) => open('form', product)} onStock={(product) => open('stock', product)} />}
    {dialog?.type === 'stock' && <StockDialog product={dialog.product} initialType={dialog.initialType} onClose={close} onSaved={saved} />}
    {dialog?.type === 'delete' && <DeleteDialog product={dialog.product} onClose={close} onSaved={saved} />}
  </>
}
