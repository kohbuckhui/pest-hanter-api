/**
 * Helper script to obtain a Google OAuth2 refresh token.
 *
 * Prerequisites:
 *   1. Create a project at https://console.cloud.google.com
 *   2. Enable the Google Sheets API
 *   3. Create OAuth2 credentials (Desktop app type)
 *   4. Download the credentials and set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env
 *
 * Usage:
 *   npm run get-token
 *
 * Follow the URL printed to the console, authorise access,
 * paste the code back, and copy the refresh_token into your .env file.
 */

require('dotenv').config();
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/spreadsheets'],
  prompt: 'consent'
});

console.log('\n1. Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n2. Authorise the app and copy the code.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('3. Paste the code here: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log('\nRefresh token (add to .env as GOOGLE_REFRESH_TOKEN):');
    console.log(tokens.refresh_token);
  } catch (err) {
    console.error('Error:', err.message);
  }
  rl.close();
});
