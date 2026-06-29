'use client'
import { useState } from 'react'

type Guest = {
  name: string; seatRow: string; seatNumber: string; entrance: string
  checkInTime: string; category: string; company: string
}

export default function CheckIn() {
  const [digitsv, setDigits] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'notfound' | 'error'>('idle')
  const [guest, setGuest] = useState<Guest | null>(null)
  const [already, setAlready] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const entered = digitsv.replace(/[^0-9]/g, '')
    if (entered.length < 6) return
    setStatus('loading')
    try {
      const res = await fetch('/api/event/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: entered }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.ok && data.found) {
        setGuest(data.guest); setAlready(!!data.alreadyCheckedIn); setStatus('found')
      } else if (data.ok && data.found === false) {
        setStatus('notfound')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  function reset() {
    setDigits(''); setGuest(null); setStatus('idle'); setAlready(false)
  }

  return (
    <div className="wtw">
      <div className="wtw-hero">
        <img src="/header-visual.png" alt="What To Wear storefront" />
      </div>

      <main className="wtw-body">
        <p className="wtw-kicker">KLFW 2026</p>
        <h1 className="wtw-title">10 Years of<br />What To Wear</h1>
        <div className="wtw-rule" />

        <p className="wtw-meta">
          Show Date — 4 August 2026<br />
          Show Time — 2PM Sharp<br />
          Guest Arrival — 1PM
        </p>

        {status === 'found' && guest ? (
          <div className="wtw-result">
            <p className="wtw-ok">{already ? 'Already Checked In' : 'Checked In'}</p>
            <p className="wtw-name">{guest.name}</p>
            <dl className="wtw-dl">
              <div><dt>Seat Row</dt><dd>{guest.seatRow || '—'}</dd></div>
              <div><dt>Seat Number</dt><dd>{guest.seatNumber || '—'}</dd></div>
            </dl>
            <button className="wtw-btn wtw-btn-ghost" onClick={reset}>Check in another guest</button>
          </div>
        ) : status === 'notfound' ? (
          <div className="wtw-result">
            <p className="wtw-sad">Please see our reception team.</p>
            <p className="wtw-muted">We couldn’t find that number on the guest list.</p>
            <button className="wtw-btn wtw-btn-ghost" onClick={reset}>Try again</button>
          </div>
        ) : (
          <>
            <p className="wtw-checkin">Guest Check-In</p>
            <form className="wtw-form" onSubmit={submit}>
              <div className="wtw-phone">
                <span className="wtw-prefix">+60</span>
                <input
                  className="wtw-input"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="12 345 6789"
                  value={digitsv}
                  onChange={e => setDigits(e.target.value.replace(/[^0-9]/g, ''))}
                  autoFocus
                />
              </div>
              <button className="wtw-btn" type="submit" disabled={status === 'loading' || digitsv.replace(/[^0-9]/g, '').length < 6}>
                {status === 'loading' ? 'Checking…' : 'Check In'}
              </button>
              {status === 'error' && <p className="wtw-err">Something went wrong. Please see the reception team.</p>}
            </form>
          </>
        )}
      </main>
    </div>
  )
}
