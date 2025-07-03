/**
 * Security utilities for input sanitization and XSS prevention
 */

/**
 * Sanitizes text input by removing potentially dangerous HTML tags and characters
 * @param input - The input string to sanitize
 * @returns Sanitized string safe for storage and display
 */
export function sanitizeTextInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove on* event handlers
    .replace(/on\w+="[^"]*"/gi, '')
    // Remove javascript: protocols
    .replace(/javascript:/gi, '')
    // Remove data: protocols (potential for XSS)
    .replace(/data:/gi, '')
    // Remove null bytes
    .replace(/\x00/g, '')
    // Trim whitespace
    .trim();
}

/**
 * Sanitizes numeric input ensuring it's a valid number within reasonable bounds
 * @param input - The input value to sanitize
 * @param min - Minimum allowed value (default: 0)
 * @param max - Maximum allowed value (default: Number.MAX_SAFE_INTEGER)
 * @returns Sanitized number or 0 if invalid
 */
export function sanitizeNumericInput(
  input: string | number, 
  min: number = 0, 
  max: number = Number.MAX_SAFE_INTEGER
): number {
  // If input is already a number, use it directly
  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) return 0;
    return Math.max(min, Math.min(max, input));
  }
  
  // For strings, remove spaces (thousand separators) before parsing
  const cleanedInput = input.replace(/\s+/g, '');
  const num = parseFloat(cleanedInput);
  
  // Check if number is valid
  if (isNaN(num) || !isFinite(num)) return 0;
  
  // Clamp to bounds
  return Math.max(min, Math.min(max, num));
}

/**
 * Sanitizes file names to prevent directory traversal and injection attacks
 * @param filename - The filename to sanitize
 * @returns Safe filename
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') return 'untitled';
  
  return filename
    // Remove directory traversal attempts
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    // Remove null bytes
    .replace(/\x00/g, '')
    // Remove control characters
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    // Remove special characters that could cause issues
    .replace(/[<>:"|?*]/g, '')
    // Limit length
    .substring(0, 255)
    .trim() || 'untitled';
}

/**
 * Validates and sanitizes email addresses
 * @param email - Email address to validate
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.toLowerCase().trim();
  
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Prevents XSS by encoding HTML entities
 * @param text - Text to encode
 * @returns HTML-safe text
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') return '';
  
  const entityMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'\/]/g, (s) => entityMap[s]);
}

/**
 * Validates that a string contains only alphanumeric characters and allowed special chars
 * @param input - Input to validate
 * @param allowedChars - Additional allowed characters (default: space, dash, underscore)
 * @returns true if valid, false otherwise
 */
export function isAlphanumericSafe(input: string, allowedChars: string = ' -_'): boolean {
  if (typeof input !== 'string') return false;
  
  const pattern = new RegExp(`^[a-zA-Z0-9${allowedChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]+$`);
  return pattern.test(input);
}

/**
 * Rate limiting helper to prevent abuse
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);
    
    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Reset if window has passed
    if (now - record.lastAttempt > this.windowMs) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Check if under limit
    if (record.count < this.maxAttempts) {
      record.count++;
      record.lastAttempt = now;
      return true;
    }
    
    return false;
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}