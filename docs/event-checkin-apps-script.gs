/**
 * What To Wear Fashion Show — check-in backend (Google Apps Script).
 *
 * SETUP: Sheet → Extensions → Apps Script → paste this → Save.
 * Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy.
 * (Same Web app URL stays.) Then add EVENT_SHEET_WEBHOOK_URL + EVENT_SHEET_TOKEN in Vercel.
 *
 * Robust to: a title/blank rows above the header (it finds the header row),
 * and to your column set (Category, Full Name, Phone Number, Tier, RSVP Status,
 * Seat Row, Seat Number, Checked In, Check In Time, Remarks). Entrance / Company
 * are optional — used only if those columns exist.
 */
const TOKEN = 'wtw_evt_3f9a2c7e1b8d4056f1a9c4e7b2d85f60';
const SHEET_NAME = 'Guests';

function doGet(e) { return handle(e); }
function doPost(e) { return handle(e); }

function handle(e) {
  try {
    var params = (e && e.parameter) || {};
    var body = {};
    if (e && e.postData && e.postData.contents) { try { body = JSON.parse(e.postData.contents); } catch (x) {} }
    var p = Object.assign({}, params, body);
    if (String(p.token || '') !== TOKEN) return json({ ok: false, error: 'unauthorized' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    var values = sheet.getDataRange().getValues();

    // Find the header row (first row that contains a phone/name header).
    var hRow = 0;
    for (var hr = 0; hr < Math.min(values.length, 20); hr++) {
      var lc = values[hr].map(function (c) { return String(c).trim().toLowerCase(); });
      if (lc.indexOf('phone number') >= 0 || lc.indexOf('phone') >= 0 || lc.indexOf('full name') >= 0) { hRow = hr; break; }
    }
    var header = values[hRow].map(function (h) { return String(h).trim().toLowerCase(); });
    var col = {};
    header.forEach(function (h, i) { col[h] = i; });

    var idx = {
      name: findCol(col, ['full name', 'name']),
      phone: findCol(col, ['phone number', 'phone']),
      category: findCol(col, ['category']),
      tier: findCol(col, ['tier']),
      company: findCol(col, ['company / brand (if applicable)', 'company / brand', 'company', 'brand']),
      rsvp: findCol(col, ['rsvp status', 'rsvp']),
      seatRow: findCol(col, ['seat row', 'row']),
      seatNo: findCol(col, ['seat number', 'seat no', 'seat']),
      entrance: findCol(col, ['entrance']),
      checkedIn: findCol(col, ['checked in', 'checkedin']),
      checkInTime: findCol(col, ['check in time', 'checkin time']),
      remarks: findCol(col, ['remarks', 'remark'])
    };

    function rowObj(r, rowNumber) {
      return {
        row: rowNumber,
        name: get(r, idx.name),
        phone: digits(get(r, idx.phone)),
        category: get(r, idx.category),
        tier: get(r, idx.tier),
        company: get(r, idx.company),
        rsvp: get(r, idx.rsvp),
        seatRow: get(r, idx.seatRow),
        seatNumber: get(r, idx.seatNo),
        entrance: get(r, idx.entrance),
        checkedIn: /^(yes|true|y|1)$/i.test(get(r, idx.checkedIn)),
        checkInTime: get(r, idx.checkInTime),
        remarks: get(r, idx.remarks)
      };
    }

    var action = String(p.action || '');

    if (action === 'list') {
      var guests = [];
      for (var i = hRow + 1; i < values.length; i++) {
        if (idx.name >= 0 ? String(values[i][idx.name]).trim() === '' : values[i].join('').trim() === '') continue;
        guests.push(rowObj(values[i], i + 1));
      }
      return json({ ok: true, guests: guests, cols: { tier: idx.tier >= 0, entrance: idx.entrance >= 0, company: idx.company >= 0 } });
    }

    if (action === 'checkin') {
      var target = digits(p.phone);
      if (!target) return json({ ok: false, error: 'no_phone' });
      for (var j = hRow + 1; j < values.length; j++) {
        if (digits(values[j][idx.phone]) === target) {
          var rowNumber = j + 1;
          var already = /^(yes|true|y|1)$/i.test(String(values[j][idx.checkedIn]).trim());
          if (!already) {
            if (idx.checkedIn >= 0) sheet.getRange(rowNumber, idx.checkedIn + 1).setValue('Yes');
            if (idx.checkInTime >= 0) { sheet.getRange(rowNumber, idx.checkInTime + 1).setValue(now()); values[j][idx.checkInTime] = now(); }
            values[j][idx.checkedIn] = 'Yes';
          }
          return json({ ok: true, found: true, alreadyCheckedIn: already, guest: rowObj(values[j], rowNumber) });
        }
      }
      return json({ ok: true, found: false });
    }

    if (action === 'update') {
      var rowNumber2 = parseInt(p.row, 10);
      if (!rowNumber2 || rowNumber2 <= hRow + 1 - 1) return json({ ok: false, error: 'bad_row' });
      var fields = p.fields || {};
      var map = { seatRow: idx.seatRow, seatNumber: idx.seatNo, entrance: idx.entrance, remarks: idx.remarks, checkedIn: idx.checkedIn };
      Object.keys(fields).forEach(function (k) {
        if (map[k] == null || map[k] < 0) return;
        if (k === 'checkedIn') {
          var on = fields[k] === true || /^(yes|true|y|1)$/i.test(String(fields[k]));
          sheet.getRange(rowNumber2, map[k] + 1).setValue(on ? 'Yes' : 'No');
          if (on && idx.checkInTime >= 0 && !String(sheet.getRange(rowNumber2, idx.checkInTime + 1).getValue()).trim()) {
            sheet.getRange(rowNumber2, idx.checkInTime + 1).setValue(now());
          }
        } else {
          sheet.getRange(rowNumber2, map[k] + 1).setValue(fields[k]);
        }
      });
      var fresh = sheet.getRange(rowNumber2, 1, 1, header.length).getValues()[0];
      return json({ ok: true, guest: rowObj(fresh, rowNumber2) });
    }

    return json({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function findCol(col, names) { for (var i = 0; i < names.length; i++) { if (col[names[i]] != null) return col[names[i]]; } return -1; }
function get(r, i) { return i >= 0 ? String(r[i] == null ? '' : r[i]).trim() : ''; }
function digits(v) { return String(v == null ? '' : v).replace(/[^0-9]/g, ''); }
function now() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
