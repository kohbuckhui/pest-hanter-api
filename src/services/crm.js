const { google } = require('googleapis');

let sheetsClient = null;

function getSheets() {
  if (sheetsClient) return sheetsClient;
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

async function logToCrm(data) {
  if (!process.env.CRM_SHEET_ID || !process.env.GOOGLE_REFRESH_TOKEN) return;

  const sheets = getSheets();
  const photoBeforeStatus = data.photo_before_note
    ? 'No visible evidence'
    : (data.photos_before && data.photos_before.length > 0)
      ? `Photo captured (${data.photos_before.length})`
      : data.photo_before ? 'Photo captured (1)' : 'No photo';

  const photoAfterStatus = data.photo_after_note
    ? 'No visible evidence'
    : (data.photos_after && data.photos_after.length > 0)
      ? `Photo captured (${data.photos_after.length})`
      : data.photo_after ? 'Photo captured (1)' : 'No photo';

  const row = [
    new Date().toISOString(),
    data.report_number || '',
    data.customer_name || '',
    data.customer_email || '',
    data.address || '',
    Array.isArray(data.service_type) ? data.service_type.join(', ') : (data.service_type || ''),
    (data.areas || []).join(', '),
    (data.pests_found || []).join(', '),
    (data.chemicals_used || []).join(', '),
    data.technician || '',
    data.notes || '',
    photoBeforeStatus,
    photoAfterStatus,
    data.photos_before ? data.photos_before.length : (data.photo_before ? 1 : 0),
    data.photos_after ? data.photos_after.length : (data.photo_after ? 1 : 0),
    data.signature ? 'Yes' : 'No',
    data.video_url ? 'Yes' : 'No'
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.CRM_SHEET_ID,
    range: 'Submissions!A:Q',
    valueInputOption: 'RAW',
    requestBody: { values: [row] }
  });
}

module.exports = { logToCrm };
