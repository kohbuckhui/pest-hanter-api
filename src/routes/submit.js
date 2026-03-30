const express = require('express');
const router = express.Router();
const { validate } = require('../services/validator');
const { lookupChemicals } = require('../services/chemicals');
const { generateNarrative } = require('../services/claude');
const { buildReport } = require('../services/reportBuilder');
const { generatePdf } = require('../services/pdfshift');
const { notifyAdmin } = require('../services/mailer');
const { logToCrm } = require('../services/crm');
const { saveReport } = require('../services/reportStore');

router.post('/job-submit', async (req, res) => {
  const start = Date.now();
  try {
    // 1. Validate
    const { data, errors } = validate(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ' + errors.join(', '),
        missingFields: errors
      });
    }

    // 2. Log to CRM (non-blocking)
    logToCrm(data).catch(err => console.error('[CRM]', err.message));

    // 3. Lookup chemicals from Google Sheets
    let ragText = '';
    try {
      ragText = await lookupChemicals(data.chemicals_used);
    } catch (err) {
      console.error('[CHEMICALS]', err.message);
    }

    // 4. Generate narrative via Claude
    const narrative = await generateNarrative(data, ragText);

    // 5. Build HTML report
    const reportHtml = buildReport(data, narrative);

    // 6. Generate PDF
    let pdfBuffer = null;
    try {
      pdfBuffer = await generatePdf(reportHtml);
    } catch (err) {
      console.error('[PDF]', err.message);
    }

    // 7. Store report for approve workflow
    saveReport(data.report_number, {
      report_number: data.report_number,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      address: data.address,
      service_type: data.service_type,
      technician: data.technician,
      date: data.date,
      report_html: reportHtml,
      narrative
    });

    // 8. Notify admin via email
    let adminNotified = false;
    try {
      await notifyAdmin(data, pdfBuffer);
      adminNotified = true;
    } catch (err) {
      console.error('[EMAIL]', err.message);
    }

    console.log(`[SUBMIT] ${data.report_number} completed in ${Date.now() - start}ms`);

    res.json({
      success: true,
      report_number: data.report_number,
      narrative,
      report_html: reportHtml,
      pdf_generated: !!pdfBuffer,
      admin_notified: adminNotified
    });
  } catch (err) {
    console.error('[SUBMIT]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
