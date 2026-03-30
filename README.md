# Pest Hanter API

Express backend for Pest Hanter Pte Ltd's service report generation system.

## Architecture

```
POST /webhook/job-submit
  -> Validate payload
  -> Log to CRM (Google Sheets, non-blocking)
  -> Lookup chemicals (Google Sheets RAG)
  -> Generate narrative (Claude claude-sonnet-4-20250514)
  -> Build HTML report
  -> Generate PDF (PDFShift)
  -> Notify admin (Gmail SMTP)
  -> Return JSON response

GET /webhook/approve-report?report_number=X&customer_email=Y&action=approve|reject
  -> Load stored report
  -> Generate PDF (PDFShift)
  -> Send to customer (Gmail SMTP)
  -> Return HTML confirmation page
```

## Setup

```bash
cp .env.example .env
# Fill in all values in .env
npm install
npm start
```

### Google Sheets OAuth2

```bash
npm run get-token
```

Follow the prompts to obtain a refresh token, then add it to `.env`.

### Required Google Sheets

1. **Pest Hanter Chemicals DB** - columns: chemical_name, active_ingredient, chemical_type, target_pests, application_method, dilution_rate, nea_registration, safety_notes, re_entry_interval, signal_word, first_aid
2. **Pest Hanter CRM** - sheet named "Submissions", columns auto-created on first write

## Deploy to Railway

```bash
railway init
railway up
```

Set all environment variables from `.env.example` in the Railway dashboard.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `BASE_URL` | Public URL for approve/reject links |
| `ANTHROPIC_API_KEY` | Claude API key |
| `PDFSHIFT_API_KEY` | PDFShift API key |
| `SMTP_HOST` | SMTP server (default: smtp.gmail.com) |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_USER` | SMTP username / from address |
| `SMTP_PASS` | Gmail app password |
| `ADMIN_EMAIL` | Admin notification recipient |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret |
| `GOOGLE_REFRESH_TOKEN` | Google OAuth2 refresh token |
| `CHEMICALS_SHEET_ID` | Google Sheet ID for chemicals DB |
| `CRM_SHEET_ID` | Google Sheet ID for CRM log |
