const axios = require('axios');

const SYSTEM_PROMPT = `You are a professional pest control report writer for Pest Hanter Pte Ltd, a licensed pest management company in Singapore. Write a formal service report in third-person professional tone with four sections: Service Overview, Findings, Treatment Applied, Recommendations. When multiple service types are listed, cover each service type in the report and explain the combined treatment approach. In the Treatment Applied section, for each chemical used include: active ingredient, application method and dilution rate, re-entry interval, and relevant safety precautions. This data comes from the NEA-registered product database and must be accurately reflected. Do not mention AI. Do not use em-dashes in your response. Use colons or plain hyphens instead.`;

async function generateNarrative(data, ragText) {
  const serviceType = Array.isArray(data.service_type)
    ? data.service_type.join(' + ')
    : data.service_type;

  const areas = (data.areas || []).join(', ') +
    (data.areas_other ? ` (Other: ${data.areas_other})` : '');

  const pests = (data.pests_found || []).join(', ') +
    (data.pests_other ? ` (Other: ${data.pests_other})` : '');

  const userPrompt = [
    `Customer Name: ${data.customer_name}`,
    `Address: ${data.address}`,
    `Service Type: ${serviceType}`,
    `Areas Treated: ${areas}`,
    `Pests Found: ${pests}`,
    `Chemicals Used: ${(data.chemicals_used || []).join(', ')}`,
    `Technician: ${data.technician}`,
    `Date: ${data.date}`,
    `Report Number: ${data.report_number}`,
    `Notes: ${data.notes || 'None'}`,
    '',
    'Chemical Safety Data (from NEA-registered product database):',
    ragText || 'No chemical data available',
    '',
    data.photo_before_note ? `Before Treatment Photo Note: ${data.photo_before_note}` : '',
    data.photo_after_note ? `After Treatment Photo Note: ${data.photo_after_note}` : '',
    '',
    'Write a complete formal pest control service report with all four sections. Ensure the Treatment Applied section references the chemical safety data provided above.'
  ].filter(Boolean).join('\n');

  const res = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }]
  }, {
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    timeout: 60000
  });

  return res.data.content[0].text;
}

module.exports = { generateNarrative };
