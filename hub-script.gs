// ═══════════════════════════════════════════════════════════
// WC2026 Predictor — Google Apps Script Hub
//
// SETUP (one time):
//  1. Create a new Google Sheet
//  2. Click Extensions → Apps Script
//  3. Replace Code.gs contents with this file
//
//  RESTRICT PERMISSIONS TO THIS SHEET ONLY (recommended):
//  4. Click ⚙️ Project Settings → check "Show appsscript.json in editor"
//  5. Click Editor, open appsscript.json, replace contents with:
//     {
//       "timeZone": "America/New_York",
//       "dependencies": {},
//       "exceptionLogging": "STACKDRIVER",
//       "runtimeVersion": "V8",
//       "oauthScopes": [
//         "https://www.googleapis.com/auth/spreadsheets.currentonly"
//       ]
//     }
//  6. Save appsscript.json
//
//  DEPLOY:
//  7. Click Deploy → New deployment
//     - Type: Web app
//     - Execute as: Me
//     - Who has access: Anyone
//  8. Authorise — it will now only ask for access to THIS spreadsheet
//  9. Copy the Web App URL and paste it into the app's Admin tab
// ═══════════════════════════════════════════════════════════

const PREDICTIONS_SHEET = 'Predictions';
const RESULTS_SHEET     = 'Results';
const CONFIG_SHEET      = 'Config';

// ── HTTP handlers ─────────────────────────────────────────

function doGet(e) {
  try {
    const action = e.parameter.action || '';
    if (action === 'predictions') return jsonOut(getPredictions());
    if (action === 'results')     return jsonOut(getResults());
    if (action === 'all')         return jsonOut({ predictions: getPredictions(), results: getResults() });
    return jsonOut({ error: 'Use ?action=predictions | results | all' });
  } catch(err) {
    return jsonOut({ error: err.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || '';
    if (action === 'submit')  return jsonOut(savePrediction(data));
    if (action === 'results') return jsonOut(pushResults(data));
    return jsonOut({ error: 'Unknown action: ' + action });
  } catch(err) {
    return jsonOut({ error: err.message });
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Predictions ───────────────────────────────────────────

function savePrediction(data) {
  const name = (data.name || '').trim();
  if (!name) return { error: 'Name is required' };

  const sheet = getOrCreateSheet(PREDICTIONS_SHEET,
    ['Submitted', 'Name', 'Group Predictions', 'Knockout Predictions']);

  const values = sheet.getDataRange().getValues();
  const row = [new Date(), name,
               JSON.stringify(data.gPreds || {}),
               JSON.stringify(data.kPreds  || {})];

  // Update existing row if name matches (case-insensitive)
  for (let i = 1; i < values.length; i++) {
    if ((values[i][1] || '').toLowerCase() === name.toLowerCase()) {
      sheet.getRange(i + 1, 1, 1, 4).setValues([row]);
      return { success: true, action: 'updated', name };
    }
  }

  sheet.appendRow(row);
  return { success: true, action: 'created', name };
}

function getPredictions() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PREDICTIONS_SHEET);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  const results = [];
  for (let i = 1; i < values.length; i++) {
    const [submitted, name, gStr, kStr] = values[i];
    if (!name) continue;
    try {
      results.push({
        name,
        submittedAt: submitted ? submitted.toISOString() : null,
        gPreds: JSON.parse(gStr || '{}'),
        kPreds: JSON.parse(kStr  || '{}'),
      });
    } catch(e) { /* skip malformed row */ }
  }
  return results;
}

// ── Results ───────────────────────────────────────────────

function pushResults(data) {
  if (!checkToken(data.token)) return { error: 'Invalid admin token' };

  const sheet = getOrCreateSheet(RESULTS_SHEET,
    ['Game ID', 'Home Score', 'Away Score', 'Updated']);
  sheet.clearContents();
  sheet.appendRow(['Game ID', 'Home Score', 'Away Score', 'Updated']);

  const gResults = data.gResults || {};
  for (const [id, scores] of Object.entries(gResults)) {
    sheet.appendRow([Number(id), scores[0], scores[1], new Date()]);
  }
  return { success: true, count: Object.keys(gResults).length };
}

function getResults() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESULTS_SHEET);
  if (!sheet) return {};

  const values = sheet.getDataRange().getValues();
  const results = {};
  for (let i = 1; i < values.length; i++) {
    const [id, home, away] = values[i];
    if (id !== '') results[String(id)] = [Number(home), Number(away)];
  }
  return results;
}

// ── Helpers ───────────────────────────────────────────────

function checkToken(token) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
  const defaultToken = 'wc2026admin';
  if (!sheet) return token === defaultToken;
  const saved = sheet.getRange('B1').getValue();
  return token === (saved || defaultToken);
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
         .setBackground('#1e3a5f')
         .setFontColor('#ffffff')
         .setFontWeight('bold');
  }
  return sheet;
}
