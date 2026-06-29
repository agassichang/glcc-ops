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
    <div className="cos cos-center">
      <main className="cos-narrow">
        <p className="cos-kicker">What To Wear</p>
        <h1 className="cos-h1">Fashion Show<br />Check-In</h1>

        {status === 'found' && guest ? (
          <div className="cos-result">
            <p className="cos-ok">{already ? 'Already checked in' : 'Checked in'} ✓</p>
            <p className="cos-name">{guest.name}</p>
            <dl className="cos-dl">
              <div><dt>Seat Row</dt><dd>{guest.seatRow || '—'}</dd></div>
              <div><dt>Seat Number</dt><dd>{guest.seatNumber || '—'}</dd></div>
              {guest.entrance ? <div><dt>Entrance</dt><dd>{guest.entrance}</dd></div> : null}
            </dl>
            <button className="cos-btn cos-btn-ghost" onClick={reset}>Check in another guest</button>
          </div>
        ) : status === 'notfound' ? (
          <div className="cos-result">
            <p className="cos-sad">Please see reception team.</p>
            <p className="cos-muted">We couldn’t find that number on the guest list.</p>
            <button className="cos-btn cos-btn-ghost" onClick={reset}>Try again</button>
          </div>
        ) : (
          <form className="cos-form" onSubmit={submit}>
            <label className="cos-label">Your phone number</label>
            <div className="cos-phone">
              <span className="cos-prefix">+601</span>
              <input
                className="cos-input"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="2345 6789"
                value={digitsv}
                onChange={e => setDigits(e.target.value.replace(/[^0-9]/g, ''))}
                autoFocus
              />
            </div>
            <button className="cos-btn" type="submit" disabled={status === 'loading' || digitsv.replace(/[^0-9]/g, '').length < 6}>
              {status === 'loading' ? 'Checking…' : 'Check in'}
            </button>
            {status === 'error' && <p className="cos-err">Something went wrong. Please see the reception team.</p>}
          </form>
        )}
      </main>
    </div>
  )
}
