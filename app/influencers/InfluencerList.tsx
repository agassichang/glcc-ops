'use client'
import { useMemo, useState } from 'react'

// Presentation only. All data is fetched on the server (page.tsx, service_role)
// and passed in as props. Setting a tier calls our own /api/influencer-tier
// route — the client never touches Supabase directly.
export type Influencer = {
  id: number
  name: string
  instagram: string
  tiktok: string
  youtube: string
  igFollowers: string | number
  ttFollowers: string | number
  ttLikes: string | number
  ytFollowers: string | number
  referralCode: string
  tier: number | null
}

const real = (v: string | number) => {
  const s = String(v ?? '').trim()
  return s && s !== '-' && !/^n\/?a$/i.test(s) ? s : ''
}
const fmt = (n: string | number) => {
  const x = Number(String(n ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(x) && x > 0 ? x.toLocaleString('en-MY') : ''
}
function profileUrl(base: 'instagram' | 'tiktok' | 'youtube', raw: string) {
  const s = raw.trim()
  if (/^https?:\/\//i.test(s)) return s
  const handle = s.replace(/^@/, '').replace(/\s+/g, '')
  if (base === 'instagram') return `https://www.instagram.com/${handle}`
  if (base === 'tiktok') return `https://www.tiktok.com/@${handle}`
  return `https://www.youtube.com/@${handle}`
}
function displayHandle(raw: string) {
  const s = raw.trim()
  const m = s.match(/(?:instagram\.com|tiktok\.com|youtube\.com)\/@?([^/?#\s]+)/i)
  return '@' + (m ? m[1] : s.replace(/^@/, ''))
}

function Platform({ label, base, raw, stats }: {
  label: string; base: 'instagram' | 'tiktok' | 'youtube'; raw: string; stats: string[]
}) {
  const v = real(raw)
  if (!v) return null
  return (
    <div className="pf">
      <span className="pf-label">{label}</span>
      <span className="pf-val">
        <a href={profileUrl(base, v)} target="_blank" rel="noopener noreferrer" className="ext">{displayHandle(v)}</a>
        {stats.length > 0 && <span className="pf-stats"> · {stats.join(' · ')}</span>}
      </span>
    </div>
  )
}

export default function InfluencerList({ items }: { items: Influencer[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'tier'>('name')
  const [tiers, setTiers] = useState<Record<number, number | null>>(
    () => Object.fromEntries(items.map(i => [i.id, i.tier]))
  )
  const [saving, setSaving] = useState<number | null>(null)

  const view = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = items.filter(i => !q || i.name.toLowerCase().includes(q))
    if (sortBy === 'tier') {
      const rank = (id: number) => {
        const t = tiers[id]
        return t === 1 || t === 2 || t === 3 ? t : 99 // untiered last
      }
      list = [...list].sort((a, b) =>
        rank(a.id) - rank(b.id) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      )
    }
    // sortBy 'name' keeps the server's A→Z order (others already sort after Z)
    return list
  }, [items, query, sortBy, tiers])

  async function setTier(id: number, value: string) {
    const tierVal = value === '' ? null : Number(value)
    const prev = tiers[id]
    setTiers(t => ({ ...t, [id]: tierVal }))
    setSaving(id)
    try {
      const res = await fetch('/api/influencer-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tier: tierVal }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) throw new Error(data.reason || 'failed')
    } catch {
      setTiers(t => ({ ...t, [id]: prev })) // revert on failure
      alert('Could not save the tier — please try again.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <>
      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Search names…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search influencers by name"
        />
        <div className="sortgroup" role="group" aria-label="Sort by">
          <button className={sortBy === 'name' ? 'on' : ''} onClick={() => setSortBy('name')}>Name</button>
          <button className={sortBy === 'tier' ? 'on' : ''} onClick={() => setSortBy('tier')}>Tier</button>
        </div>
      </div>

      <div className="acc">
        {view.map(it => {
          const isOpen = open === it.id
          const tier = tiers[it.id]
          const igStats = [fmt(it.igFollowers) && `${fmt(it.igFollowers)} followers`].filter(Boolean) as string[]
          const ttStats = ([
            fmt(it.ttFollowers) && `${fmt(it.ttFollowers)} followers`,
            fmt(it.ttLikes) && `${fmt(it.ttLikes)} likes`,
          ].filter(Boolean)) as string[]
          const ytStats = [fmt(it.ytFollowers) && `${fmt(it.ytFollowers)} subscribers`].filter(Boolean) as string[]
          const noPlatforms = !real(it.instagram) && !real(it.tiktok) && !real(it.youtube)
          return (
            <div className={`acc-item${isOpen ? ' open' : ''}`} key={it.id}>
              <button className="acc-head" onClick={() => setOpen(isOpen ? null : it.id)} aria-expanded={isOpen}>
                <span className="acc-name">{it.name}</span>
                <span className="acc-right">
                  {tier ? <span className={`tier-badge t${tier}`}>Tier {tier}</span> : null}
                  <span className="acc-caret" aria-hidden="true">{isOpen ? '–' : '+'}</span>
                </span>
              </button>
              {isOpen && (
                <div className="acc-body">
                  <Platform label="Instagram" base="instagram" raw={it.instagram} stats={igStats} />
                  <Platform label="TikTok" base="tiktok" raw={it.tiktok} stats={ttStats} />
                  <Platform label="YouTube" base="youtube" raw={it.youtube} stats={ytStats} />
                  {noPlatforms && <div className="pf"><span className="pf-val pf-empty">No platforms on file</span></div>}
                  <div className="pf"><span className="pf-label">Referral Code</span><span className="pf-val">{real(it.referralCode) || '—'}</span></div>
                  <div className="pf">
                    <span className="pf-label">Tier</span>
                    <span className="pf-val">
                      <select
                        className="tier-select"
                        value={tier ?? ''}
                        onChange={e => setTier(it.id, e.target.value)}
                        disabled={saving === it.id}
                      >
                        <option value="">— None —</option>
                        <option value="1">Tier 1</option>
                        <option value="2">Tier 2</option>
                        <option value="3">Tier 3</option>
                      </select>
                      {saving === it.id && <span className="pf-stats"> saving…</span>}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {view.length === 0 && <p className="empty">No matches for “{query}”.</p>}
      </div>
    </>
  )
}
