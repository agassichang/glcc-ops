'use client'
import { useEffect, useMemo, useState } from 'react'

type Guest = {
  row: number; name: string; phone: string; category: string; tier: string; company: string; rsvp: string
  seatRow: string; seatNumber: string; entrance: string; checkedIn: boolean; checkInTime: string; remarks: string
}
type Cols = { tier?: boolean; entrance?: boolean; company?: boolean }

export default function Staff() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [load, setLoad] = useState<'loading' | 'ready' | 'unconfigured' | 'error'>('loading')
  const [query, setQuery] = useState('')
  const [fRsvp, setFRsvp] = useState('')
  const [fCat, setFCat] = useState('')
  const [fTier, setFTier] = useState('')
  const [fStatus, setFStatus] = useState<'' | 'in' | 'out'>('')
  const [cols, setCols] = useState<Cols>({})
  const [drafts, setDrafts] = useState<Record<number, Partial<Guest>>>({})
  const [saving, setSaving] = useState<number | null>(null)

  useEffect(() => { void refresh() }, [])
  async function refresh() {
    setLoad('loading')
    try {
      const res = await fetch('/api/event/list')
      const data = await res.json().catch(() => ({}))
      if (data.ok && Array.isArray(data.guests)) { setGuests(data.guests); setCols(data.cols || {}); setLoad('ready') }
      else if (data.reason === 'not_configured') setLoad('unconfigured')
      else setLoad('error')
    } catch { setLoad('error') }
  }

  const stats = useMemo(() => {
    const total = guests.length
    const checked = guests.filter(g => g.checkedIn).length
    return { total, checked, notArrived: total - checked }
  }, [guests])

  const categories = useMemo(() => [...new Set(guests.map(g => g.category).filter(Boolean))].sort(), [guests])
  const rsvps = useMemo(() => [...new Set(guests.map(g => g.rsvp).filter(Boolean))].sort(), [guests])
  const tiers = useMemo(() => [...new Set(guests.map(g => g.tier).filter(Boolean))].sort(), [guests])

  const view = useMemo(() => {
    const q = query.trim().toLowerCase()
    return guests.filter(g => {
      if (q && !`${g.name} ${g.phone} ${g.company} ${g.category}`.toLowerCase().includes(q)) return false
      if (fRsvp && g.rsvp !== fRsvp) return false
      if (fCat && g.category !== fCat) return false
      if (fTier && g.tier !== fTier) return false
      if (fStatus === 'in' && !g.checkedIn) return false
      if (fStatus === 'out' && g.checkedIn) return false
      return true
    })
  }, [guests, query, fRsvp, fCat, fTier, fStatus])

  const draftOf = (g: Guest) => ({ seatRow: g.seatRow, seatNumber: g.seatNumber, entrance: g.entrance, remarks: g.remarks, ...drafts[g.row] })
  const setField = (row: number, key: string, val: string) => setDrafts(d => ({ ...d, [row]: { ...d[row], [key]: val } }))
  const dirty = (row: number) => !!drafts[row]

  async function save(g: Guest, extra: Record<string, any> = {}) {
    setSaving(g.row)
    const d = draftOf(g)
    const fields = { seatRow: d.seatRow, seatNumber: d.seatNumber, entrance: d.entrance, remarks: d.remarks, ...extra }
    try {
      const res = await fetch('/api/event/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row: g.row, fields }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok || !data.guest) throw new Error()
      setGuests(gs => gs.map(x => (x.row === g.row ? data.guest : x)))
      setDrafts(dd => { const c = { ...dd }; delete c[g.row]; return c })
    } catch { alert('Could not save — please try again.') }
    finally { setSaving(null) }
  }

  return (
    <div className="cos">
      <div className="cos-wide">
        <header className="staff-head">
          <div>
            <p className="cos-kicker">What To Wear · Fashion Show</p>
            <h1 className="cos-h2">Staff Dashboard</h1>
          </div>
          <div className="staff-headbtns">
            <button className="cos-btn cos-btn-ghost cos-sm" onClick={refresh}>Refresh</button>
            <a className="cos-btn cos-btn-ghost cos-sm" href="/api/logout">Log out</a>
          </div>
        </header>

        <div className="cos-stats">
          <div className="cos-stat"><span className="cos-stat-n">{stats.total}</span><span className="cos-stat-l">Total guests</span></div>
          <div className="cos-stat"><span className="cos-stat-n">{stats.checked}</span><span className="cos-stat-l">Checked in</span></div>
          <div className="cos-stat"><span className="cos-stat-n">{stats.notArrived}</span><span className="cos-stat-l">Not arrived</span></div>
        </div>

        {load === 'unconfigured' ? (
          <p className="cos-note">Connect your guest sheet first — add <code>EVENT_SHEET_WEBHOOK_URL</code> and <code>EVENT_SHEET_TOKEN</code> in Vercel, then redeploy.</p>
        ) : load === 'error' ? (
          <p className="cos-note">Couldn’t load the guest list. <button className="cos-link" onClick={refresh}>Retry</button></p>
        ) : load === 'loading' ? (
          <p className="cos-note">Loading guests…</p>
        ) : (
          <>
            <div className="staff-tools">
              <input className="cos-field" placeholder="Search name, phone, company, category…" value={query} onChange={e => setQuery(e.target.value)} />
              <select className="cos-field cos-select" value={fRsvp} onChange={e => setFRsvp(e.target.value)}>
                <option value="">All RSVP</option>
                {rsvps.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select className="cos-field cos-select" value={fCat} onChange={e => setFCat(e.target.value)}>
                <option value="">All categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {tiers.length > 0 && (
                <select className="cos-field cos-select" value={fTier} onChange={e => setFTier(e.target.value)}>
                  <option value="">All tiers</option>
                  {tiers.map(t => <option key={t} value={t}>Tier {t}</option>)}
                </select>
              )}
              <select className="cos-field cos-select" value={fStatus} onChange={e => setFStatus(e.target.value as any)}>
                <option value="">All statuses</option>
                <option value="in">Checked in</option>
                <option value="out">Not arrived</option>
              </select>
            </div>

            <p className="cos-count">{view.length} of {guests.length} guests</p>

            <div className="staff-list">
              {view.map(g => {
                const d = draftOf(g)
                return (
                  <div className={`staff-card${g.checkedIn ? ' is-in' : ''}`} key={g.row}>
                    <div className="staff-top">
                      <div>
                        <p className="staff-name">{g.name || '—'}</p>
                        <p className="staff-sub">
                          {g.category || '—'}{g.tier ? ` · Tier ${g.tier}` : ''}{g.company ? ` · ${g.company}` : ''} · +{g.phone}
                          {g.rsvp ? ` · RSVP ${g.rsvp}` : ''}
                        </p>
                      </div>
                      <button
                        className={`cos-btn cos-sm ${g.checkedIn ? 'cos-btn-ghost' : ''}`}
                        onClick={() => save(g, { checkedIn: !g.checkedIn })}
                        disabled={saving === g.row}
                      >
                        {g.checkedIn ? 'Undo' : 'Check in'}
                      </button>
                    </div>

                    {g.checkedIn && <p className="staff-in">Checked in{g.checkInTime ? ` · ${g.checkInTime}` : ''}</p>}

                    <div className="staff-grid">
                      <label>Seat Row<input className="cos-field" value={d.seatRow ?? ''} onChange={e => setField(g.row, 'seatRow', e.target.value)} /></label>
                      <label>Seat No.<input className="cos-field" value={d.seatNumber ?? ''} onChange={e => setField(g.row, 'seatNumber', e.target.value)} /></label>
                      {cols.entrance && <label>Entrance<input className="cos-field" value={d.entrance ?? ''} onChange={e => setField(g.row, 'entrance', e.target.value)} /></label>}
                      <label className="staff-remarks">Remarks<input className="cos-field" value={d.remarks ?? ''} onChange={e => setField(g.row, 'remarks', e.target.value)} /></label>
                    </div>

                    {dirty(g.row) && (
                      <div className="staff-save">
                        <button className="cos-btn cos-sm" onClick={() => save(g)} disabled={saving === g.row}>
                          {saving === g.row ? 'Saving…' : 'Save changes'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
              {view.length === 0 && <p className="cos-note">No guests match your search.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
