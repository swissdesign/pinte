const SHEET_NAMES = {
  events: 'Events',
  bookings: 'Reservations',
  newsletter: 'Contacts'
};

const ADMIN_EMAIL = 'your-email@gmail.com';
const ALLOWED_ORIGIN = 'https://pinte.amatt.ch';

function doGet(e) {
  const path = e?.pathInfo || 'events';
  try {
    switch (path) {
      case 'events': {
        const limit = e?.parameter?.limit ? Number(e.parameter.limit) : null;
        const from = e?.parameter?.from || null;
        const to = e?.parameter?.to || null;
        const events = getEventsFromCache({ limit, from, to });
        return createJsonResponse({ status: 'success', events });
      }
      case 'ics': {
        const id = e?.parameter?.id;
        if (!id) {
          return createJsonResponse({ status: 'error', message: 'Missing id parameter' });
        }
        const ics = getEventICS(id);
        if (!ics) {
          return createJsonResponse({ status: 'error', message: 'Event not found' });
        }
        return ContentService.createTextOutput(ics)
          .setMimeType(ContentService.MimeType.ICAL)
          .setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
      }
      default:
        return createJsonResponse({ status: 'error', message: 'Not Found' });
    }
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.message });
  }
}

function doPost(e) {
  const path = e?.pathInfo || 'booking';
  try {
    switch (path) {
      case 'booking':
        return createJsonResponse(handleBooking(e));
      case 'newsletter':
        return createJsonResponse(handleNewsletter(e));
      default:
        return createJsonResponse({ status: 'error', message: 'Not Found' });
    }
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.message });
  }
}

function createJsonResponse(data) {
  const output = JSON.stringify(data);
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getEventsFromCache({ limit = null, from = null, to = null }) {
  const cache = CacheService.getPublicCache();
  const keyParts = ['events'];
  if (limit) keyParts.push(`limit:${limit}`);
  if (from) keyParts.push(`from:${from}`);
  if (to) keyParts.push(`to:${to}`);
  const cacheKey = keyParts.join('|');

  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const events = fetchEventsFromSheet({ limit, from, to });
  cache.put(cacheKey, JSON.stringify(events), 300);
  return events;
}

function fetchEventsFromSheet({ limit = null, from = null, to = null }) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.events);
  if (!sheet) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const col = indexHeaders(headers);
  const results = [];
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  data.forEach((row, rowIndex) => {
    const statusValue = col.status !== undefined ? row[col.status] : 'active';
    if (statusValue && statusValue.toString().toLowerCase() !== 'active') {
      return;
    }
    const start = (col.start !== undefined ? row[col.start] : null) || (col.date !== undefined ? row[col.date] : null);
    if (!start) {
      return;
    }
    const startDate = new Date(start);
    if (fromDate && startDate < fromDate) {
      return;
    }
    if (toDate && startDate > toDate) {
      return;
    }
    const event = {
      id: (col.id !== undefined ? row[col.id] : null) || `row-${rowIndex + 2}`,
      title: col.title !== undefined ? row[col.title] : '',
      description: col.description !== undefined ? row[col.description] || '' : '',
      start: new Date(start).toISOString(),
      end: col.end !== undefined && row[col.end] ? new Date(row[col.end]).toISOString() : new Date(start).toISOString(),
      category: col.category !== undefined ? row[col.category] || '' : '',
      location: col.location !== undefined ? row[col.location] || '' : '',
      image: col.image !== undefined ? row[col.image] || '' : '',
      ticketUrl: col.ticketurl !== undefined ? row[col.ticketurl] || '' : (col.ticket_url !== undefined ? row[col.ticket_url] || '' : '')
    };
    results.push(event);
  });

  results.sort((a, b) => new Date(a.start) - new Date(b.start));
  return limit ? results.slice(0, limit) : results;
}

function handleBooking(e) {
  const payload = e?.postData?.contents ? JSON.parse(e.postData.contents) : {};
  validateBookingPayload(payload);
  appendBooking(payload);
  sendConfirmationEmail(payload);
  return { status: 'success', ok: true };
}

function handleNewsletter(e) {
  const payload = e?.postData?.contents ? JSON.parse(e.postData.contents) : {};
  if (!payload.email) {
    throw new Error('Email is required');
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.newsletter);
  if (!sheet) {
    throw new Error('Newsletter sheet missing');
  }
  const existing = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
  const isDuplicate = existing.some(row => row[0] && row[0].toString().toLowerCase() === payload.email.toLowerCase());
  if (!isDuplicate) {
    sheet.appendRow([new Date(), payload.email, payload.name || '', payload.consent === true]);
  }
  return { status: 'success', ok: true };
}

function appendBooking(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.bookings);
  if (!sheet) {
    throw new Error('Bookings sheet missing');
  }
  sheet.appendRow([
    new Date(),
    payload.name,
    payload.email,
    payload.phone || '',
    payload.date,
    payload.time,
    payload.partySize,
    payload.notes || '',
    'new'
  ]);
}

function validateBookingPayload(payload) {
  const requiredFields = ['name', 'email', 'date', 'time', 'partySize'];
  requiredFields.forEach(field => {
    if (!payload[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  });
}

function sendConfirmationEmail(payload) {
  try {
    const subject = `Your booking request at Pinte`;
    const body = `Hi ${payload.name},\n\nThanks for booking with Pinte! Here's what we received:\n\nDate: ${payload.date}\nTime: ${payload.time}\nGuests: ${payload.partySize}\nNotes: ${payload.notes || '—'}\n\nWe'll confirm as soon as possible.\n\nCheers,\nTeam Pinte`;
    GmailApp.sendEmail(payload.email, subject, body, { name: 'Pinte Andermatt', replyTo: ADMIN_EMAIL });
    GmailApp.sendEmail(ADMIN_EMAIL, `New booking from ${payload.name}`, JSON.stringify(payload, null, 2));
  } catch (error) {
    Logger.log(`Email sending failed: ${error}`);
  }
}

function getEventICS(id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.events);
  if (!sheet) {
    return null;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const col = indexHeaders(headers);
  for (let i = 0; i < data.length; i += 1) {
    const row = data[i];
    const rowId = row[col.id] || `row-${i + 2}`;
    if (rowId == id) {
      const start = row[col.start] || row[col.date];
      if (!start) return null;
      const event = {
        title: row[col.title] || 'Pinte Event',
        description: row[col.description] || '',
        start: new Date(start),
        end: row[col.end] ? new Date(row[col.end]) : new Date(start),
        location: row[col.location] || 'Pinte Andermatt, Gotthardstrasse 43, 6490 Andermatt'
      };
      return buildICS(event);
    }
  }
  return null;
}

function buildICS(event) {
  const dtStart = Utilities.formatDate(event.start, 'Etc/UTC', "yyyyMMdd'T'HHmmss'Z'");
  const dtEnd = Utilities.formatDate(event.end, 'Etc/UTC', "yyyyMMdd'T'HHmmss'Z'");
  const uid = `${dtStart}-${Math.random().toString(36).slice(2)}@pinte`; 
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pinte Andermatt//Events//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${Utilities.formatDate(new Date(), 'Etc/UTC', "yyyyMMdd'T'HHmmss'Z'")}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description}`,
    `LOCATION:${event.location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return lines.join('\n');
}

function sendWeeklyDigest() {
  const contactsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.newsletter);
  if (!contactsSheet) {
    return;
  }
  const events = fetchEventsFromSheet({ from: new Date().toISOString(), to: new Date(Date.now() + 7 * 86400000).toISOString() });
  const digest = events.map(event => `• ${event.title} — ${event.start}`).join('\n');
  const rows = contactsSheet.getDataRange().getValues();
  rows.shift();
  rows.forEach(row => {
    if (row[1]) {
      GmailApp.sendEmail(row[1], "What's on at Pinte", digest || 'Drop by for a pint this week!');
    }
  });
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(SHEET_NAMES.events)) {
    const eventsSheet = ss.insertSheet(SHEET_NAMES.events);
    eventsSheet.appendRow(['id', 'title', 'description', 'start', 'end', 'category', 'location', 'image', 'ticketUrl', 'status']);
  }
  if (!ss.getSheetByName(SHEET_NAMES.bookings)) {
    const bookingsSheet = ss.insertSheet(SHEET_NAMES.bookings);
    bookingsSheet.appendRow(['timestamp', 'name', 'email', 'phone', 'date', 'time', 'partySize', 'notes', 'status']);
  }
  if (!ss.getSheetByName(SHEET_NAMES.newsletter)) {
    const contactsSheet = ss.insertSheet(SHEET_NAMES.newsletter);
    contactsSheet.appendRow(['timestamp', 'email', 'name', 'consent']);
  }
}

function indexHeaders(headers) {
  const map = {};
  headers.forEach((header, idx) => {
    if (!header) return;
    const key = header.toString().toLowerCase().replace(/\s+/g, '');
    map[key] = idx;
  });
  return map;
}
