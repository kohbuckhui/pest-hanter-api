const axios = require('axios');

async function generatePdf(reportHtml) {
  const res = await axios.post('https://api.pdfshift.io/v3/convert/pdf', {
    source: reportHtml,
    landscape: false,
    use_print: true,
    sandbox: false,
    raise_for_status: true
  }, {
    headers: {
      'X-API-Key': process.env.PDFSHIFT_API_KEY,
      'Content-Type': 'application/json'
    },
    responseType: 'arraybuffer',
    timeout: 30000
  });

  return Buffer.from(res.data);
}

module.exports = { generatePdf };
