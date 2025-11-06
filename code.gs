// ##################################################################
// GOOGLE APPS SCRIPT BACK-END (Code.gs)
// ##################################################################
//
// INSTRUCTIONS:
// 1. Open your Google Sheet.
// 2. Go to Extensions > Apps Script.
// 3. Paste ALL of this code into the `Code.gs` file, replacing any existing content.
// 4. UPDATE the `SHEET_NAMES` global variables below to match your sheet names.
// 5. Run the `setup` function ONCE to create the sheets if they don't exist.
// 6. Go to Deploy > New Deployment.
// 7. Select "Web App" as the type.
// 8. In "Execute as", select "Me".
// 9. In "Who has access", select "Anyone". (This is CRITICAL for the API to work).
// 10. Click "Deploy".
// 11. COPY the "Web app URL" it gives you.
// 12. PASTE this URL into the `WEB_APP_URL` variable in your `index.html` file.
// 13. (Optional) Run the `setupTriggers` function to automate weekly emails.
//
// ##################################################################

// --- CONFIGURATION ---
const SHEET_NAMES = {
  events: 'Events',
  reservations: 'Reservations',
  contacts: 'Contacts'
};

const ADMIN_EMAIL = 'your-email@gmail.com'; // Used for error notifications

// --- Setup Function (Run Once) ---
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create Events sheet
  if (!ss.getSheetByName(SHEET_NAMES.events)) {
    const eventsSheet = ss.insertSheet(SHEET_NAMES.events);
    eventsSheet.appendRow(['id', 'title', 'description', 'date', 'category', 'size', 'image', 'status']);
    eventsSheet.getRange('A1:H1').setFontWeight('bold');
    // Add dummy data
    eventsSheet.appendRow([1, 'Big Band Night', 'Live jazz and funk all night long.', '2025-11-10T20:00:00', 'Live Music', 'large', 'https://placehold.co/800x600/334155/EAB308?text=Big+Band', 'active']);
    eventsSheet.appendRow([2, 'Weekly Pub Quiz', 'Test your knowledge. £50 bar tab.', '2025-11-11T19:30:00', 'Quiz', 'medium', 'https://placehold.co/600x400/334155/EAB308?text=Quiz', 'active']);
    eventsSheet.appendRow([3, '2-for-1 Burgers', 'All gourmet burgers are 2-for-1.', '2025-11-12T12:00:00', 'Special', 'medium', 'https://placehold.co/600x400/334155/EAB308?text=Burgers', 'active']);
  }
  
  // Create Reservations sheet
  if (!ss.getSheetByName(SHEET_NAMES.reservations)) {
    const resSheet = ss.insertSheet(SHEET_NAMES.reservations);
    resSheet.appendRow(['timestamp', 'name', 'email', 'date', 'time', 'guests', 'comments', 'status']);
    resSheet.getRange('A1:H1').setFontWeight('bold');
  }

  // Create Contacts sheet
  if (!ss.getSheetByName(SHEET_NAMES.contacts)) {
    const contactsSheet = ss.insertSheet(SHEET_NAMES.contacts);
    contactsSheet.appendRow(['timestamp', 'email', 'name', 'consent_given']);
    contactsSheet.getRange('A1:D1').setFontWeight('bold');
  }
  
  Logger.log('Setup complete. Sheets are ready.');
}


// --- MAIN API ENDPOINTS ---

/**
 * Handles GET requests to fetch event data.
 * This is the "API" your website calls.
 */
function doGet(e) {
  try {
    const events = getEvents();
    const output = JSON.stringify({ status: 'success', events: events });
    return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('doGet Error: ' + error);
    return handleError(error);
  }
}

/**
 * Handles POST requests from the booking form.
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 1. Log the reservation
    const reservationStatus = logReservation(data);
    
    // 2. Add to contacts if consent is given
    if (data.consent) {
      logContact(data);
    }
    
    // 3. Send confirmation email
    sendConfirmationEmail(data);
    
    // 4. (Optional) Schedule a reminder
    // scheduleReminder(data); // See function below
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Reservation logged' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('doPost Error: ' + error);
    return handleError(error);
  }
}

// --- HELPER FUNCTIONS (DATA) ---

/**
 * Fetches active events from the "Events" sheet.
 */
function getEvents() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.events);
  const data = sheet.getDataRange().getValues();
  
  const headers = data.shift(); // Remove header row
  const events = [];
  
  // Find column indices
  const col = getColIndices(headers);

  data.forEach((row, index) => {
    // Only include active events
    if (row[col.status] === 'active') {
      events.push({
        id: row[col.id] || (index + 1), // Use row index as fallback ID
        title: row[col.title],
        description: row[col.description],
        date: new Date(row[col.date]).toISOString(), // Standardize date format
        category: row[col.category],
        size: row[col.size],
        image: row[col.image]
      });
    }
  });
  
  return events;
}

/**
 * Writes a new reservation to the "Reservations" sheet.
 */
function logReservation(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.reservations);
  sheet.appendRow([
    new Date(),
    data.name,
    data.email,
    data.date,
    data.time,
    data.guests,
    data.comments,
    'new' // Default status
  ]);
  return 'Logged';
}

/**
 * Writes a new contact to the "Contacts" sheet.
 */
function logContact(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.contacts);
  
  // Check if email already exists
  const emailColumn = 2; // Assuming email is in column B
  const existingEmails = sheet.getRange(2, emailColumn, sheet.getLastRow(), 1).getValues();
  const isDuplicate = existingEmails.some(row => row[0] === data.email);
  
  if (!isDuplicate) {
    sheet.appendRow([
      new Date(),
      data.email,
      data.name,
      'true'
    ]);
  }
}

// --- HELPER FUNCTIONS (AUTOMATION & EMAIL) ---

/**
 * Sends a booking confirmation email via Gmail.
 */
function sendConfirmationEmail(data) {
  const subject = `Your Booking Confirmation for The Chalkboard`;
  const body = `
    Hi ${data.name},
    
    Thanks for booking with us! We've got your table reserved:
    
    Date: ${data.date}
    Time: ${data.time}
    Guests: ${data.guests}
    
    Comments: ${data.comments || 'None'}
    
    If you need to cancel or change your booking, please reply to this email.
    
    See you soon!
    - The Chalkboard Team
  `;
  
  GmailApp.sendEmail(data.email, subject, body, { from: ADMIN_EMAIL, name: 'The Chalkboard' });
}

/**
 * Schedules a reminder email 24 hours before the event.
 */
function scheduleReminder(data) {
  const bookingDateTime = new Date(`${data.date}T${data.time}`);
  const reminderTime = new Date(bookingDateTime.getTime() - (24 * 60 * 60 * 1000)); // 24 hours before
  
  // Only schedule if the reminder time is in the future
  if (reminderTime > new Date()) {
    ScriptApp.newTrigger('sendReminderEmail')
      .timeBased()
      .at(reminderTime)
      .create();
      
    // Note: To pass data to the trigger, you'd need to store it
    // in PropertiesService or the Sheet, as triggers don't accept arguments.
    // This is a simplified example.
  }
}

/**
 * Generates and sends the weekly "What's On" newsletter.
 * Run this function on a time-based trigger (e.g., every Monday at 9am).
 */
function sendWeeklyDigest() {
  const contactsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.contacts);
  const eventsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.events);
  
  // 1. Get all events for the next 7 days
  const now = new Date();
  const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  
  const allEventsData = eventsSheet.getDataRange().getValues();
  const headers = allEventsData.shift();
  const col = getColIndices(headers);
  
  let eventsHtml = '';
  allEventsData.forEach(row => {
    const eventDate = new Date(row[col.date]);
    if (row[col.status] === 'active' && eventDate >= now && eventDate <= nextWeek) {
      eventsHtml += `
        <div style="border-bottom: 1px solid #ccc; padding: 10px 0;">
          <h3 style="color: #EAB308;">${row[col.title]}</h3>
          <p style="font-size: 14px;">${eventDate.toDateString()} at ${eventDate.toLocaleTimeString()}</p>
          <p style="font-size: 16px;">${row[col.description]}</p>
        </div>
      `;
    }
  });
  
  if (eventsHtml === '') {
    eventsHtml = '<p>No big events scheduled this week, but the bar is always open! Come by for a drink.</p>';
  }
  
  // 2. Get all contacts
  const contactsData = contactsSheet.getDataRange().getValues();
  contactsData.shift(); // Remove header
  
  // 3. Create email template
  const subject = "What's On This Week at The Chalkboard";
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #111827; color: #E5E7EB; padding: 20px; border-radius: 8px;">
      <h1 style="font-family: 'Gloria Hallelujah', cursive; color: #FDE047; text-align: center;">The Chalkboard</h1>
      <h2 style="color: #FDE047;">What's On This Week</h2>
      ${eventsHtml}
      <p style="text-align: center; font-size: 12px; color: #9CA3AF; margin-top: 20px;">
        You're receiving this because you opted-in at our pub or website.
        <br>
        (To unsubscribe, please reply to this email with "Unsubscribe")
      </p>
    </div>
  `;
  
  // 4. Send emails
  contactsData.forEach(row => {
    const email = row[1]; // Assuming email is in col B
    const consent = row[3]; // Assuming consent is in col D
    if (email && consent) {
      try {
        GmailApp.sendEmail(email, subject, '', { htmlBody: htmlBody, from: ADMIN_EMAIL, name: 'The Chalkboard' });
      } catch (e) {
        Logger.log(`Failed to send digest to ${email}: ${e}`);
      }
    }
  });
}

/**
 * Creates triggers for automated tasks. Run this ONCE manually from the editor.
 */
function setupTriggers() {
  // Delete old triggers to avoid duplicates
  const allTriggers = ScriptApp.getProjectTriggers();
  allTriggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create a trigger for the weekly digest
  // Runs every Monday at 9am
  ScriptApp.newTrigger('sendWeeklyDigest')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .create();
    
  Logger.log('Triggers set up successfully.');
}


// --- UTILITY FUNCTIONS ---

/**
 * A centralized error handler for API responses.
 */
function handleError(error) {
  const errorMsg = { status: 'error', message: error.message, stack: error.stack };
  Logger.log(errorMsg);
  // Optionally send an email to the admin on critical failure
  // GmailApp.sendEmail(ADMIN_EMAIL, 'Apps Script API Error', JSON.stringify(errorMsg));
  return ContentService.createTextOutput(JSON.stringify(errorMsg))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
* Helper function to get column indices from headers
*/
function getColIndices(headers) {
  const indices = {};
  headers.forEach((header, index) => {
    indices[header.toLowerCase()] = index;
  });
  return indices;
}
