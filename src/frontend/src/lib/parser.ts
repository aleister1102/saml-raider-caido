/**
 * SAMLInfoParser - Extracts structured information from SAML Assertions
 */

export interface SAMLInfo {
  issuerResponse: string;
  issuerAssertion: string;
  assertionId: string;
  subject: {
    nameId: string;
    format: string;
  };
  conditions: {
    notBefore: string | null;
    notOnOrAfter: string | null;
    audiences: string[];
  };
  attributes: Array<{
    name: string;
    value: string;
  }>;
  signaturePresent: boolean;
}

// Polyfill for Node.js environment (for testing)
let DOMParserImpl: any = typeof DOMParser !== "undefined" ? DOMParser : null;

if (!DOMParserImpl && typeof globalThis !== "undefined") {
  try {
    // Try to use xmldom for Node.js
    const { DOMParser: NodeDOMParser } = require("@xmldom/xmldom");
    DOMParserImpl = NodeDOMParser;
  } catch (e) {
    // xmldom not available, will use fallback
  }
}

export class SAMLInfoParser {
  /**
   * Parse SAML XML and extract information
   */
  static parse(xml: string): SAMLInfo | null {
    try {
      if (!DOMParserImpl) {
        return null;
      }

      const parser = new DOMParserImpl();
      const xmlDoc = parser.parseFromString(xml, "text/xml");

      // Check for parsing errors
      if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        return null;
      }

      const info: SAMLInfo = {
        issuerResponse: "",
        issuerAssertion: "",
        assertionId: "",
        subject: {
          nameId: "",
          format: "",
        },
        conditions: {
          notBefore: null,
          notOnOrAfter: null,
          audiences: [],
        },
        attributes: [],
        signaturePresent: false,
      };

      // Extract Issuers
      const responseElements = this.findElements(xmlDoc, "Response");
      if (responseElements.length > 0) {
        const respIssuer = this.findDirectChild(responseElements[0], "Issuer");
        if (respIssuer) info.issuerResponse = respIssuer.textContent || "";
      }

      const assertionElements = this.findElements(xmlDoc, "Assertion");
      if (assertionElements.length > 0) {
        info.assertionId = assertionElements[0].getAttribute("ID") || "";
        const assIssuer = this.findDirectChild(assertionElements[0], "Issuer");
        if (assIssuer) info.issuerAssertion = assIssuer.textContent || "";
      }

      // If we only have one issuer and it's not set in either, try the old way as fallback
      if (!info.issuerResponse && !info.issuerAssertion) {
        const allIssuers = this.findElements(xmlDoc, "Issuer");
        if (allIssuers.length > 0) info.issuerAssertion = allIssuers[0].textContent || "";
      }

      // Extract Subject/NameID
      const subjectElements = this.findElements(xmlDoc, "Subject");
      if (subjectElements.length > 0) {
        const nameIdElements = subjectElements[0].getElementsByTagName("NameID");
        if (nameIdElements.length === 0) {
          // Try with namespace prefix
          const nameIdElements2 = subjectElements[0].getElementsByTagName("saml:NameID");
          if (nameIdElements2.length > 0) {
            const nameIdElement = nameIdElements2[0];
            info.subject.nameId = nameIdElement.textContent || "";
            info.subject.format = nameIdElement.getAttribute("Format") || "";
          }
        } else {
          const nameIdElement = nameIdElements[0];
          info.subject.nameId = nameIdElement.textContent || "";
          info.subject.format = nameIdElement.getAttribute("Format") || "";
        }
      }

      // Extract Conditions
      const conditionElements = this.findElements(xmlDoc, "Conditions");
      if (conditionElements.length > 0) {
        const condElement = conditionElements[0];
        info.conditions.notBefore = condElement.getAttribute("NotBefore");
        info.conditions.notOnOrAfter = condElement.getAttribute("NotOnOrAfter");

        // Extract Audience Restrictions
        let audienceRestrictions = condElement.getElementsByTagName("AudienceRestriction");
        if (audienceRestrictions.length === 0) {
          audienceRestrictions = condElement.getElementsByTagName("saml:AudienceRestriction");
        }
        
        for (let i = 0; i < audienceRestrictions.length; i++) {
          let audiences = audienceRestrictions[i].getElementsByTagName("Audience");
          if (audiences.length === 0) {
            audiences = audienceRestrictions[i].getElementsByTagName("saml:Audience");
          }
          
          for (let j = 0; j < audiences.length; j++) {
            const audience = audiences[j].textContent;
            if (audience) {
              info.conditions.audiences.push(audience);
            }
          }
        }
      }

      // Extract Attributes
      const attributeStatements = this.findElements(xmlDoc, "AttributeStatement");
      for (let i = 0; i < attributeStatements.length; i++) {
        let attributes = attributeStatements[i].getElementsByTagName("Attribute");
        if (attributes.length === 0) {
          attributes = attributeStatements[i].getElementsByTagName("saml:Attribute");
        }
        
        for (let j = 0; j < attributes.length; j++) {
          const attr = attributes[j];
          const name = attr.getAttribute("Name") || "";
          let values = attr.getElementsByTagName("AttributeValue");
          if (values.length === 0) {
            values = attr.getElementsByTagName("saml:AttributeValue");
          }
          
          for (let k = 0; k < values.length; k++) {
            const value = values[k].textContent || "";
            info.attributes.push({ name, value });
          }
        }
      }

      // Check for Signature
      let signatures = this.findElements(xmlDoc, "Signature");
      if (signatures.length === 0) {
        // Try with ds: namespace
        signatures = xmlDoc.getElementsByTagName("ds:Signature");
        for (let i = 0; i < signatures.length; i++) {
          // Already added
        }
      }
      info.signaturePresent = signatures.length > 0;

      return info;
    } catch (e) {
      return null;
    }
  }

  /**
   * Find elements by tag name, handling namespace variations
   */
  private static findElements(
    doc: Document | Element,
    tagName: string
  ): Element[] {
    const elements: Element[] = [];

    // Try different namespace variations
    const variations = [
      tagName,
      `saml:${tagName}`,
      `saml2:${tagName}`,
    ];

    for (const variation of variations) {
      const found = doc.getElementsByTagName(variation);
      for (let i = 0; i < found.length; i++) {
        elements.push(found[i]);
      }
    }

    // Also try with wildcard namespace matching for xmldom
    if (elements.length === 0) {
      const allElements = doc.getElementsByTagName("*");
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        const localName = el.localName || el.nodeName.split(":").pop();
        if (localName === tagName) {
          elements.push(el);
        }
      }
    }

    // Remove duplicates
    return Array.from(new Set(elements));
  }

  /**
   * Find direct child element by tag name (ignoring namespace)
   */
  private static findDirectChild(parent: Element, tagName: string): Element | null {
    for (let i = 0; i < parent.childNodes.length; i++) {
      const node = parent.childNodes[i];
      if (node.nodeType === 1) { // Element node
        const el = node as Element;
        const localName = el.localName || el.nodeName.split(":").pop();
        if (localName === tagName) {
          return el;
        }
      }
    }
    return null;
  }
}
