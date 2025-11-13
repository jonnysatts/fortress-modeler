/**
 * xlsx Sanitization Utilities
 *
 * Addresses security vulnerabilities:
 * - Prototype Pollution (GHSA-4r6h-8v6p-xvw6)
 * - Regular Expression Denial of Service - ReDoS (GHSA-5pgg-2g8v-p4x9)
 *
 * This module provides sanitization wrappers around xlsx operations
 * to prevent malicious input from exploiting known vulnerabilities.
 */

// Maximum safe string length to prevent ReDoS attacks
const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 5000;
const MAX_OBJECT_DEPTH = 10;

/**
 * Sanitize a string value to prevent ReDoS and injection attacks
 */
export function sanitizeString(value: any, maxLength: number = MAX_STRING_LENGTH): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Convert to string safely
  let str = String(value);

  // Truncate to prevent ReDoS
  if (str.length > maxLength) {
    console.warn(`String truncated from ${str.length} to ${maxLength} characters for security`);
    str = str.substring(0, maxLength) + '...';
  }

  // Remove potentially dangerous characters that could exploit xlsx parsing
  // Keep only printable ASCII, common Unicode, and basic formatting
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return str;
}

/**
 * Sanitize a number value
 */
export function sanitizeNumber(value: any): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }

  const parsed = parseFloat(String(value));
  if (!isNaN(parsed) && isFinite(parsed)) {
    return parsed;
  }

  return 0;
}

/**
 * Sanitize an object to prevent prototype pollution
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  depth: number = 0
): T {
  if (depth > MAX_OBJECT_DEPTH) {
    console.warn('Maximum object depth exceeded, truncating');
    return {} as T;
  }

  if (obj === null || obj === undefined) {
    return {} as T;
  }

  if (typeof obj !== 'object' || obj instanceof Date || obj instanceof RegExp) {
    return obj;
  }

  // Create a clean object without prototype pollution risks
  const sanitized = Object.create(null) as T;

  for (const key in obj) {
    // Skip prototype pollution attempts
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      console.warn(`Blocked prototype pollution attempt via key: ${key}`);
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      if (Array.isArray(value)) {
        sanitized[key] = sanitizeArray(value, depth + 1) as any;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value, depth + 1) as any;
      } else if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value) as any;
      } else if (typeof value === 'number') {
        sanitized[key] = sanitizeNumber(value) as any;
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Sanitize an array
 */
export function sanitizeArray<T>(arr: T[], depth: number = 0): T[] {
  if (!Array.isArray(arr)) {
    return [];
  }

  if (arr.length > MAX_ARRAY_LENGTH) {
    console.warn(`Array truncated from ${arr.length} to ${MAX_ARRAY_LENGTH} items for security`);
    arr = arr.slice(0, MAX_ARRAY_LENGTH);
  }

  return arr.map(item => {
    if (Array.isArray(item)) {
      return sanitizeArray(item, depth + 1) as any;
    } else if (typeof item === 'object' && item !== null) {
      return sanitizeObject(item, depth + 1) as any;
    } else if (typeof item === 'string') {
      return sanitizeString(item) as any;
    } else if (typeof item === 'number') {
      return sanitizeNumber(item) as any;
    }
    return item;
  });
}

/**
 * Sanitize sheet data before passing to xlsx
 * This is the main function to use before any xlsx operations
 */
export function sanitizeSheetData(data: any[][]): any[][] {
  if (!Array.isArray(data)) {
    console.warn('Sheet data is not an array, returning empty array');
    return [];
  }

  return sanitizeArray(data.map(row => {
    if (!Array.isArray(row)) {
      return [];
    }
    return sanitizeArray(row);
  }));
}

/**
 * Sanitize JSON data before converting to sheet
 */
export function sanitizeJsonData<T extends Record<string, any>>(data: T[]): T[] {
  if (!Array.isArray(data)) {
    console.warn('JSON data is not an array, returning empty array');
    return [];
  }

  return sanitizeArray(data.map(item => sanitizeObject(item)));
}

/**
 * Sanitize workbook name
 */
export function sanitizeWorkbookName(name: string): string {
  // Remove invalid filename characters
  const sanitized = sanitizeString(name, 100)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .trim();

  if (!sanitized) {
    return 'export';
  }

  return sanitized;
}

/**
 * Sanitize sheet name (xlsx has specific restrictions)
 */
export function sanitizeSheetName(name: string): string {
  // xlsx sheet names have max length of 31 and cannot contain: : \ / ? * [ ]
  const sanitized = sanitizeString(name, 31)
    .replace(/[:\\\/\?\*\[\]]/g, '_')
    .trim();

  if (!sanitized) {
    return 'Sheet1';
  }

  return sanitized;
}

/**
 * Create a safe configuration object for xlsx operations
 * This prevents any malicious configuration from being passed
 */
export function createSafeXlsxConfig(config: any = {}): Record<string, any> {
  const safeConfig: Record<string, any> = {};

  // Only allow known safe configuration options
  const allowedKeys = [
    'bookType',
    'type',
    'compression',
    'cellDates',
    'sheetStubs',
    'bookSST',
    'cellStyles'
  ];

  for (const key of allowedKeys) {
    if (key in config) {
      safeConfig[key] = config[key];
    }
  }

  return safeConfig;
}

/**
 * Validate that data size is within safe limits
 */
export function validateDataSize(data: any): boolean {
  try {
    const jsonStr = JSON.stringify(data);
    const sizeInBytes = new Blob([jsonStr]).size;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB > 50) {
      console.error(`Data size (${sizeInMB.toFixed(2)}MB) exceeds 50MB limit`);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Failed to validate data size:', e);
    return false;
  }
}

/**
 * Comprehensive sanitization for export data
 */
export function sanitizeExportData(data: {
  project: any;
  models?: any[];
  [key: string]: any;
}): any {
  if (!validateDataSize(data)) {
    throw new Error('Export data exceeds safe size limits');
  }

  const sanitized = sanitizeObject(data);

  console.log('✅ Export data sanitized successfully');
  return sanitized;
}
