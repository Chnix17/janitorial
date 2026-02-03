/**
 * Format a date value to a short date string (e.g., "Jan 15")
 * @param {string|Date} val - Date value to format
 * @returns {string} Formatted date string
 */
export const fmtShortDate = (val) => {
  if (!val) return '';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/**
 * Get initials from a full name (e.g., "John Doe" -> "JD")
 * @param {string} name - Full name
 * @returns {string} Initials (up to 2 characters)
 */
export const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] || '') : '';
  return (first + last).toUpperCase();
};

/**
 * Format a number with commas as thousands separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined || Number.isNaN(num)) return '—';
  return num.toLocaleString();
};
