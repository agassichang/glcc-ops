import { getRecords } from '@/lib/records'
import Empty from '@/app/_components/Empty'
import InfluencerList, { type Influencer } from './InfluencerList'

export const dynamic = 'force-dynamic'

// Influencer marketing roster. category === 'influencer'. Marketing-safe fields
// (social handles, follower stats, referral code) live in `meta`. No PII is ever
// read. Data is fetched here on the server; the collapsible UI is a client child.
const has = (r: { meta?: Record<string, any> }, k: string) => {
  const v = r.meta?.[k]
  return v != null && v !== '' && v !== '-'
}

export default async function Influencers() {
  const all = await getRecords()
  const rows = all.filter(r => r.category === 'influencer')

  // Sort A→Z by name; names that don't start with a letter sort after Z.
  const startsAlpha = (s: string) => /^[a-z]/i.test(s.trim())
  rows.sort((a, b) => {
    const A = (a.title || '').trim(), B = (b.title || '').trim()
    const aAlpha = startsAlpha(A), bAlpha = startsAlpha(B)
    if (aAlpha !== bAlpha) return aAlpha ? -1 : 1
    return A.localeCompare(B, undefined, { sensitivity: 'base' })
  })

  const cards: [string, string | number][] = [
    ['Total influencers', rows.length],
    ['On Instagram', rows.filter(r => has(r, 'instagram')).length],
    ['On TikTok', rows.filter(r => has(r, 'tiktok')).length],
    ['On YouTube', rows.filter(r => has(r, 'youtube')).length],
  ]

  // Mock referral code from the name: FIRST + "15" (e.g. Ain Ramli → AIN15).
  // If the first name is shared by more than one KOL, use the full name instead
  // to keep codes unique (e.g. AINRAMLI15).
  const firstName = (n: string) => (n.trim().split(/\s+/)[0] || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const fullName = (n: string) => n.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const firstFreq = new Map<string, number>()
  for (const r of rows) {
    const f = firstName(r.title || '')
    if (f) firstFreq.set(f, (firstFreq.get(f) || 0) + 1)
  }
  const refCode = (name: string) => {
    const f = firstName(name)
    if (!f) return ''
    return ((firstFreq.get(f) || 0) > 1 ? fullName(name) : f) + '15'
  }

  const items: Influencer[] = rows.map(r => ({
    id: r.id,
    name: r.title,
    instagram: r.meta?.instagram ?? '',
    tiktok: r.meta?.tiktok ?? '',
    youtube: r.meta?.youtube ?? '',
    igFollowers: r.meta?.ig_followers ?? '',
    ttFollowers: r.meta?.tt_followers ?? '',
    ttLikes: r.meta?.tt_likes ?? '',
    ytFollowers: r.meta?.yt_followers ?? '',
    referralCode: refCode(r.title),
    tier: [1, 2, 3].includes(Number(r.meta?.tier)) ? Number(r.meta?.tier) : null,
  }))

  return (
    <>
      <h1 className="ph">Influencer Marketing</h1>
      <p className="cap">Creators &amp; ambassadors · {rows.length} total · tap a name for details</p>
      <div className="grid">
        {cards.map(([l, v]) => (
          <div className="stat" key={l}><p className="l">{l}</p><p className="v">{v}</p></div>
        ))}
      </div>
      {all.length === 0 ? <Empty /> : rows.length === 0 ? (
        <p className="empty">No influencers yet — sync your Google Sheet via <code>/api/sync-influencers</code>.</p>
      ) : (
        <InfluencerList items={items} />
      )}
    </>
  )
}
