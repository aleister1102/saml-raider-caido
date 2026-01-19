// Native XML parsing without external dependencies
// Caido backend runtime doesn't support npm modules

export class SAMLParser {
  private static base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private static uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  static decode(raw: string, binding: "POST" | "Redirect"): string {
    try {
      if (binding === "POST") {
        return atob(raw);
      } else {
        // Redirect binding uses DEFLATE - for now just try base64 decode
        // Full DEFLATE support would require pako which isn't available
        const buffer = this.base64ToUint8Array(raw);
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(buffer);
      }
    } catch (error) {
      throw new Error(`Error decoding SAML message: ${error}`);
    }
  }

  static encode(xml: string, binding: "POST" | "Redirect"): string {
    try {
      if (binding === "POST") {
        return btoa(xml);
      } else {
        // Redirect binding - just base64 encode for now
        const encoder = new TextEncoder();
        const bytes = encoder.encode(xml);
        return this.uint8ArrayToBase64(bytes);
      }
    } catch (error) {
      throw new Error(`Error encoding SAML message: ${error}`);
    }
  }

  static removeSignatures(xml: string): string {
    if (!xml || typeof xml !== 'string') {
      throw new Error("Invalid XML input for signature removal");
    }

    try {
      // Use regex to remove Signature elements
      // This handles ds:Signature, Signature, and any namespaced Signature
      let result = xml;
      
      // Remove all Signature elements (handles ds:Signature, Signature, etc.)
      // This regex matches <ds:Signature>...</ds:Signature> or <Signature>...</Signature>
      // including nested content
      const signaturePattern = /<([a-zA-Z0-9]*:)?Signature[^>]*>[\s\S]*?<\/\1?Signature>/gi;
      result = result.replace(signaturePattern, '');
      
      // Clean up any empty lines left behind
      result = result.replace(/^\s*[\r\n]/gm, '');
      
      return result;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      throw new Error(`Error removing signatures: ${errorMsg}`);
    }
  }

  /**
   * Remove only the document-level (Response) signature
   * Keeps assertion signatures intact
   */
  static removeDocumentSignature(xml: string): string {
    if (!xml || typeof xml !== 'string') {
      throw new Error("Invalid XML input for signature removal");
    }

    try {
      let result = xml;
      
      // Find Response element and remove only the direct child Signature
      // We need to find signatures that are direct children of Response, not inside Assertion
      
      // First, find all Assertion elements and temporarily replace them
      const assertions: string[] = [];
      result = result.replace(/<([a-zA-Z0-9]*:)?Assertion\b[^>]*>[\s\S]*?<\/\1?Assertion>/gi, (match) => {
        assertions.push(match);
        return `__ASSERTION_PLACEHOLDER_${assertions.length - 1}__`;
      });
      
      // Now remove signatures from the Response (which no longer contains assertions)
      const signaturePattern = /<([a-zA-Z0-9]*:)?Signature[^>]*>[\s\S]*?<\/\1?Signature>/gi;
      result = result.replace(signaturePattern, '');
      
      // Restore assertions
      assertions.forEach((assertion, index) => {
        result = result.replace(`__ASSERTION_PLACEHOLDER_${index}__`, assertion);
      });
      
      // Clean up any empty lines left behind
      result = result.replace(/^\s*[\r\n]/gm, '');
      
      return result;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      throw new Error(`Error removing document signature: ${errorMsg}`);
    }
  }

  /**
   * Remove only assertion-level signatures
   * Keeps document (Response) signature intact
   */
  static removeAssertionSignatures(xml: string): string {
    if (!xml || typeof xml !== 'string') {
      throw new Error("Invalid XML input for signature removal");
    }

    try {
      let result = xml;
      
      // Find all Assertion elements and remove signatures inside them
      result = result.replace(
        /(<([a-zA-Z0-9]*:)?Assertion\b[^>]*>)([\s\S]*?)(<\/\2?Assertion>)/gi,
        (match, openTag, prefix, content, closeTag) => {
          // Remove signatures from inside the assertion
          const signaturePattern = /<([a-zA-Z0-9]*:)?Signature[^>]*>[\s\S]*?<\/\1?Signature>/gi;
          const cleanedContent = content.replace(signaturePattern, '');
          return openTag + cleanedContent + closeTag;
        }
      );
      
      // Clean up any empty lines left behind
      result = result.replace(/^\s*[\r\n]/gm, '');
      
      return result;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      throw new Error(`Error removing assertion signatures: ${errorMsg}`);
    }
  }

  static isSAML(text: string): boolean {
    const trimmed = text.trim();
    return (
      trimmed.startsWith("<") &&
      (trimmed.includes("samlp:Response") ||
        trimmed.includes("samlp:AuthnRequest") ||
        trimmed.includes("saml:Assertion") ||
        trimmed.includes("SAMLRequest") ||
        trimmed.includes("SAMLResponse"))
    );
  }
}
