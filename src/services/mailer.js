const { google } = require('googleapis');

let gmailClient = null;

function getGmail() {
  if (gmailClient) return gmailClient;
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  gmailClient = google.gmail({ version: 'v1', auth });
  return gmailClient;
}

function buildMimeMessage({ from, to, subject, html, attachments }) {
  const boundary = 'boundary_' + Date.now().toString(36);
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html).toString('base64'),
  ];

  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      lines.push(
        `--${boundary}`,
        `Content-Type: ${att.contentType}; name="${att.filename}"`,
        `Content-Disposition: attachment; filename="${att.filename}"`,
        'Content-Transfer-Encoding: base64',
        '',
        att.content.toString('base64')
      );
    }
  }

  lines.push(`--${boundary}--`);
  return lines.join('\r\n');
}

async function sendEmail({ from, to, subject, html, attachments }) {
  const gmail = getGmail();
  const raw = buildMimeMessage({ from, to, subject, html, attachments });
  const encodedMessage = Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage }
  });
}

async function notifyAdmin(data, pdfBuffer) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const serviceType = Array.isArray(data.service_type)
    ? data.service_type.join(' + ')
    : data.service_type;

  const approveUrl = `${baseUrl}/webhook/approve-report?` +
    `report_number=${encodeURIComponent(data.report_number)}` +
    `&customer_email=${encodeURIComponent(data.customer_email || '')}` +
    `&action=approve`;

  const rejectUrl = `${baseUrl}/webhook/approve-report?` +
    `report_number=${encodeURIComponent(data.report_number)}` +
    `&action=reject`;

  const html = `<h2 style="color:#028090">New Service Report Ready for Review</h2>
<p>Please review and approve before sending to customer.</p>
<table style="border-collapse:collapse;margin:16px 0;width:100%">
<tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#0D1B3E">Report:</td><td style="padding:8px 0">${data.report_number}</td></tr>
<tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#0D1B3E">Customer:</td><td style="padding:8px 0">${data.customer_name}</td></tr>
<tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#0D1B3E">Address:</td><td style="padding:8px 0">${data.address}</td></tr>
<tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#0D1B3E">Service:</td><td style="padding:8px 0">${serviceType}</td></tr>
<tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#0D1B3E">Technician:</td><td style="padding:8px 0">${data.technician}</td></tr>
<tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#0D1B3E">Date:</td><td style="padding:8px 0">${data.date}</td></tr>
<tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#0D1B3E">Email:</td><td style="padding:8px 0">${data.customer_email || 'Not provided'}</td></tr>
</table>
<div style="margin:24px 0">
<a href="${approveUrl}" style="display:inline-block;padding:12px 24px;background:#02C39A;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;margin:10px 4px">APPROVE AND SEND TO CUSTOMER</a>
<a href="${rejectUrl}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;margin:10px 4px">REJECT - DO NOT SEND</a>
</div>`;

  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `${data.report_number}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    });
  }

  await sendEmail({
    from: process.env.SMTP_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `[ACTION REQUIRED] New Report - ${data.report_number} - ${data.customer_name}`,
    html,
    attachments
  });
}

async function sendToCustomer(email, reportNumber, pdfBuffer) {
  const html = `<h2 style="color:#028090">Your Service Report is Ready</h2>
<p>Dear Customer,</p>
<p>Please find attached your pest control service report <strong>${reportNumber}</strong> from Pest Hanter Pte Ltd.</p>
<p>Thank you for choosing our services.</p>
<br>
<p style="color:#777;font-size:12px">Pest Hanter Pte Ltd - Licensed Pest Management Operator, Singapore</p>`;

  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `${reportNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    });
  }

  await sendEmail({
    from: process.env.SMTP_USER,
    to: email,
    subject: `Pest Hanter Service Report - ${reportNumber}`,
    html,
    attachments
  });
}

module.exports = { notifyAdmin, sendToCustomer };
