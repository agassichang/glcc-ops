'use client'
import { useState } from 'react'

// Presentation only. All data is fetched on the server (page.tsx, service_role)
// and passed in as props — this component never fetches and holds no secrets.
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
  return (
    <div className="acc">
      {items.map(it => {
        const isOpen = open === it.id
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
              <span className="acc-caret" aria-hidden="true">{isOpen ? '–' : '+'}</span>
            </button>
            {isOpen && (
              <div className="acc-body">
                <Platform label="Instagram" base="instagram" raw={it.instagram} stats={igStats} />
                <Platform label="TikTok" base="tiktok" raw={it.tiktok} stats={ttStats} />
                <Platform label="YouTube" base="youtube" raw={it.youtube} stats={ytStats} />
                {noPlatforms && <div className="pf"><span className="pf-val pf-empty">No platforms on file</span></div>}
                <div className="pf"><span className="pf-label">Referral</span><span className="pf-val">{real(it.referralCode) || '—'}</span></div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
