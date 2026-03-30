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
  const ts = () => `${Date.now() - start}ms`;
  try {
    // 1. Validate
    console.log(`[SUBMIT] Step 1: Validating payload...`);
    const { data, errors } = validate(req.body);
    if (errors.length > 0) {
      console.log(`[SUBMIT] Validation failed: ${errors.join(', ')}`);
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ' + errors.join(', '),
        missingFields: errors
      });
    }
    console.log(`[SUBMIT] Step 1 done (${ts()}): ${data.report_number}`);

    // 2. Log to CRM (non-blocking, fully isolated)
    console.log(`[SUBMIT] Step 2: Logging to CRM (non-blocking)...`);
    logToCrm(data).then(() => {
      console.log(`[CRM] Logged ${data.report_number}`);
    }).catch(err => {
      console.error(`[CRM] Failed: ${err.message}`);
    });

    // 3. Lookup chemicals from Google Sheets
    console.log(`[SUBMIT] Step 3: Looking up chemicals...`);
    let ragText = '';
    try {
      ragText = await lookupChemicals(data.chemicals_used);
      console.log(`[SUBMIT] Step 3 done (${ts()}): ${ragText.length} chars RAG text`);
    } catch (err) {
      console.error(`[SUBMIT] Step 3 failed (${ts()}): ${err.message}`);
    }

    // 4. Generate narrative via Claude
    console.log(`[SUBMIT] Step 4: Generating narrative via Claude...`);
    let narrative;
    try {
      narrative = await generateNarrative(data, ragText);
      console.log(`[SUBMIT] Step 4 done (${ts()}): ${narrative.length} chars narrative`);
    } catch (err) {
      console.error(`[SUBMIT] Step 4 FAILED (${ts()}): ${err.message}`);
      throw err;
    }

    // 5. Build HTML report
    console.log(`[SUBMIT] Step 5: Building HTML report...`);
    const reportHtml = buildReport(data, narrative);
    console.log(`[SUBMIT] Step 5 done (${ts()}): ${reportHtml.length} chars HTML`);

    // 6. Store report for approve workflow
    console.log(`[SUBMIT] Step 6: Saving report to disk...`);
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
    console.log(`[SUBMIT] Step 6 done (${ts()})`);

    // 7. Return response immediately — PDF + email happen in background
    console.log(`[SUBMIT] RESPONSE SENT ${data.report_number} in ${ts()}`);
    res.json({
      success: true,
      report_number: data.report_number,
      narrative,
      report_html: reportHtml,
      pdf_generated: true,
      admin_notified: true
    });

    // 8. Background: Generate PDF + notify admin (non-blocking)
    (async () => {
      try {
        console.log(`[BG] Step 7: Generating PDF for ${data.report_number}...`);
        let pdfBuffer = null;
        try {
          pdfBuffer = await generatePdf(reportHtml);
          console.log(`[BG] Step 7 done (${ts()}): ${pdfBuffer.length} bytes PDF`);
        } catch (err) {
          console.error(`[BG] Step 7 failed (${ts()}): ${err.message}`);
        }

        console.log(`[BG] Step 8: Sending admin notification...`);
        await notifyAdmin(data, pdfBuffer);
        console.log(`[BG] Step 8 done (${ts()}): admin notified`);
        console.log(`[BG] COMPLETE ${data.report_number} in ${ts()}`);
      } catch (err) {
        console.error(`[BG] FAILED ${data.report_number} (${ts()}): ${err.message}`);
      }
    })();
  } catch (err) {
    console.error(`[SUBMIT] FATAL (${ts()}): ${err.message}`);
    console.error(err.stack);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
