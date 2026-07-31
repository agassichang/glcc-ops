// Server-only bridge to the event Google Sheet (via its Apps Script web app).
// The script URL + token live in env vars and never reach the browser — pages
// talk to our own /api/event/* routes, which call this.
const SCRIPT_URL = process.env.EVENT_SHEET_WEBHOOK_URL?.trim() || ''
const SCRIPT_TOKEN = process.env.EVENT_SHEET_TOKEN?.trim() || ''
export const eventConfigured = !!(SCRIPT_URL && SCRIPT_TOKEN)

export type Guest = {
  row: number
  name: string
  phone: string
  category: string
  tier: string
  company: string
  rsvp: string
  seatRow: string
  seatNumber: string
  entrance: string
  plusOne: string
  checkedIn: boolean
  checkInTime: string
  remarks: string
}

// A guest counts as bringing a plus one unless the cell is blank or an explicit
// negative. Anything else (Yes, 1, or the companion's name) counts.
export const hasPlusOne = (v: unknown) => {
  const s = String(v ?? '').trim().toLowerCase()
  return s !== '' && !['no', 'n', '0', 'false', 'none', 'nil', '-', '—'].includes(s)
}

async function post(payload: Record<string, any>) {
  if (!eventConfigured) return { ok: false, error: 'not_configured' }
  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, token: SCRIPT_TOKEN }),
      redirect: 'follow',
    })
    return await res.json()
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) }
  }
}

async function get(params: Record<string, string>) {
  if (!eventConfigured) return { ok: false, error: 'not_configured' }
  try {
    const u = new URL(SCRIPT_URL)
    Object.entries({ ...params, token: SCRIPT_TOKEN }).forEach(([k, v]) => u.searchParams.set(k, String(v)))
    const res = await fetch(u.toString(), { redirect: 'follow' })
    return await res.json()
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) }
  }
}

// Canonicalize to the stored Malaysian format (60XXXXXXXXX) regardless of how
// the guest typed it: "123016504", "0123016504", "+60 12-301 6504" all become
// "60123016504". The page shows a fixed +60 prefix.
export const fullPhone = (entered: string) => {
  let d = String(entered ?? '').replace(/[^0-9]/g, '')
  if (d.startsWith('60')) return d
  if (d.startsWith('0')) d = d.slice(1)
  return '60' + d
}

export const eventCheckin = (phone: string) => post({ action: 'checkin', phone })
export const eventList = () => get({ action: 'list' })
export const eventUpdate = (row: number, fields: Record<string, any>) => post({ action: 'update', row, fields })
