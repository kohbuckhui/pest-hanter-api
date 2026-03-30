function markdownToHtml(md) {
  md = md.replace(/\u2014/g, ' - ');
  const lines = md.split('\n');
  const out = [];
  let inUl = false;
  let inParagraph = false;
  const flushUl = () => { if (inUl) { out.push('</ul>'); inUl = false; } };
  const flushP = () => { if (inParagraph) { out.push('</p>'); inParagraph = false; } };

  for (const line of lines) {
    if (/^\s*\|/.test(line)) continue;
    if (/^---+$/.test(line.trim())) { flushUl(); flushP(); out.push('<hr style="border:none;border-top:1px solid #ddd;margin:16px 0">'); continue; }
    if (/^## (.+)/.test(line)) { flushUl(); flushP(); out.push(`<h2 style="color:#1a5276;font-size:18px;margin-top:24px;border-bottom:2px solid #1a5276;padding-bottom:6px">${line.replace(/^## /, '').trim()}</h2>`); continue; }
    if (/^### (.+)/.test(line)) { flushUl(); flushP(); out.push(`<h3 style="color:#1a5276;font-size:15px;margin-top:16px;border-bottom:1px solid #d0e4f0;padding-bottom:4px">${line.replace(/^### /, '').trim()}</h3>`); continue; }
    if (/^#### (.+)/.test(line)) { flushUl(); flushP(); out.push(`<h4 style="color:#2e4057;font-size:14px;margin-top:12px">${line.replace(/^#### /, '').trim()}</h4>`); continue; }
    if (/^# /.test(line)) { flushUl(); flushP(); continue; }
    if (/^[\s]*[-*] (.+)/.test(line)) { flushP(); if (!inUl) { out.push('<ul style="margin:8px 0;padding-left:24px">'); inUl = true; } out.push(`<li style="margin:4px 0;line-height:1.6">${inlineFormat(line.replace(/^[\s]*[-*] /, '').trim())}</li>`); continue; }
    if (/^[\s]*\d+\. (.+)/.test(line)) { flushP(); flushUl(); out.push(`<p style="margin:4px 0;line-height:1.6;padding-left:8px">${inlineFormat(line.trim())}</p>`); continue; }
    if (line.trim() === '') { flushUl(); flushP(); continue; }
    flushUl();
    if (!inParagraph) { out.push('<p style="margin:8px 0;line-height:1.7">'); inParagraph = true; }
    out.push(inlineFormat(line.trim()) + ' ');
  }

  flushUl(); flushP();
  return out.join('\n');
}

function inlineFormat(text) {
  return text
    .replace(/`([^`]+)`/g, '<code style="background:#f4f4f4;padding:1px 4px;border-radius:3px;font-size:13px">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

function buildPhotoGrid(photoArr, label) {
  if (!photoArr || photoArr.length === 0) {
    return '<p style="color:#999;font-style:italic;padding:12px">No photos submitted</p>';
  }
  let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px">';
  for (let i = 0; i < photoArr.length; i++) {
    const src = photoArr[i].startsWith('data:') ? photoArr[i] : 'data:image/jpeg;base64,' + photoArr[i];
    html += `<div><p style="font-size:11px;color:#777;margin-bottom:4px">${label} - Photo ${i + 1}</p>` +
      `<img src="${src}" style="width:100%;border-radius:4px;border:1px solid #ddd" /></div>`;
  }
  html += '</div>';
  return html;
}

function buildReport(data, narrative) {
  const narrativeHtml = markdownToHtml(narrative);
  const areasList = Array.isArray(data.areas) ? data.areas.join(', ') : data.areas;
  const pestsList = Array.isArray(data.pests_found) ? data.pests_found.join(', ') : data.pests_found;
  const chemList = Array.isArray(data.chemicals_used) ? data.chemicals_used.join(', ') : data.chemicals_used;
  const serviceType = Array.isArray(data.service_type) ? data.service_type.join(' + ') : data.service_type;

  const beforePhotos = data.photos_before || (data.photo_before ? [data.photo_before] : []);
  const afterPhotos = data.photos_after || (data.photo_after ? [data.photo_after] : []);
  const beforeHtml = buildPhotoGrid(beforePhotos, 'Before');
  const afterHtml = buildPhotoGrid(afterPhotos, 'After');

  let signatureHtml;
  if (data.signature) {
    const src = data.signature.startsWith('data:') ? data.signature : 'data:image/png;base64,' + data.signature;
    signatureHtml = `<div style="padding:16px">` +
      `<img src="${src}" style="max-width:300px;border:1px solid #ddd;padding:8px;border-radius:4px" />` +
      `<p style="margin-top:8px;font-size:13px;color:#555">Signed on: ${data.date}</p>` +
      `<p style="margin-top:4px;font-size:12px;color:#777;font-style:italic">I acknowledge that the above pest control service has been satisfactorily completed.</p></div>`;
  } else {
    signatureHtml = '<p style="color:#999;font-style:italic;padding:12px">No signature captured</p>';
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pest Hanter Service Report - ${data.report_number}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; color: #333; }
  .header { background: #1a5276; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center; }
  .header h1 { margin: 0; font-size: 26px; letter-spacing: 1px; }
  .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.85; }
  .badge { background: #f39c12; display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-top: 8px; color: #fff; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; background: #eaf2ff; border: 1px solid #1a5276; }
  .info-cell { padding: 10px 16px; border-bottom: 1px solid #c5d8f0; }
  .info-cell:nth-child(odd) { border-right: 1px solid #c5d8f0; }
  .info-label { font-size: 11px; text-transform: uppercase; color: #777; font-weight: bold; }
  .info-value { font-size: 14px; color: #1a5276; font-weight: 600; margin-top: 2px; }
  .section { margin: 24px 0; }
  .section-title { background: #1a5276; color: white; padding: 10px 16px; font-size: 15px; font-weight: bold; border-radius: 4px; }
  .section-body { padding: 16px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 4px 4px; }
  table { width: 100%; border-collapse: collapse; }
  .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; border-top: 2px solid #1a5276; margin-top: 30px; }
  .stamp { display: inline-block; border: 3px solid #1a5276; color: #1a5276; padding: 8px 24px; border-radius: 4px; font-weight: bold; font-size: 16px; margin: 16px auto; letter-spacing: 2px; }
</style>
</head>
<body>
<div class="header">
  <h1>PEST HANTER PTE LTD</h1>
  <p>Licensed Pest Management Company &bull; UEN: 202011295C &bull; Singapore</p>
  <div class="badge">SERVICE REPORT</div>
</div>
<div class="info-grid">
  <div class="info-cell"><div class="info-label">Report Number</div><div class="info-value">${data.report_number}</div></div>
  <div class="info-cell"><div class="info-label">Date of Service</div><div class="info-value">${data.date}</div></div>
  <div class="info-cell"><div class="info-label">Customer Name</div><div class="info-value">${data.customer_name}</div></div>
  <div class="info-cell"><div class="info-label">Service Type</div><div class="info-value">${serviceType}</div></div>
  <div class="info-cell" style="grid-column:span 2"><div class="info-label">Premises Address</div><div class="info-value">${data.address}</div></div>
  <div class="info-cell"><div class="info-label">Areas Treated</div><div class="info-value">${areasList}</div></div>
  <div class="info-cell"><div class="info-label">Technician</div><div class="info-value">${data.technician}</div></div>
  <div class="info-cell"><div class="info-label">Pests Identified</div><div class="info-value">${pestsList}</div></div>
  <div class="info-cell"><div class="info-label">Chemicals Used</div><div class="info-value">${chemList}</div></div>
</div>
<div class="section">
  <div class="section-title">SERVICE NARRATIVE</div>
  <div class="section-body">${narrativeHtml}</div>
</div>
<div class="section">
  <div class="section-title">PHOTO EVIDENCE - BEFORE TREATMENT</div>
  <div class="section-body">${beforeHtml}</div>
</div>
<div class="section">
  <div class="section-title">PHOTO EVIDENCE - AFTER TREATMENT</div>
  <div class="section-body">${afterHtml}</div>
</div>
<div class="section">
  <div class="section-title">CUSTOMER SIGN-OFF</div>
  <div class="section-body">${signatureHtml}</div>
</div>
<div style="text-align:center;margin:30px 0">
  <div class="stamp">SERVICE COMPLETED</div>
</div>
<div class="footer">
  <strong>Pest Hanter Pte Ltd</strong> &bull; UEN: 202011295C &bull; Licensed Pest Management Operator, Singapore<br>
  This report is generated for official service documentation purposes.<br>
  &copy; ${new Date().getFullYear()} Pest Hanter Pte Ltd. All rights reserved.
</div>
</body>
</html>`;

  return html.replace(/\u2014/g, ' - ');
}

module.exports = { buildReport };
