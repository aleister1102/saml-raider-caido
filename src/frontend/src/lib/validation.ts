/**
 * ValidationEngine - Validates SAML XML structure and syntax
 */

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export class ValidationEngine {
  /**
   * Check for non-whitespace content after the root element closes
   */
  static checkTrailingContent(xml: string): ValidationError | null {
    // Find the last closing tag
    const lastCloseTagMatch = xml.match(/<\/[a-zA-Z0-9:-]+>\s*$/);
    if (!lastCloseTagMatch) {
      // No closing tag at end - might be self-closing or invalid
      const selfClosingMatch = xml.match(/\/>\s*$/);
      if (!selfClosingMatch) {
        return {
          line: 1,
          column: 1,
          message: "XML document does not end with a valid closing tag",
          severity: "error",
        };
      }
      return null;
    }

    // Check if there's any non-whitespace content after the expected root end
    // Find the root element name
    const rootMatch = xml.match(/<([a-zA-Z][a-zA-Z0-9:-]*)/);
    if (!rootMatch) {
      return null;
    }
    const rootName = rootMatch[1];

    // Find the last occurrence of the closing root tag
    const closeRootPattern = new RegExp(`</${rootName}>`, "g");
    let lastCloseIndex = -1;
    let match;
    while ((match = closeRootPattern.exec(xml)) !== null) {
      lastCloseIndex = match.index + match[0].length;
    }

    if (lastCloseIndex === -1) {
      return null; // Let DOMParser handle this
    }

    // Check for non-whitespace content after the closing root tag
    const trailingContent = xml.substring(lastCloseIndex);
    const nonWhitespace = trailingContent.match(/\S/);
    if (nonWhitespace) {
      // Calculate line and column of the trailing content
      const beforeTrailing = xml.substring(0, lastCloseIndex + (nonWhitespace.index || 0));
      const lines = beforeTrailing.split("\n");
      const line = lines.length;
      const column = lines[lines.length - 1].length + 1;

      return {
        line,
        column,
        message: `Unexpected content after closing </${rootName}> tag`,
        severity: "error",
      };
    }

    return null;
  }

  /**
   * Check if XML is well-formed using DOMParser
   */
  static checkWellFormed(xml: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!xml || xml.trim().length === 0) {
      errors.push({
        line: 1,
        column: 1,
        message: "XML is empty",
        severity: "error",
      });
      return errors;
    }

    try {
      // Check if DOMParser is available (browser environment)
      if (typeof DOMParser !== "undefined") {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, "text/xml");

        // Check for parsing errors - DOMParser returns a document with parsererror element on error
        const parserErrors = xmlDoc.getElementsByTagName("parsererror");
        if (parserErrors.length > 0) {
          const errorElement = parserErrors[0];
          const errorText = errorElement.textContent || "Unknown parsing error";

          // Try to extract line and column from error message
          const lineMatch = errorText.match(/line (\d+)/i);
          const columnMatch = errorText.match(/column (\d+)/i);

          const line = lineMatch ? parseInt(lineMatch[1]) : 1;
          const column = columnMatch ? parseInt(columnMatch[1]) : 1;

          errors.push({
            line,
            column,
            message: errorText,
            severity: "error",
          });
        } else {
          // DOMParser may be lenient - check for trailing content after root element
          const trailingContentError = this.checkTrailingContent(xml);
          if (trailingContentError) {
            errors.push(trailingContentError);
          }
        }
      } else {
        // Fallback: basic XML validation using regex patterns
        // Check for basic XML structure
        if (!xml.match(/<[^>]+>/)) {
          errors.push({
            line: 1,
            column: 1,
            message: "No XML tags found",
            severity: "error",
          });
          return errors;
        }

        // Check for unclosed tags
        const openTags = xml.match(/<([a-zA-Z][a-zA-Z0-9:]*)[^>]*>/g) || [];
        const closeTags = xml.match(/<\/([a-zA-Z][a-zA-Z0-9:]*)[^>]*>/g) || [];

        if (openTags.length !== closeTags.length) {
          errors.push({
            line: 1,
            column: 1,
            message: "Mismatched XML tags",
            severity: "error",
          });
        }
      }
    } catch (e: any) {
      errors.push({
        line: 1,
        column: 1,
        message: `XML parsing failed: ${e.message}`,
        severity: "error",
      });
    }

    return errors;
  }

  /**
   * Check for required SAML elements
   */
  static checkSAMLStructure(xml: string): ValidationError[] {
    const errors: ValidationError[] = [];

    try {
      // Check if DOMParser is available (browser environment)
      if (typeof DOMParser !== "undefined") {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, "text/xml");

        // Check for parsing errors first
        if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
          return errors; // Already reported by checkWellFormed
        }

        // Check for Assertion element (required)
        const assertions = xmlDoc.getElementsByTagName("Assertion");
        const assertions2 = xmlDoc.getElementsByTagName("saml:Assertion");
        const assertions3 = xmlDoc.getElementsByTagName("saml2:Assertion");

        if (assertions.length === 0 && assertions2.length === 0 && assertions3.length === 0) {
          errors.push({
            line: 1,
            column: 1,
            message: "No SAML Assertion element found",
            severity: "error",
          });
        }

        // Check for Issuer element (required)
        const issuers = xmlDoc.getElementsByTagName("Issuer");
        const issuers2 = xmlDoc.getElementsByTagName("saml:Issuer");
        const issuers3 = xmlDoc.getElementsByTagName("saml2:Issuer");

        if (issuers.length === 0 && issuers2.length === 0 && issuers3.length === 0) {
          errors.push({
            line: 1,
            column: 1,
            message: "No SAML Issuer element found",
            severity: "warning",
          });
        }

        // Check for Subject element (required in Assertion)
        const subjects = xmlDoc.getElementsByTagName("Subject");
        const subjects2 = xmlDoc.getElementsByTagName("saml:Subject");
        const subjects3 = xmlDoc.getElementsByTagName("saml2:Subject");

        if (subjects.length === 0 && subjects2.length === 0 && subjects3.length === 0) {
          errors.push({
            line: 1,
            column: 1,
            message: "No SAML Subject element found",
            severity: "warning",
          });
        }
      } else {
        // Fallback: regex-based SAML structure validation
        const hasAssertion =
          /Assertion|saml:Assertion|saml2:Assertion/.test(xml);
        const hasIssuer =
          /Issuer|saml:Issuer|saml2:Issuer/.test(xml);
        const hasSubject =
          /Subject|saml:Subject|saml2:Subject/.test(xml);

        if (!hasAssertion) {
          errors.push({
            line: 1,
            column: 1,
            message: "No SAML Assertion element found",
            severity: "error",
          });
        }

        if (!hasIssuer) {
          errors.push({
            line: 1,
            column: 1,
            message: "No SAML Issuer element found",
            severity: "warning",
          });
        }

        if (!hasSubject) {
          errors.push({
            line: 1,
            column: 1,
            message: "No SAML Subject element found",
            severity: "warning",
          });
        }
      }
    } catch (e: any) {
      // Silently ignore - well-formedness errors are caught by checkWellFormed
    }

    return errors;
  }

  /**
   * Validate XML with both well-formedness and SAML structure checks
   */
  static validate(xml: string): ValidationResult {
    if (!xml || xml.trim().length === 0) {
      return {
        valid: false,
        errors: [
          {
            line: 1,
            column: 1,
            message: "XML is empty",
            severity: "error",
          },
        ],
      };
    }

    const wellFormedErrors = this.checkWellFormed(xml);
    if (wellFormedErrors.length > 0) {
      return {
        valid: false,
        errors: wellFormedErrors,
      };
    }

    const structureErrors = this.checkSAMLStructure(xml);

    return {
      valid: structureErrors.filter((e) => e.severity === "error").length === 0,
      errors: structureErrors,
    };
  }

  /**
   * Validate with debounce - returns a promise that resolves after the debounce delay
   */
  static validateWithDebounce(
    xml: string,
    delay: number = 500
  ): Promise<ValidationResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.validate(xml));
      }, delay);
    });
  }
}
