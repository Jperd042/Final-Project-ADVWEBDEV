const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
const numberFormatter = new Intl.NumberFormat('en-PH')
const dateFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

export const money = (value) => currencyFormatter.format(value ?? 0)
export const number = (value) => numberFormatter.format(value ?? 0)
export const dateTime = (value) => value ? dateFormatter.format(new Date(value)) : '-'
export const stockStatus = ({ quantity, reorderLevel }) => quantity === 0 ? 'out' : quantity <= reorderLevel ? 'low' : 'healthy'
export const statusLabels = { out: 'Out of stock', low: 'Low stock', healthy: 'In stock' }
