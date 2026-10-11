import { ArrowDownLeft, ArrowUpRight, PackagePlus } from 'lucide-react'
import { dateTime, number } from '../lib/format'

const movementTypes = { in: { label: 'Stock in', icon: ArrowDownLeft }, out: { label: 'Stock out', icon: ArrowUpRight }, opening: { label: 'Opening', icon: PackagePlus } }

export default function MovementTable({ items, compact = false }) {
  return <div className="table-responsive"><table className="table stock-table"><thead><tr><th>Product</th><th>Movement</th><th className="text-end">Quantity</th>{!compact && <th className="text-end">Balance</th>}<th>Date & time</th>{!compact && <th>Note</th>}</tr></thead><tbody>{items.map((item) => {
    const { label, icon: Icon } = movementTypes[item.type] || movementTypes.opening
    return <tr key={item._id}><td><div className="product-cell"><strong>{item.productName}</strong><span>{item.sku}</span></div></td><td><span className={`movement-type ${item.type}`}><Icon size={15} aria-hidden="true" />{label}</span></td><td className={`text-end numeric ${item.type === 'out' ? 'quantity-out' : 'quantity-in'}`}>{item.type === 'out' ? '-' : '+'}{number(item.quantity)}</td>{!compact && <td className="text-end numeric">{number(item.balance)}</td>}<td className="date-cell">{dateTime(item.createdAt)}</td>{!compact && <td className="note-cell">{item.note || '-'}</td>}</tr>
  })}</tbody></table></div>
}
