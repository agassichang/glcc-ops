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
  checkedIn: boolean
  checkInTime: string
  remarks: string
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

// Build the stored phone format (601XXXXXXXX) from the digits a guest typed
// after the fixed +601 prefix.
export const fullPhone = (entered: string) => '601' + String(entered ?? '').replace(/[^0-9]/g, '')

export const eventCheckin = (phone: string) => post({ action: 'checkin', phone })
export const eventList = () => get({ action: 'list' })
export const eventUpdate = (row: number, fields: Record<string, any>) => post({ action: 'update', row, fields })
