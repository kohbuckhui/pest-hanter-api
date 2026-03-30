const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '..', '..', 'data', 'reports');

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function saveReport(reportNumber, data) {
  const filePath = path.join(REPORTS_DIR, `${sanitize(reportNumber)}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadReport(reportNumber) {
  const filePath = path.join(REPORTS_DIR, `${sanitize(reportNumber)}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

module.exports = { saveReport, loadReport };
