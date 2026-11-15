'use client'
import { useState } from 'react'
import { hasPlusOne } from '@/lib/event'
import { HERO_IMAGE } from '@/lib/heroImage'

type Guest = {
  name: string; seatRow: string; seatNumber: string; entrance: string
  plusOne: string; plusOneSeatRow: string; plusOneSeatNumber: string
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

  // Seats show as one value, exactly as written in the sheet (e.g. "U2").
  const seat = `${guest?.seatRow ?? ''}${guest?.seatNumber ?? ''}`.trim()
  const poSeat = `${guest?.plusOneSeatRow ?? ''}${guest?.plusOneSeatNumber ?? ''}`.trim()

  return (
    <div className="wtw">
      <div className="wtw-hero">
        <img src={HERO_IMAGE} alt="What To Wear" />
      </div>

      <main className="wtw-body">
        <h1 className="sr-only">RE:ORIENT 东方新序 · Spring 27 Fashion Show</h1>
        <p className="wtw-meta">
          Show Date — Wednesday, 18 November 2026<br />
          Show Time — 11:30AM<br />
          Guest Arrival — From 10:30AM<br />
          Venue — HABIB Landmark, Level 1, Jalan Bunus
        </p>
        <div className="wtw-rule" />

        {status === 'found' && guest ? (
          <div className="wtw-result">
            <p className="wtw-ok">{already ? 'Already Checked In' : 'Checked In'}</p>
            <p className="wtw-name">{guest.name}</p>
            <dl className="wtw-dl">
              <div><dt>Seat</dt><dd>{seat || '—'}</dd></div>
              {hasPlusOne(guest.plusOne) && (
                <div><dt>Plus One Seat</dt><dd>{poSeat || '—'}</dd></div>
              )}
            </dl>
            <p className="wtw-note">We hope you enjoy the show.</p>
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
