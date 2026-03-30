const REQUIRED = [
  'customer_name', 'address', 'service_type', 'areas',
  'pests_found', 'chemicals_used', 'technician', 'date', 'report_number'
];

function validate(body) {
  const data = { ...body };

  // Normalise service_type: accept string (legacy) or array
  if (typeof data.service_type === 'string' && data.service_type) {
    data.service_type = [data.service_type];
  }

  // Normalise photos: accept single (legacy) or array format
  if (!data.photos_before && data.photo_before) {
    data.photos_before = [data.photo_before];
  }
  if (!data.photos_after && data.photo_after) {
    data.photos_after = [data.photo_after];
  }
  if (Array.isArray(data.photos_before) && data.photos_before.length > 0 && !data.photo_before) {
    data.photo_before = data.photos_before[0];
  }
  if (Array.isArray(data.photos_after) && data.photos_after.length > 0 && !data.photo_after) {
    data.photo_after = data.photos_after[0];
  }

  const errors = REQUIRED.filter(f => {
    const v = data[f];
    if (v === undefined || v === null || v === '') return true;
    if (Array.isArray(v) && v.length === 0) return true;
    return false;
  });

  return { data, errors };
}

module.exports = { validate };
