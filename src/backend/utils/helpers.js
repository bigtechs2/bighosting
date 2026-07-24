// ==========================================
// © bighosting by bigmanjtech™
// Helper Functions – Reusable Utilities
// ==========================================

// ==========================================
// Generate Unique Order Number
// ==========================================

export function generateOrderNumber() {
  const prefix = 'BH';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ==========================================
// Generate Unique Invoice Number
// ==========================================

export function generateInvoiceNumber() {
  const prefix = 'INV';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ==========================================
// Generate Unique Ticket Number
// ==========================================

export function generateTicketNumber() {
  const prefix = 'TKT';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ==========================================
// Format Currency
// ==========================================

export function formatCurrency(amount, currency = 'TSh') {
  if (currency === 'TSh') {
    return `${amount.toLocaleString()} TSh`;
  }
  return `$${amount.toFixed(2)}`;
}

// ==========================================
// Format Date
// ==========================================

export function formatDate(date, format = 'short') {
  const d = new Date(date);
  if (format === 'short') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toISOString();
}

// ==========================================
// Calculate Expiry Date
// ==========================================

export function calculateExpiry(interval, startDate = new Date()) {
  const date = new Date(startDate);
  if (interval === 'month') {
    date.setMonth(date.getMonth() + 1);
  } else if (interval === 'year') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setDate(date.getDate() + 30);
  }
  return date;
}

// ==========================================
// Check if Token is Expired
// ==========================================

export function isTokenExpired(expiresAt) {
  return new Date(expiresAt) < new Date();
}

// ==========================================
// Pagination Helper
// ==========================================

export function paginate(items, page = 1, limit = 20) {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: items.length,
      pages: Math.ceil(items.length / limit),
      hasNext: endIndex < items.length,
      hasPrev: page > 1,
    },
  };
}

// ==========================================
// Sanitize Input
// ==========================================

export function sanitizeInput(input) {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  return input;
}

// ==========================================
// Validate Email
// ==========================================

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ==========================================
// Validate Password Strength
// ==========================================

export function isStrongPassword(password) {
  if (password.length < 6) return false;
  // At least one number and one letter
  if (!/\d/.test(password)) return false;
  if (!/[a-zA-Z]/.test(password)) return false;
  return true;
}

// ==========================================
// Mask Sensitive Data
// ==========================================

export function maskEmail(email) {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}

export function maskPhone(phone) {
  if (!phone) return '';
  if (phone.length <= 4) return '***';
  return `${phone.slice(0, 4)}${'*'.repeat(phone.length - 4)}`;
}

// ==========================================
// Convert TSh to USD
// ==========================================

export function tshToUsd(amountTSh, rate = 2500) {
  return parseFloat((amountTSh / rate).toFixed(2));
}

export function usdToTsh(amountUsd, rate = 2500) {
  return Math.round(amountUsd * rate);
}

// ==========================================
// Sleep/Delay (for rate limiting)
// ==========================================

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==========================================
// Retry Function
// ==========================================

export async function retry(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await sleep(delay);
    return retry(fn, retries - 1, delay * 2);
  }
}

export default {
  generateOrderNumber,
  generateInvoiceNumber,
  generateTicketNumber,
  formatCurrency,
  formatDate,
  calculateExpiry,
  isTokenExpired,
  paginate,
  sanitizeInput,
  isValidEmail,
  isStrongPassword,
  maskEmail,
  maskPhone,
  tshToUsd,
  usdToTsh,
  sleep,
  retry,
};