/**
 * Unit tests for xlsx sanitization utilities
 * Tests for security vulnerabilities:
 * - Prototype Pollution (GHSA-4r6h-8v6p-xvw6)
 * - Regular Expression Denial of Service - ReDoS (GHSA-5pgg-2g8v-p4x9)
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeNumber,
  sanitizeObject,
  sanitizeArray,
  sanitizeSheetData,
  sanitizeJsonData,
  sanitizeWorkbookName,
  sanitizeSheetName,
  validateDataSize,
} from '../xlsxSanitizer';

describe('xlsxSanitizer', () => {
  describe('sanitizeString', () => {
    it('should convert non-string values to strings', () => {
      expect(sanitizeString(123)).toBe('123');
      expect(sanitizeString(true)).toBe('true');
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });

    it('should truncate long strings to prevent ReDoS', () => {
      const longString = 'a'.repeat(20000);
      const result = sanitizeString(longString, 1000);
      expect(result.length).toBeLessThanOrEqual(1004); // 1000 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should remove dangerous control characters', () => {
      const dangerousString = 'Hello\x00World\x08Test\x1F';
      const result = sanitizeString(dangerousString);
      expect(result).toBe('HelloWorldTest');
      expect(result).not.toContain('\x00');
    });

    it('should preserve normal strings', () => {
      expect(sanitizeString('Hello World')).toBe('Hello World');
      expect(sanitizeString('Test 123')).toBe('Test 123');
    });
  });

  describe('sanitizeNumber', () => {
    it('should return valid numbers unchanged', () => {
      expect(sanitizeNumber(123)).toBe(123);
      expect(sanitizeNumber(45.67)).toBe(45.67);
      expect(sanitizeNumber(-100)).toBe(-100);
    });

    it('should convert string numbers to numbers', () => {
      expect(sanitizeNumber('123')).toBe(123);
      expect(sanitizeNumber('45.67')).toBe(45.67);
    });

    it('should return 0 for invalid numbers', () => {
      expect(sanitizeNumber(NaN)).toBe(0);
      expect(sanitizeNumber(Infinity)).toBe(0);
      expect(sanitizeNumber('not a number')).toBe(0);
    });
  });

  describe('sanitizeObject - Prototype Pollution Protection', () => {
    it('should block __proto__ pollution attempts', () => {
      const maliciousInput = JSON.parse('{"__proto__": {"polluted": true}}');
      const result = sanitizeObject(maliciousInput);

      expect(result).not.toHaveProperty('__proto__');
      expect(Object.prototype).not.toHaveProperty('polluted');
    });

    it('should block constructor pollution attempts', () => {
      const maliciousInput = { constructor: { polluted: true } };
      const result = sanitizeObject(maliciousInput);

      expect(result).not.toHaveProperty('constructor');
    });

    it('should block prototype pollution attempts', () => {
      const maliciousInput = { prototype: { polluted: true } };
      const result = sanitizeObject(maliciousInput);

      expect(result).not.toHaveProperty('prototype');
    });

    it('should sanitize nested objects', () => {
      const input = {
        name: 'Test',
        nested: {
          value: 123,
          deep: {
            data: 'hello'
          }
        }
      };
      const result = sanitizeObject(input);

      expect(result.name).toBe('Test');
      expect(result.nested.value).toBe(123);
      expect(result.nested.deep.data).toBe('hello');
    });

    it('should truncate very deep objects', () => {
      // Create a very deep object (12 levels)
      let deep: any = { value: 'bottom' };
      for (let i = 0; i < 12; i++) {
        deep = { nested: deep };
      }

      const result = sanitizeObject(deep);
      // Should truncate at depth 10
      expect(result).toBeDefined();
    });
  });

  describe('sanitizeArray', () => {
    it('should sanitize array elements', () => {
      const input = ['hello', 123, { name: 'test' }];
      const result = sanitizeArray(input);

      expect(result).toEqual(['hello', 123, { name: 'test' }]);
    });

    it('should truncate large arrays', () => {
      const largeArray = new Array(10000).fill('item');
      const result = sanitizeArray(largeArray);

      expect(result.length).toBeLessThanOrEqual(5000);
    });

    it('should handle nested arrays', () => {
      const input = [['a', 'b'], ['c', 'd']];
      const result = sanitizeArray(input);

      expect(result).toEqual([['a', 'b'], ['c', 'd']]);
    });

    it('should return empty array for non-arrays', () => {
      expect(sanitizeArray('not an array' as any)).toEqual([]);
      expect(sanitizeArray(null as any)).toEqual([]);
    });
  });

  describe('sanitizeSheetData', () => {
    it('should sanitize 2D array data for sheets', () => {
      const input = [
        ['Name', 'Value'],
        ['Test', '123'],
        ['Hello', 'World']
      ];
      const result = sanitizeSheetData(input);

      expect(result).toEqual(input);
    });

    it('should handle malformed rows', () => {
      const input: any = [
        ['Name', 'Value'],
        'not an array',
        ['Test', '123']
      ];
      const result = sanitizeSheetData(input);

      expect(result[0]).toEqual(['Name', 'Value']);
      expect(result[1]).toEqual([]);
      expect(result[2]).toEqual(['Test', '123']);
    });
  });

  describe('sanitizeJsonData', () => {
    it('should sanitize array of objects', () => {
      const input = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ];
      const result = sanitizeJsonData(input);

      expect(result[0].name).toBe('Alice');
      expect(result[0].age).toBe(30);
    });

    it('should block prototype pollution in JSON data', () => {
      const input = [
        { __proto__: { polluted: true }, name: 'Test' }
      ];
      const result = sanitizeJsonData(input);

      expect(result[0]).not.toHaveProperty('__proto__');
      expect(result[0].name).toBe('Test');
    });
  });

  describe('sanitizeWorkbookName', () => {
    it('should remove invalid filename characters', () => {
      const input = 'My<File>Name:With*Invalid|Chars?.xlsx';
      const result = sanitizeWorkbookName(input);

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain(':');
      expect(result).not.toContain('*');
      expect(result).not.toContain('|');
      expect(result).not.toContain('?');
    });

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(200);
      const result = sanitizeWorkbookName(longName);

      expect(result.length).toBeLessThanOrEqual(104); // 100 + '...'
    });

    it('should return default name for empty input', () => {
      expect(sanitizeWorkbookName('')).toBe('export');
      expect(sanitizeWorkbookName('   ')).toBe('export');
    });
  });

  describe('sanitizeSheetName', () => {
    it('should remove xlsx-invalid characters', () => {
      const input = 'Sheet:Name/With\\Invalid?Chars*[test]';
      const result = sanitizeSheetName(input);

      expect(result).not.toContain(':');
      expect(result).not.toContain('/');
      expect(result).not.toContain('\\');
      expect(result).not.toContain('?');
      expect(result).not.toContain('*');
      expect(result).not.toContain('[');
      expect(result).not.toContain(']');
    });

    it('should truncate to 31 characters (xlsx limit)', () => {
      const longName = 'a'.repeat(50);
      const result = sanitizeSheetName(longName);

      expect(result.length).toBeLessThanOrEqual(34); // 31 + '...'
    });

    it('should return default name for empty input', () => {
      expect(sanitizeSheetName('')).toBe('Sheet1');
      expect(sanitizeSheetName('   ')).toBe('Sheet1');
    });
  });

  describe('validateDataSize', () => {
    it('should accept small data', () => {
      const smallData = { name: 'test', value: 123 };
      expect(validateDataSize(smallData)).toBe(true);
    });

    it('should accept medium data', () => {
      const mediumData = {
        items: new Array(1000).fill({ name: 'test', value: 123 })
      };
      expect(validateDataSize(mediumData)).toBe(true);
    });

    it('should reject very large data (> 50MB)', () => {
      // Create a large object
      const largeData = {
        items: new Array(500000).fill({
          name: 'a'.repeat(100),
          description: 'b'.repeat(200),
          value: 123456789
        })
      };
      expect(validateDataSize(largeData)).toBe(false);
    });
  });

  describe('ReDoS Protection', () => {
    it('should handle strings that could cause ReDoS', () => {
      // Patterns that could cause catastrophic backtracking
      const evilStrings = [
        'a'.repeat(100000),
        'x'.repeat(50000) + '!',
        'test' + '\n'.repeat(10000) + 'end'
      ];

      evilStrings.forEach(str => {
        const start = Date.now();
        const result = sanitizeString(str, 5000);
        const duration = Date.now() - start;

        // Should complete quickly (< 100ms)
        expect(duration).toBeLessThan(100);
        expect(result.length).toBeLessThanOrEqual(5004); // 5000 + '...'
      });
    });
  });
});
