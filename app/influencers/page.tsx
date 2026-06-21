import { getRecords, m } from '@/lib/records'
import Empty from '@/app/_components/Empty'

export const dynamic = 'force-dynamic'

// Influencer marketing roster. category === 'influencer'. Marketing-safe fields
// (social handles, join date, referral code) live in `meta`. We deliberately do
// NOT store any PII (phone, DOB, email, address, measurements) — see the sync
// route. Same one-table, server-component pattern as every other tab.
const has = (r: { meta?: Record<string, any> }, k: string) => {
  const v = r.meta?.[k]
  return v != null && v !== '' && v !== '-'
}

export default async function Influencers() {
  const all = await getRecords()
  const rows = all.filter(r => r.category === 'influencer')

  const cards: [string, string | number][] = [
    ['Total influencers', rows.length],
    ['On Instagram', rows.filter(r => has(r, 'instagram')).length],
    ['On TikTok', rows.filter(r => has(r, 'tiktok')).length],
    ['On YouTube', rows.filter(r => has(r, 'youtube')).length],
  ]

  return (
    <>
      <h1 className="ph">Influencer Marketing</h1>
      <p className="cap">Creators &amp; ambassadors · {rows.length} total</p>
      <div className="grid">
        {cards.map(([l, v]) => (
          <div className="stat" key={l}><p className="l">{l}</p><p className="v">{v}</p></div>
        ))}
      </div>
      {all.length === 0 ? <Empty /> : rows.length === 0 ? (
        <p className="empty">No influencers yet — sync your Google Sheet via <code>/api/sync-influencers</code>.</p>
      ) : (
        <table className="tbl">
          <thead><tr><th>Name</th><th>Instagram</th><th>TikTok</th><th>YouTube</th><th>Join date</th><th>Referral code</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td data-label="Name">{r.title}</td>
                <td data-label="Instagram">{m(r, 'instagram')}</td>
                <td data-label="TikTok">{m(r, 'tiktok')}</td>
                <td data-label="YouTube">{m(r, 'youtube')}</td>
                <td data-label="Join date">{m(r, 'join_date')}</td>
                <td data-label="Referral code">{m(r, 'referral_code')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
