const express = require('express');
const router = express.Router();
const { loadReport } = require('../services/reportStore');
const { generatePdf } = require('../services/pdfshift');
const { sendToCustomer } = require('../services/mailer');

function htmlPage(icon, color, title, body) {
  return `<!DOCTYPE html><html><body style="font-family:Arial;text-align:center;padding:60px;background:#f8f9fa">
<div style="background:white;padding:40px;border-radius:12px;max-width:500px;margin:0 auto;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
<div style="font-size:48px">${icon}</div>
<h2 style="color:${color}">${title}</h2>
${body}
</div></body></html>`;
}

router.get('/approve-report', async (req, res) => {
  const { report_number, customer_email, action } = req.query;

  if (!report_number) {
    return res.status(400).send(htmlPage('&#9888;', '#dc2626', 'Missing Parameters',
      '<p>No report_number provided.</p>'));
  }

  // Reject action
  if (action === 'reject') {
    return res.send(htmlPage('&#10060;', '#dc2626', 'Report Rejected',
      `<p>Report <strong>${report_number}</strong> has been rejected and will NOT be sent to the customer.</p>
       <p style="color:#888;font-size:13px">You can close this tab.</p>`));
  }

  // Approve action
  try {
    const report = loadReport(report_number);
    if (!report) {
      return res.status(404).send(htmlPage('&#128269;', '#dc2626', 'Report Not Found',
        `<p>Report <strong>${report_number}</strong> was not found. It may have expired or already been processed.</p>`));
    }

    const email = customer_email || report.customer_email;
    if (!email) {
      return res.status(400).send(htmlPage('&#9888;', '#dc2626', 'No Customer Email',
        `<p>No customer email is available for report <strong>${report_number}</strong>.</p>`));
    }

    // Generate PDF and send
    const pdfBuffer = await generatePdf(report.report_html);
    await sendToCustomer(email, report_number, pdfBuffer);

    res.send(htmlPage('&#10003;', '#028090', 'Report Approved',
      `<p>Report <strong>${report_number}</strong> has been sent to <strong>${email}</strong>.</p>
       <p style="color:#888;font-size:13px">You can close this tab.</p>`));
  } catch (err) {
    console.error('[APPROVE]', err.message);
    res.status(500).send(htmlPage('&#9888;', '#dc2626', 'Error',
      `<p>Failed to process report: ${err.message}</p>`));
  }
});

module.exports = router;
