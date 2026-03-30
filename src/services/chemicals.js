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

async function lookupChemicals(chemicalsUsed) {
  if (!process.env.CHEMICALS_SHEET_ID || !process.env.GOOGLE_REFRESH_TOKEN) return '';

  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.CHEMICALS_SHEET_ID,
    range: 'Chemicals!A:K'
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return '';

  const headers = rows[0];
  const dataRows = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });

  const matched = [];
  for (const chem of chemicalsUsed) {
    const search = chem.toLowerCase();
    const found = dataRows.find(r => {
      const name = (r.chemical_name || '').toLowerCase();
      return name === search || search.includes(name) || name.includes(search);
    });
    if (found) matched.push(found);
    else matched.push({ chemical_name: chem, active_ingredient: 'Unknown' });
  }

  return matched.map(c =>
    `${c.chemical_name}: Active ingredient: ${c.active_ingredient || 'N/A'}. ` +
    `Type: ${c.chemical_type || 'N/A'}. ` +
    `Application: ${c.application_method || 'N/A'} at ${c.dilution_rate || 'N/A'}. ` +
    `Re-entry: ${c.re_entry_interval || 'N/A'}. ` +
    `Safety: ${c.safety_notes || 'N/A'}. ` +
    `Signal word: ${c.signal_word || 'N/A'}.`
  ).join('\n');
}

module.exports = { lookupChemicals };
