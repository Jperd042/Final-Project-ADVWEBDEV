import { useState } from 'react'
import { RotateCw } from 'lucide-react'
import { useDebouncedValue, useResource } from '../hooks/useResource'
import { EmptyState, ErrorNotice, IconButton, Loading, PageHeader, Pagination, SearchInput } from '../components/ui'
import MovementTable from '../components/MovementTable'

export default function Activity() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)
  const query = new URLSearchParams({ page, limit: 10, search: debouncedSearch })
  const { data, error, loading, refresh } = useResource(`/movements?${query}`)

  return <><PageHeader title="Activity" subtitle="A complete history of your stock movements." /><section className="data-section" aria-label="Stock movement history"><div className="table-toolbar"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search product, SKU, or note..." label="Search activity" /><IconButton icon={RotateCw} label="Refresh activity" onClick={refresh} disabled={loading} /></div>{loading ? <Loading label="Loading activity..." /> : error ? <div className="section-padding"><ErrorNotice message={error} onRetry={refresh} /></div> : data?.items.length ? <><MovementTable items={data.items} /><Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} /></> : <EmptyState title={search ? 'No matching activity' : 'No activity yet'} detail={search ? 'No stock movements match your search.' : 'No stock movements have been recorded.'} action={search && <button className="btn btn-outline-secondary" onClick={() => { setSearch(''); setPage(1) }}>Clear search</button>} />}</section></>
}
