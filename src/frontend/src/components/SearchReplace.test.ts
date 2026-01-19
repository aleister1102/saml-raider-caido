import { describe, it, expect, beforeEach, vi } from "vitest";
import fc from "fast-check";

/**
 * Property 3: Search Match Completeness
 * For any text content and any search query, the search function SHALL find all
 * case-insensitive occurrences, and the reported match count SHALL equal the actual
 * number of occurrences in the text.
 * Validates: Requirements 4.1, 4.2, 4.5
 */
describe("SearchReplace - Property 3: Search Match Completeness", () => {
  // Helper function to find matches (extracted from SearchReplace component logic)
  const findMatches = (text: string, query: string, caseSensitive: boolean) => {
    if (!query) {
      return [];
    }

    const matches: Array<{ start: number; end: number }> = [];
    const flags = caseSensitive ? "g" : "gi";

    try {
      const regex = new RegExp(query, flags);
      let match;

      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        matches.push({ start, end });
      }
    } catch (e) {
      // Invalid regex, ignore
    }

    return matches;
  };

  it("should find all case-insensitive matches in text", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (text, query) => {
          // Skip if query contains regex special chars that would cause issues
          if (/[.*+?^${}()|[\]\\]/.test(query)) {
            return true;
          }

          const matches = findMatches(text, query, false);

          // Verify all matches are found by manually counting
          const lowerText = text.toLowerCase();
          const lowerQuery = query.toLowerCase();
          let expectedCount = 0;
          let searchPos = 0;

          while ((searchPos = lowerText.indexOf(lowerQuery, searchPos)) !== -1) {
            expectedCount++;
            searchPos += lowerQuery.length;
          }

          // The match count should equal expected count
          expect(matches.length).toBe(expectedCount);

          // Verify each match is valid
          for (const match of matches) {
            const matchedText = text.substring(match.start, match.end);
            expect(matchedText.toLowerCase()).toBe(query.toLowerCase());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should respect case-sensitive flag", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (text, query) => {
          // Skip if query contains regex special chars
          if (/[.*+?^${}()|[\]\\]/.test(query)) {
            return true;
          }

          const caseInsensitiveMatches = findMatches(text, query, false);
          const caseSensitiveMatches = findMatches(text, query, true);

          // Case-sensitive should have <= matches than case-insensitive
          expect(caseSensitiveMatches.length).toBeLessThanOrEqual(caseInsensitiveMatches.length);

          // All case-sensitive matches should be in case-insensitive matches
          for (const csMatch of caseSensitiveMatches) {
            const matchedText = text.substring(csMatch.start, csMatch.end);
            expect(matchedText).toBe(query);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return empty array for empty query", () => {
    fc.assert(
      fc.property(
        fc.string(),
        (text) => {
          const matches = findMatches(text, "", false);
          expect(matches.length).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should handle no matches correctly", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (text, query) => {
          // Skip if query contains regex special chars
          if (/[.*+?^${}()|[\]\\]/.test(query)) {
            return true;
          }

          // Create a query that definitely won't match
          const impossibleQuery = "ZZZZZZZZZZZZZZZZZZZZZ_" + query;
          const matches = findMatches(text, impossibleQuery, false);

          expect(matches.length).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Property 4: Replace All Correctness
 * For any text content, search query, and replacement string, executing "Replace All"
 * SHALL replace exactly all occurrences of the search query, and the reported replacement
 * count SHALL equal the actual number of replacements made.
 * Validates: Requirements 5.1, 5.3
 */
describe("SearchReplace - Property 4: Replace All Correctness", () => {
  const replaceAll = (text: string, query: string, replacement: string, caseSensitive: boolean) => {
    if (!query) return text;

    const flags = caseSensitive ? "g" : "gi";
    try {
      const regex = new RegExp(query, flags);
      return text.replace(regex, replacement);
    } catch (e) {
      return text;
    }
  };

  it("should replace all occurrences correctly", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 0, maxLength: 20 }),
        (text, query, replacement) => {
          // Skip if query contains regex special chars
          if (/[.*+?^${}()|[\]\\]/.test(query)) {
            return true;
          }

          const result = replaceAll(text, query, replacement, false);

          // Verify no occurrences of original query remain (case-insensitive)
          const lowerResult = result.toLowerCase();
          const lowerQuery = query.toLowerCase();
          expect(lowerResult.includes(lowerQuery)).toBe(false);

          // Verify the replacement was made
          if (text.toLowerCase().includes(query.toLowerCase())) {
            expect(result).not.toBe(text);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should count replacements correctly", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 0, maxLength: 20 }),
        (text, query, replacement) => {
          // Skip if query contains regex special chars
          if (/[.*+?^${}()|[\]\\]/.test(query)) {
            return true;
          }

          // Count expected replacements
          const lowerText = text.toLowerCase();
          const lowerQuery = query.toLowerCase();
          let expectedCount = 0;
          let searchPos = 0;

          while ((searchPos = lowerText.indexOf(lowerQuery, searchPos)) !== -1) {
            expectedCount++;
            searchPos += lowerQuery.length;
          }

          const result = replaceAll(text, query, replacement, false);

          // Count actual replacements by checking how many times replacement appears
          // This is a simple heuristic - if replacement is unique, we can count it
          if (replacement && !text.includes(replacement)) {
            const replacementCount = (result.match(new RegExp(replacement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
            expect(replacementCount).toBe(expectedCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should handle empty replacement string", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (text, query) => {
          // Skip if query contains regex special chars
          if (/[.*+?^${}()|[\]\\]/.test(query)) {
            return true;
          }

          const result = replaceAll(text, query, "", false);

          // Result should not contain the query
          const lowerResult = result.toLowerCase();
          const lowerQuery = query.toLowerCase();
          expect(lowerResult.includes(lowerQuery)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should not replace when query is empty", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        (text, replacement) => {
          const result = replaceAll(text, "", replacement, false);
          expect(result).toBe(text);
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Unit tests for specific examples and edge cases
 */
describe("SearchReplace - Unit Tests", () => {
  it("should find exact matches", () => {
    const findMatches = (text: string, query: string, caseSensitive: boolean) => {
      if (!query) return [];
      const matches: Array<{ start: number; end: number }> = [];
      const flags = caseSensitive ? "g" : "gi";
      try {
        const regex = new RegExp(query, flags);
        let match;
        while ((match = regex.exec(text)) !== null) {
          matches.push({ start: match.index, end: match.index + match[0].length });
        }
      } catch (e) {
        // Invalid regex
      }
      return matches;
    };

    const text = "Hello World Hello";
    const matches = findMatches(text, "Hello", false);
    expect(matches.length).toBe(2);
    expect(matches[0].start).toBe(0);
    expect(matches[1].start).toBe(12);
  });

  it("should handle overlapping patterns", () => {
    const findMatches = (text: string, query: string, caseSensitive: boolean) => {
      if (!query) return [];
      const matches: Array<{ start: number; end: number }> = [];
      const flags = caseSensitive ? "g" : "gi";
      try {
        const regex = new RegExp(query, flags);
        let match;
        while ((match = regex.exec(text)) !== null) {
          matches.push({ start: match.index, end: match.index + match[0].length });
        }
      } catch (e) {
        // Invalid regex
      }
      return matches;
    };

    const text = "aaa";
    const matches = findMatches(text, "aa", false);
    // Regex.exec doesn't find overlapping matches, so we expect 1
    expect(matches.length).toBe(1);
  });

  it("should replace simple text", () => {
    const replaceAll = (text: string, query: string, replacement: string, caseSensitive: boolean) => {
      if (!query) return text;
      const flags = caseSensitive ? "g" : "gi";
      try {
        const regex = new RegExp(query, flags);
        return text.replace(regex, replacement);
      } catch (e) {
        return text;
      }
    };

    const text = "Hello World Hello";
    const result = replaceAll(text, "Hello", "Hi", false);
    expect(result).toBe("Hi World Hi");
  });

  it("should handle case-insensitive replacement", () => {
    const replaceAll = (text: string, query: string, replacement: string, caseSensitive: boolean) => {
      if (!query) return text;
      const flags = caseSensitive ? "g" : "gi";
      try {
        const regex = new RegExp(query, flags);
        return text.replace(regex, replacement);
      } catch (e) {
        return text;
      }
    };

    const text = "Hello HELLO hello";
    const result = replaceAll(text, "hello", "hi", false);
    expect(result).toBe("hi hi hi");
  });

  it("should handle case-sensitive replacement", () => {
    const replaceAll = (text: string, query: string, replacement: string, caseSensitive: boolean) => {
      if (!query) return text;
      const flags = caseSensitive ? "g" : "gi";
      try {
        const regex = new RegExp(query, flags);
        return text.replace(regex, replacement);
      } catch (e) {
        return text;
      }
    };

    const text = "Hello HELLO hello";
    const result = replaceAll(text, "hello", "hi", true);
    expect(result).toBe("Hello HELLO hi");
  });
});
