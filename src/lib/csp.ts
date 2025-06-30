/**
 * Content Security Policy configuration for XSS protection
 */

export interface CSPConfig {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'connect-src': string[];
  'font-src': string[];
  'object-src': string[];
  'media-src': string[];
  'frame-src': string[];
  'worker-src': string[];
  'base-uri': string[];
  'form-action': string[];
}

/**
 * Default CSP configuration for Fortress Modeler
 */
export const DEFAULT_CSP_CONFIG: CSPConfig = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Vite dev mode and some React components
    "'unsafe-eval'", // Required for Vite dev mode
    "https://www.google.com",
    "https://apis.google.com",
    "https://www.gstatic.com"
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled-components and CSS-in-JS
    "https://fonts.googleapis.com"
  ],
  'img-src': [
    "'self'",
    "data:", // For inline images and data URLs
    "blob:", // For generated images
    "https://www.google.com",
    "https://lh3.googleusercontent.com" // Google profile images
  ],
  'connect-src': [
    "'self'",
    "https://api.fortress-modeler.com", // Replace with your actual API domain
    "https://www.googleapis.com",
    "https://oauth2.googleapis.com",
    "https://accounts.google.com"
  ],
  'font-src': [
    "'self'",
    "https://fonts.gstatic.com",
    "data:" // For inline fonts
  ],
  'object-src': ["'none'"], // Disable plugins
  'media-src': ["'self'"],
  'frame-src': [
    "'self'",
    "https://accounts.google.com" // For Google OAuth
  ],
  'worker-src': ["'self'", "blob:"], // For web workers
  'base-uri': ["'self'"], // Prevent base tag injection
  'form-action': ["'self'"] // Restrict form submissions
};

/**
 * Production CSP configuration (more restrictive)
 */
export const PRODUCTION_CSP_CONFIG: CSPConfig = {
  ...DEFAULT_CSP_CONFIG,
  'script-src': [
    "'self'",
    // Remove unsafe-inline and unsafe-eval for production
    "https://www.google.com",
    "https://apis.google.com",
    "https://www.gstatic.com"
  ]
};

/**
 * Generate CSP header string from configuration
 */
export function generateCSPHeader(config: CSPConfig): string {
  return Object.entries(config)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Get CSP configuration based on environment
 */
export function getCSPConfig(): CSPConfig {
  return process.env.NODE_ENV === 'production' 
    ? PRODUCTION_CSP_CONFIG 
    : DEFAULT_CSP_CONFIG;
}

/**
 * Security headers configuration
 */
export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'X-XSS-Protection': string;
  'Strict-Transport-Security'?: string;
}

/**
 * Generate all security headers
 */
export function getSecurityHeaders(): SecurityHeaders {
  const headers: SecurityHeaders = {
    'Content-Security-Policy': generateCSPHeader(getCSPConfig()),
    'X-Frame-Options': 'DENY', // Prevent clickjacking
    'X-Content-Type-Options': 'nosniff', // Prevent MIME sniffing
    'Referrer-Policy': 'strict-origin-when-cross-origin', // Control referrer information
    'Permissions-Policy': [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()'
    ].join(', '), // Disable unnecessary browser features
    'X-XSS-Protection': '1; mode=block' // Legacy XSS protection
  };

  // Add HSTS header for HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  return headers;
}

/**
 * Middleware function for Express.js to set security headers
 */
export function securityHeadersMiddleware() {
  return (req: any, res: any, next: any) => {
    const headers = getSecurityHeaders();
    
    Object.entries(headers).forEach(([name, value]) => {
      if (value) {
        res.setHeader(name, value);
      }
    });
    
    next();
  };
}