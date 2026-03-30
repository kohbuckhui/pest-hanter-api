/**
 * Helper script to obtain a Google OAuth2 refresh token.
 *
 * Starts a local HTTP server on port 3001 to catch the OAuth2 callback.
 *
 * Usage:
 *   npm run get-token
 */

require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const REDIRECT_URI = 'http://localhost:3001/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/spreadsheets'],
  prompt: 'consent'
});

console.log('\nOpen this URL in your browser:\n');
console.log(authUrl);
console.log('\nWaiting for authorization...\n');

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname !== '/oauth2callback') {
    res.writeHead(404);
    res.end();
    return;
  }

  const code = parsed.query.code;
  if (!code) {
    res.writeHead(400);
    res.end('Missing code parameter');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Success!</h1><p>You can close this tab. Check your terminal for the refresh token.</p>');

    console.log('='.repeat(60));
    console.log('GOOGLE_REFRESH_TOKEN:');
    console.log(tokens.refresh_token);
    console.log('='.repeat(60));
    console.log('\nAdd this to your .env file as GOOGLE_REFRESH_TOKEN');
  } catch (err) {
    res.writeHead(500);
    res.end('Error: ' + err.message);
    console.error('Error:', err.message);
  }

  setTimeout(() => { server.close(); process.exit(0); }, 1000);
});

server.listen(3001, () => {
  console.log('Callback server listening on http://localhost:3001');
});
