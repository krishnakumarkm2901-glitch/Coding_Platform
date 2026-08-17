/**
 * Standardized Date and Time utilities for Asia/Kolkata (IST) timezone.
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Formats a UTC ISO timestamp or date string into human-readable IST string.
 * e.g., "Aug 17, 2026, 6:25 PM"
 */
export const formatISTDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  
  let dateObj;
  if (typeof dateStr === 'string') {
    // If string has no timezone indicator (naive), append 'Z' if it looks like ISO or parse carefully
    if (!dateStr.includes('Z') && !dateStr.includes('+') && dateStr.includes('T')) {
      dateObj = new Date(dateStr + 'Z');
    } else {
      dateObj = new Date(dateStr);
    }
  } else {
    dateObj = new Date(dateStr);
  }

  if (isNaN(dateObj.getTime())) return String(dateStr);

  return dateObj.toLocaleString('en-US', {
    timeZone: IST_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Alias for formatISTDateTime for drop-in replacement across components.
 */
export const formatDateTime = formatISTDateTime;

/**
 * Formats a UTC date string into `YYYY-MM-DDTHH:mm` format in Asia/Kolkata (IST)
 * for use as value in `<input type="datetime-local">`.
 */
export const toISTDateTimeInput = (dateStr) => {
  if (!dateStr) return '';
  
  let d;
  if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+') && dateStr.includes('T')) {
    d = new Date(dateStr + 'Z');
  } else {
    d = new Date(dateStr);
  }

  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(d);
  const partMap = {};
  parts.forEach((p) => {
    partMap[p.type] = p.value;
  });

  return `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}`;
};

/**
 * Calculates current contest status dynamically based on current time.
 * Returns: 'Upcoming' | 'Active' | 'Past'
 */
export const calculateContestStatus = (startStr, endStr) => {
  if (!startStr || !endStr) return 'Upcoming';
  
  const start = new Date(startStr.includes('Z') || startStr.includes('+') ? startStr : startStr + 'Z').getTime();
  const end = new Date(endStr.includes('Z') || endStr.includes('+') ? endStr : endStr + 'Z').getTime();
  const now = Date.now();

  if (isNaN(start) || isNaN(end)) return 'Upcoming';

  if (now < start) return 'Upcoming';
  if (now >= start && now <= end) return 'Active';
  return 'Past';
};
