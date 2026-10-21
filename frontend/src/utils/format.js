// src/utils/format.js

/**
 * Format a number into currency representation.
 * Supports INR, USD, EUR, GBP, etc.
 */
export function formatCurrency(amount, currency = 'INR') {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'N/A';
  }

  const curr = (currency || 'INR').toUpperCase();

  try {
    const symbols = {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };

    const symbol = symbols[curr] || curr + ' ';
    const formattedNum = Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    });

    return `${symbol}${formattedNum}`;
  } catch {
    return `${currency} ${amount}`;
  }
}

/**
 * Format ISO datetime string to readable human format.
 */
export function formatDate(dateStr, includeTime = true) {
  if (!dateStr) return 'Never';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime
        ? {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          }
        : {}),
    };

    return new Intl.DateTimeFormat('en-IN', options).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Relative time helper (e.g., "5 mins ago", "Just now")
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Never';

  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatDate(dateStr, false);
  } catch {
    return dateStr;
  }
}

/**
 * Format percentage change with +/- sign.
 */
export function formatPercentage(val) {
  if (val === null || val === undefined || isNaN(val)) return '0.0%';
  const num = Number(val);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

/**
 * Capitalize string helper
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}
