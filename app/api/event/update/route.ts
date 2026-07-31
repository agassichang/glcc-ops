import { eventUpdate, eventConfigured } from '@/lib/event'

export const dynamic = 'force-dynamic'

// STAFF ONLY (login-gated by middleware). Manual check-in + edit seat/entrance/remarks.
export async function POST(req: Request) {
  if (!eventConfigured) return Response.json({ ok: false, reason: 'not_configured' }, { status: 503 })
  let body: any
  try { body = await req.json() } catch { return Response.json({ ok: false, reason: 'bad_json' }, { status: 400 }) }

  const row = Number(body?.row)
  if (!Number.isInteger(row) || row < 2) return Response.json({ ok: false, reason: 'bad_row' }, { status: 400 })

  const allowed = ['seatRow', 'seatNumber', 'entrance', 'plusOne', 'remarks', 'checkedIn']
  const fields: Record<string, any> = {}
  for (const k of allowed) if (body?.fields && k in body.fields) fields[k] = body.fields[k]
  if (Object.keys(fields).length === 0) return Response.json({ ok: false, reason: 'no_fields' }, { status: 400 })

  const result = await eventUpdate(row, fields)
  return Response.json(result)
}
