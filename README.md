# Month End Close Tracker

Month-End Close Tracker for Finance Team

## Overview

Month End Close Tracker is a lightweight web application for tracking month-end close tasks and activities. Built with vanilla JavaScript and powered by Google Sheets as a database backend.

## Tech Stack

- **Frontend**: Pure HTML, CSS, JavaScript (no frameworks or build tools)
- **Backend**: Google Apps Script
- **Database**: Google Sheets
- **Hosting**: GitHub Pages

## Brand Colors

- Primary Green: `#08CA4A`
- Black: `#000000`
- White: `#FFFFFF`
- Light Gray: `#F5F5F5`

## Project Structure

```
/project-meridian
  index.html                  ← Main application interface
  style.css                   ← All styles and theming
  app.js                      ← Frontend application logic
  config.js                   ← Configuration and constants
  Code.gs                     ← Google Apps Script backend
  favicon.svg                 ← Favicon
  anaconda-logo.svg           ← Header logo (optional)
  .github/workflows/deploy.yml ← GitHub Actions deployment
  README.md                   ← This file
```

---

## Complete Setup Guide

Follow these steps to deploy Month End Close Tracker from scratch.

### Step 1: Google Sheets Setup

#### 1.1 Create a New Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Click **+ Blank** to create a new spreadsheet
3. Name it **"Month End Close Tracker - Month-End Close"**

#### 1.2 Set Up the Tasks Tab

1. Rename **"Sheet1"** to **"Tasks"**
2. Add the following header row in **Row 1**:

| Column | Header Name      | Description                                           |
|--------|------------------|-------------------------------------------------------|
| A      | TaskID           | Unique identifier (e.g., "AR-001")                    |
| B      | Area             | Free text grouping (e.g., "Accounts Receivable")      |
| C      | TaskName         | Short task name                                       |
| D      | Description      | Detailed description                                  |
| E      | Owner            | Person responsible (use "Shared" for multiple owners) |
| F      | BusinessDayDue   | Integer: business days after month end (e.g., 3)      |
| G      | Entity           | One of: US, Germany, UK, AGS, PythonAnywhere, Step Computing |
| H      | Status           | One of: "Not Started", "In Progress", "Complete"      |
| I      | CompletedBy      | Auto-populated when task marked complete              |
| J      | CompletedAt      | Auto-populated ISO timestamp                          |
| K      | Notes            | Optional free text                                    |

**Copy-paste ready header row:**
```
TaskID	Area	TaskName	Description	Owner	BusinessDayDue	Entity	Status	CompletedBy	CompletedAt	Notes
```

#### 1.3 Add Sample Data (Optional)

Add a few sample tasks in rows 2 and beyond:

```
AR-001	Accounts Receivable	Invoice Review	Review all outstanding invoices	John Smith	2	US	Not Started			
AP-002	Accounts Payable	Vendor Reconciliation	Reconcile vendor statements	Jane Doe	3	Germany	Not Started			
GL-003	General Ledger	Journal Entries	Post month-end journal entries	Shared	1	UK	In Progress			
```

#### 1.4 Note Your Sheet ID

1. Look at the URL of your Google Sheet
2. Copy the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
   ```
3. Save this ID for the next step

---

### Step 2: Google Apps Script Setup

#### 2.1 Open the Apps Script Editor

1. In your Google Sheet, click **Extensions** > **Apps Script**
2. A new tab opens with the Apps Script editor

#### 2.2 Add the Backend Code

1. Delete any existing code in `Code.gs`
2. Copy the entire contents of **`Code.gs`** from this repository
3. Paste into the Apps Script editor

#### 2.3 Update the Sheet ID

1. Find this line near the top of `Code.gs`:
   ```javascript
   const SHEET_ID = 'YOUR_SHEET_ID_HERE';
   ```
2. Replace `'YOUR_SHEET_ID_HERE'` with your actual Sheet ID from Step 1.4

#### 2.4 Save the Project

1. Click the **save icon** (💾) or press **Ctrl+S** (Cmd+S on Mac)
2. Name the project **"Month End Close Tracker API"**

#### 2.5 Deploy as Web App

1. Click **Deploy** > **New deployment**
2. Click the **gear icon** (⚙️) next to "Select type"
3. Choose **Web app**
4. Configure deployment settings:
   - **Description**: `Month End Close Tracker API v1`
   - **Execute as**: **Me** (your Google account)
   - **Who has access**: Choose one:
     - `Only myself` – for testing
     - `Anyone with Google account` – for internal company use
     - `Anyone` – for public access (use with caution)
5. Click **Deploy**

#### 2.6 Authorize the Script

1. Click **Authorize access**
2. Choose your Google account
3. You may see a warning: **"Google hasn't verified this app"**
   - Click **Advanced**
   - Click **Go to Month End Close Tracker API (unsafe)**
4. Click **Allow**

#### 2.7 Copy the Web App URL

1. After deployment, you'll see a **Web app URL**
2. Copy this URL — it looks like:
   ```
   https://script.google.com/macros/s/ABC123XYZ.../exec
   ```
3. **Save this URL** — you'll need it in the next step

---

### Step 3: Configure the Frontend

#### 3.1 Clone or Download This Repository

```bash
git clone https://github.com/YOUR_USERNAME/project-meridian.git
cd project-meridian
```

Or download as ZIP and extract.

#### 3.2 Update config.js

1. Open **`config.js`** in a text editor
2. Find this line:
   ```javascript
   API_URL: 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE',
   ```
3. Replace `'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'` with your Web App URL from Step 2.7:
   ```javascript
   API_URL: 'https://script.google.com/macros/s/ABC123XYZ.../exec',
   ```
4. Save the file

#### 3.3 Add the Anaconda Logo (Optional)

1. Place your Anaconda logo file in the root directory as **`anaconda-logo.svg`**
2. If you don't have a logo, the app will work fine without it — the header will just show the title

The favicon is already included as `favicon.svg` (green "M" on a rounded square).

---

### Step 4: Test Locally

1. Open **`index.html`** in a web browser
2. You should see:
   - The app loads
   - Tasks appear in tabs organized by Owner
   - You can change task statuses
   - Changes save back to Google Sheets

**If you see an error:**
- Check that the Apps Script URL in `config.js` is correct
- Check that the Apps Script is deployed and authorized
- Check your browser console (F12) for error messages

---

### Step 5: Deploy to GitHub Pages

#### 5.1 Create a GitHub Repository

1. Go to [github.com](https://github.com) and log in
2. Click **+** (top right) > **New repository**
3. Name it **`project-meridian`**
4. Set to **Public** (required for free GitHub Pages)
5. Do **NOT** initialize with README (we already have one)
6. Click **Create repository**

#### 5.2 Push Your Code to GitHub

```bash
cd project-meridian

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Month End Close Tracker month-end close tracker"

# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/project-meridian.git

# Push to main branch
git branch -M main
git push -u origin main
```

#### 5.3 Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (tab at the top)
3. Click **Pages** (in the left sidebar)
4. Under **Source**, select:
   - **Branch**: `main`
   - **Folder**: `/ (root)`
5. Click **Save**
6. GitHub will show a message: **"Your site is published at https://YOUR_USERNAME.github.io/project-meridian/"**

#### 5.4 Wait for Deployment

- GitHub Actions will automatically deploy your site (see `.github/workflows/deploy.yml`)
- This takes 1-2 minutes
- Check the **Actions** tab to see deployment progress
- Once complete, visit your site at:
  ```
  https://YOUR_USERNAME.github.io/project-meridian/
  ```

---

### Step 6: Using the App

#### For Team Members

1. Open the GitHub Pages URL: `https://YOUR_USERNAME.github.io/project-meridian/`
2. Click on your tab (tabs are generated from the Owner column in the sheet)
3. View your tasks grouped by Area
4. Filter by Entity using the filter pills
5. Update task status using the dropdown
6. When marking a task "Complete", enter your name in the modal

#### For Controllers/Admins

1. Open the **Summary** tab to see:
   - Overall team progress
   - Individual team member progress cards
   - All open tasks sorted by due date
   - Recent completions audit log
2. Use the entity filter to view a single entity's tasks
3. Keep the Summary tab open on a shared screen during month-end close (auto-refreshes every 60 seconds)

#### Managing Tasks

To add, edit, or delete tasks:
1. Go directly to the Google Sheet
2. Add new rows with tasks
3. The app will automatically pick them up (refreshes every 30-60 seconds, or reload the page)

---

## Features

- **Dynamic Tabs**: One tab per distinct Owner value in the sheet
- **Dynamic Grouping**: Tasks grouped by Area within each tab
- **Entity Filtering**: Filter tasks by entity (US, Germany, UK, etc.)
- **Business Day Tracking**: Color-coded badges show on-track (green), due today (yellow), overdue (red)
- **Progress Tracking**: Progress bars for each person and overall team
- **Summary Dashboard**: Real-time overview with team cards, open tasks table, and audit log
- **Auto-Refresh**: Summary refreshes every 60 seconds, other tabs every 30 seconds
- **Mobile Responsive**: Works on desktop, tablet, and mobile

---

## Maintenance

### Updating the App

1. Make changes to HTML, CSS, or JS files locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
3. GitHub Actions automatically deploys to GitHub Pages in 1-2 minutes

### Updating the Apps Script

1. Go to Extensions > Apps Script in your Google Sheet
2. Make changes to `Code.gs`
3. Save the file
4. Click **Deploy** > **Manage deployments**
5. Click the **Edit** icon (pencil) on your deployment
6. Change **Version** to **New version**
7. Click **Deploy**

### Adding US Federal Holidays

Edit `config.js` and update the `FEDERAL_HOLIDAYS_2026` array with dates in `YYYY-MM-DD` format.

---

## Troubleshooting

### Tasks not loading

- Check that the Apps Script URL in `config.js` is correct
- Check that the Apps Script is deployed with "Who has access" set appropriately
- Check browser console (F12) for CORS or network errors

### Changes not saving

- Check that the Apps Script has permission to edit the sheet
- Check the Apps Script logs: Extensions > Apps Script > Executions

### GitHub Pages not updating

- Check the **Actions** tab in GitHub for deployment status
- Ensure GitHub Pages is enabled in Settings > Pages
- Clear your browser cache and hard refresh (Ctrl+Shift+R)

---

## Support

For questions or issues, contact the Finance Team.

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-23  
**Built with**: Pure HTML, CSS, JavaScript + Google Apps Script
