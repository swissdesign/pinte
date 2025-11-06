Deployment Instructions for "The Chalkboard" Pub Website

You have two primary components:

index.html (The Front-End Website)

Code.gs (The Back-End Engine)

They need to be linked. Follow these steps precisely.

Part 1: Set Up The Back-End (Google Sheets & Apps Script)

Create Your Google Sheet:

Go to sheets.new in your browser.

Name your spreadsheet something like "Pub Back-End".

This sheet will hold your Events, Reservations, and Contacts.

Open Apps Script:

In your new Google Sheet, click Extensions > Apps Script.

This will open a new browser tab for your script project. Name it "Pub API".

Paste The Engine Code:

Delete all the code in the Code.gs file.

Copy the entire contents of the Code.gs file I provided.

Paste it into the Apps Script editor.

Run the One-Time Setup:

At the top of the editor, find the function dropdown (it probably says doGet).

Select the setup function from the list.

Click the Run (▶) button.

Authorization: Google will ask for permission. This is normal.

Click "Review permissions".

Choose your Google account.

You'll see a "Google hasn't verified this app" warning. This is expected. Click "Advanced", then click "Go to Pub API (unsafe)".

Click "Allow" to give your own script permission to edit your own sheet and send email from your own account.

After it runs, check your Google Sheet. You should now see three tabs: Events, Reservations, and Contacts, complete with headers and sample data.

Deploy The Script as a Web App (CRITICAL STEP):

In the Apps Script editor, click the blue "Deploy" button in the top-right.

Select "New deployment".

Click the "Select type" gear icon (⚙) and choose "Web app".

In the "New deployment" dialog:

Description: "Pub Website API v1"

Execute as: "Me" (Your Google Account)

Who has access: "Anyone" (This is required for your index.html file to be able to fetch data. It does not mean anyone can see your sheet, only that they can access this script).

Click "Deploy".

CRITICAL: It will show you a "Web app URL". COPY THIS URL. This is the bridge between your website and your database.

Part 2: Configure The Front-End (index.html)

Edit index.html:

Open the index.html file in a text editor.

Find this line (near the top of the <script> tag, around line 320):

const WEB_APP_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';


Replace 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE' with the Web app URL you just copied from Apps Script.

Save the file.

Host Your Website:

Your index.html file is now your complete, functioning website.

You can deploy this single file anywhere. The easiest free options are:

GitHub Pages: Create a new repository, upload this file as index.html, and enable Pages in the settings.

Netlify Drop: Go to app.netlify.com/drop, drag your index.html file onto the page, and it will be live instantly.

Vercel or Google App Engine (as you noted) also work perfectly.

Part 3: Set Up Automation (Optional, but Recommended)

You have a function in Code.gs called sendWeeklyDigest that automatically emails your contact list. To make it run automatically:

Go back to your Apps Script project.

Click the Triggers (alarm clock icon) on the left-hand menu.

Click "+ Add Trigger" in the bottom-right.

Set it up as follows:

Choose which function to run: sendWeeklyDigest

Choose which deployment...: Head

Select event source: Time-driven

Select type of time...: Week timer

Select day of week: Every Monday (or your choice)

Select time of day: 9am to 10am (or your choice)

Click "Save".

Your system is now fully automated. New reservations will appear in your sheet and send emails, and your weekly newsletter will write and send itself.
