import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  sanitizeTextInput,
  sanitizeNumericInput,
  sanitizeFilename,
  sanitizeEmail,
  escapeHtml,
  isAlphanumericSafe,
  RateLimiter
} from '../security'

describe('Security Utilities', () => {
  describe('sanitizeTextInput', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello World<div>test</div>'
      const result = sanitizeTextInput(input)
      
      expect(result).toBe('Hello Worldtest')
    })

    it('should remove script content', () => {
      const input = 'Before<script>malicious code</script>After'
      const result = sanitizeTextInput(input)
      
      expect(result).toBe('BeforeAfter')
    })

    it('should remove event handlers', () => {
      const input = 'Click <button onclick="alert(\'xss\')">here</button>'
      const result = sanitizeTextInput(input)
      
      expect(result).toBe('Click here')
    })

    it('should remove javascript protocols', () => {
      const input = 'javascript:alert("xss") and JAVASCRIPT:void(0)'
      const result = sanitizeTextInput(input)
      
      expect(result).toBe('alert("xss") and void(0)')
    })

    it('should remove data protocols', () => {
      const input = 'data:text/html,<script>alert(1)</script>'
      const result = sanitizeTextInput(input)
      
      expect(result).toBe('text/html,alert(1)')
    })

    it('should remove null bytes', () => {
      const input = 'Hello\x00World'
      const result = sanitizeTextInput(input)
      
      expect(result).toBe('HelloWorld')
    })

    it('should trim whitespace', () => {
      const input = '  Hello World  '
      const result = sanitizeTextInput(input)
      
      expect(result).toBe('Hello World')
    })

    it('should handle non-string input', () => {
      expect(sanitizeTextInput(null as any)).toBe('')
      expect(sanitizeTextInput(undefined as any)).toBe('')
      expect(sanitizeTextInput(123 as any)).toBe('')
    })

    it('should handle empty string', () => {
      expect(sanitizeTextInput('')).toBe('')
    })
  })

  describe('sanitizeNumericInput', () => {
    it('should parse valid numbers', () => {
      expect(sanitizeNumericInput('123')).toBe(123)
      expect(sanitizeNumericInput('123.45')).toBe(123.45)
      expect(sanitizeNumericInput(456)).toBe(456)
    })

    it('should handle invalid numbers', () => {
      expect(sanitizeNumericInput('abc')).toBe(0)
      expect(sanitizeNumericInput('123abc')).toBe(0)
      expect(sanitizeNumericInput('')).toBe(0)
    })

    it('should clamp values to bounds', () => {
      expect(sanitizeNumericInput(150, 0, 100)).toBe(100)
      expect(sanitizeNumericInput(-50, 0, 100)).toBe(0)
      expect(sanitizeNumericInput(50, 0, 100)).toBe(50)
    })

    it('should handle special numeric values', () => {
      expect(sanitizeNumericInput(Infinity)).toBe(0)
      expect(sanitizeNumericInput(-Infinity)).toBe(0)
      expect(sanitizeNumericInput(NaN)).toBe(0)
    })

    it('should use default bounds', () => {
      expect(sanitizeNumericInput(-10)).toBe(0)
      expect(sanitizeNumericInput(Number.MAX_SAFE_INTEGER + 1)).toBe(Number.MAX_SAFE_INTEGER)
    })
  })

  describe('sanitizeFilename', () => {
    it('should remove directory traversal attempts', () => {
      const input = '../../../etc/passwd'
      const result = sanitizeFilename(input)
      
      expect(result).toBe('etcpasswd')
    })

    it('should remove path separators', () => {
      const input = 'folder/file\\name'
      const result = sanitizeFilename(input)
      
      expect(result).toBe('folderfilename')
    })

    it('should remove null bytes', () => {
      const input = 'file\x00name'
      const result = sanitizeFilename(input)
      
      expect(result).toBe('filename')
    })

    it('should remove control characters', () => {
      const input = 'file\x01\x1fname'
      const result = sanitizeFilename(input)
      
      expect(result).toBe('filename')
    })

    it('should remove special characters', () => {
      const input = 'file<>:"|?*name'
      const result = sanitizeFilename(input)
      
      expect(result).toBe('filename')
    })

    it('should limit length', () => {
      const input = 'a'.repeat(300)
      const result = sanitizeFilename(input)
      
      expect(result.length).toBe(255)
    })

    it('should handle empty input', () => {
      expect(sanitizeFilename('')).toBe('untitled')
      expect(sanitizeFilename('   ')).toBe('untitled')
    })

    it('should handle non-string input', () => {
      expect(sanitizeFilename(null as any)).toBe('untitled')
      expect(sanitizeFilename(undefined as any)).toBe('untitled')
    })
  })

  describe('sanitizeEmail', () => {
    it('should validate and sanitize valid emails', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com')
      expect(sanitizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com')
      expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com')
    })

    it('should reject invalid emails', () => {
      expect(sanitizeEmail('invalid-email')).toBe('')
      expect(sanitizeEmail('test@')).toBe('')
      expect(sanitizeEmail('@example.com')).toBe('')
      expect(sanitizeEmail('test@.com')).toBe('')
      expect(sanitizeEmail('')).toBe('')
    })

    it('should handle non-string input', () => {
      expect(sanitizeEmail(null as any)).toBe('')
      expect(sanitizeEmail(undefined as any)).toBe('')
      expect(sanitizeEmail(123 as any)).toBe('')
    })
  })

  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("xss")</script>'
      const result = escapeHtml(input)
      
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;')
    })

    it('should escape all dangerous characters', () => {
      const input = '&<>"\'/'
      const result = escapeHtml(input)
      
      expect(result).toBe('&amp;&lt;&gt;&quot;&#39;&#x2F;')
    })

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('')
    })

    it('should handle non-string input', () => {
      expect(escapeHtml(null as any)).toBe('')
      expect(escapeHtml(undefined as any)).toBe('')
    })

    it('should not double-escape', () => {
      const input = '&lt;already&gt;'
      const result = escapeHtml(input)
      
      expect(result).toBe('&amp;lt;already&amp;gt;')
    })
  })

  describe('isAlphanumericSafe', () => {
    it('should validate safe alphanumeric strings', () => {
      expect(isAlphanumericSafe('abc123')).toBe(true)
      expect(isAlphanumericSafe('Test Project')).toBe(true)
      expect(isAlphanumericSafe('project-name_v2')).toBe(true)
    })

    it('should reject unsafe characters', () => {
      expect(isAlphanumericSafe('<script>')).toBe(false)
      expect(isAlphanumericSafe('test@example.com')).toBe(false)
      expect(isAlphanumericSafe('path/to/file')).toBe(false)
    })

    it('should respect custom allowed characters', () => {
      expect(isAlphanumericSafe('test@example.com', '@.')).toBe(true)
      expect(isAlphanumericSafe('path/to/file', '/')).toBe(true)
    })

    it('should handle empty string', () => {
      expect(isAlphanumericSafe('')).toBe(false)
    })

    it('should handle non-string input', () => {
      expect(isAlphanumericSafe(null as any)).toBe(false)
      expect(isAlphanumericSafe(undefined as any)).toBe(false)
    })
  })

  describe('RateLimiter', () => {
    let rateLimiter: RateLimiter

    beforeEach(() => {
      rateLimiter = new RateLimiter(3, 1000) // 3 attempts per second
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should allow requests under the limit', () => {
      expect(rateLimiter.isAllowed('user1')).toBe(true)
      expect(rateLimiter.isAllowed('user1')).toBe(true)
      expect(rateLimiter.isAllowed('user1')).toBe(true)
    })

    it('should block requests over the limit', () => {
      // Use up the limit
      rateLimiter.isAllowed('user1')
      rateLimiter.isAllowed('user1')
      rateLimiter.isAllowed('user1')
      
      // Next request should be blocked
      expect(rateLimiter.isAllowed('user1')).toBe(false)
    })

    it('should reset after time window', () => {
      // Use up the limit
      rateLimiter.isAllowed('user1')
      rateLimiter.isAllowed('user1')
      rateLimiter.isAllowed('user1')
      
      expect(rateLimiter.isAllowed('user1')).toBe(false)
      
      // Advance time past window
      vi.advanceTimersByTime(1001)
      
      expect(rateLimiter.isAllowed('user1')).toBe(true)
    })

    it('should track different identifiers separately', () => {
      // Use up limit for user1
      rateLimiter.isAllowed('user1')
      rateLimiter.isAllowed('user1')
      rateLimiter.isAllowed('user1')
      
      expect(rateLimiter.isAllowed('user1')).toBe(false)
      expect(rateLimiter.isAllowed('user2')).toBe(true) // user2 should still be allowed
    })

    it('should reset specific identifier', () => {
      // Use up the limit
      rateLimiter.isAllowed('user1')
      rateLimiter.isAllowed('user1')
      rateLimiter.isAllowed('user1')
      
      expect(rateLimiter.isAllowed('user1')).toBe(false)
      
      rateLimiter.reset('user1')
      
      expect(rateLimiter.isAllowed('user1')).toBe(true)
    })

    it('should use default configuration', () => {
      const defaultLimiter = new RateLimiter()
      
      // Should allow 5 attempts by default
      for (let i = 0; i < 5; i++) {
        expect(defaultLimiter.isAllowed('test')).toBe(true)
      }
      
      expect(defaultLimiter.isAllowed('test')).toBe(false)
    })
  })
})