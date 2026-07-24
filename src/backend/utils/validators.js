// ==========================================
// © bighosting by bigmanjtech™
// Validators – Input Validation
// ==========================================

import { isValidEmail, isStrongPassword, sanitizeInput } from './helpers.js';

// ==========================================
// Validate User Registration
// ==========================================

export function validateRegistration(data) {
  const errors = [];

  const name = sanitizeInput(data.name || '');
  const email = sanitizeInput(data.email || '');
  const password = data.password || '';

  if (!name || name.length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (!email || !isValidEmail(email)) {
    errors.push('Valid email address is required');
  }

  if (!password || !isStrongPassword(password)) {
    errors.push('Password must be at least 6 characters with letters and numbers');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: { name, email, password },
  };
}

// ==========================================
// Validate User Login
// ==========================================

export function validateLogin(data) {
  const errors = [];

  const email = sanitizeInput(data.email || '');
  const password = data.password || '';

  if (!email || !isValidEmail(email)) {
    errors.push('Valid email address is required');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: { email, password },
  };
}

// ==========================================
// Validate Plan Creation
// ==========================================

export function validatePlan(data) {
  const errors = [];

  const name = sanitizeInput(data.name || '');
  const priceMonthly = parseFloat(data.priceMonthly);
  const priceYearly = parseFloat(data.priceYearly);
  const ramLimit = parseFloat(data.ramLimit);
  const diskLimit = parseFloat(data.diskLimit);
  const cpuLimit = parseFloat(data.cpuLimit);
  const botSizeLimit = parseFloat(data.botSizeLimit);

  if (!name || name.length < 2) {
    errors.push('Plan name must be at least 2 characters');
  }

  if (isNaN(priceMonthly) || priceMonthly < 0) {
    errors.push('Valid monthly price is required');
  }

  if (isNaN(ramLimit) || ramLimit < 0) {
    errors.push('Valid RAM limit is required');
  }

  if (isNaN(diskLimit) || diskLimit < 0) {
    errors.push('Valid disk limit is required');
  }

  if (isNaN(cpuLimit) || cpuLimit < 0) {
    errors.push('Valid CPU limit is required');
  }

  if (isNaN(botSizeLimit) || botSizeLimit < 0) {
    errors.push('Valid bot size limit is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      name,
      description: sanitizeInput(data.description || ''),
      priceMonthly: isNaN(priceMonthly) ? 0 : priceMonthly,
      priceYearly: isNaN(priceYearly) ? priceMonthly * 10 : priceYearly,
      ramLimit: isNaN(ramLimit) ? 512 : ramLimit,
      diskLimit: isNaN(diskLimit) ? 1024 : diskLimit,
      cpuLimit: isNaN(cpuLimit) ? 100 : cpuLimit,
      botSizeLimit: isNaN(botSizeLimit) ? 1 : botSizeLimit,
    },
  };
}

// ==========================================
// Validate Server Action
// ==========================================

export function validateServerAction(action) {
  const validActions = ['start', 'stop', 'restart', 'kill', 'reinstall'];
  return validActions.includes(action);
}

// ==========================================
// Validate File Path
// ==========================================

export function validateFilePath(filePath) {
  // Prevent directory traversal attacks
  if (!filePath) return false;
  if (filePath.includes('..')) return false;
  if (filePath.includes('//')) return false;
  return true;
}

// ==========================================
// Validate Command
// ==========================================

export function validateCommand(command) {
  if (!command || typeof command !== 'string') return false;
  if (command.length > 1000) return false;
  // Block dangerous commands
  const dangerous = ['rm -rf', 'sudo', 'chmod', 'chown', 'dd', 'mkfs'];
  for (const bad of dangerous) {
    if (command.toLowerCase().includes(bad)) return false;
  }
  return true;
}

// ==========================================
// Validate Coupon
// ==========================================

export function validateCoupon(data) {
  const errors = [];

  const code = sanitizeInput(data.code || '');
  const discountValue = parseFloat(data.discountValue);
  const validFrom = data.validFrom;
  const validUntil = data.validUntil;

  if (!code || code.length < 2) {
    errors.push('Coupon code is required');
  }

  if (isNaN(discountValue) || discountValue <= 0) {
    errors.push('Valid discount value is required');
  }

  if (!validFrom || isNaN(new Date(validFrom))) {
    errors.push('Valid start date is required');
  }

  if (!validUntil || isNaN(new Date(validUntil))) {
    errors.push('Valid end date is required');
  }

  if (validFrom && validUntil && new Date(validFrom) >= new Date(validUntil)) {
    errors.push('End date must be after start date');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: { code, discountValue, validFrom, validUntil },
  };
}

export default {
  validateRegistration,
  validateLogin,
  validatePlan,
  validateServerAction,
  validateFilePath,
  validateCommand,
  validateCoupon,
};