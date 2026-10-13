/**
 * Escape fields against CSV injection attacks (Excel formula execution)
 */
export function sanitizeCsvField(field) {
  if (field === null || field === undefined) return '""';
  let str = String(field);

  // If string starts with formula trigger characters, prepend single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'` + str;
  }

  // Double up internal double quotes and wrap in quotes
  return `"${str.replace(/"/g, '""')}"`;
}

export function generateParticipantsCsv(records) {
  const headers = [
    'Registration ID',
    'Full Name',
    'Mail ID / Email',
    'Course / Program',
    'Registered Date (UTC)',
    'Simulated Outcome',
    'Location Consent',
    'Latitude',
    'Longitude'
  ];

  const rows = records.map(r => [
    sanitizeCsvField(r.registration_id),
    sanitizeCsvField(r.full_name),
    sanitizeCsvField(r.email || r.phone_number),
    sanitizeCsvField(r.course),
    sanitizeCsvField(r.created_at),
    sanitizeCsvField(r.outcome || 'Not Played'),
    sanitizeCsvField(r.opted_in === 1 ? 'Allowed' : (r.opted_in === 0 ? 'Skipped' : 'Pending')),
    sanitizeCsvField(r.latitude ?? ''),
    sanitizeCsvField(r.longitude ?? '')
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}
