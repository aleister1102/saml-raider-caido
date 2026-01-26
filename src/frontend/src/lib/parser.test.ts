import { describe, it, expect } from "vitest";
import { SAMLInfoParser, type SAMLInfo } from "./parser";

describe("SAMLInfoParser", () => {
  describe("parse", () => {
    it("should extract issuer from SAML response", () => {
      const xml = `<?xml version="1.0"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          <saml:Assertion>
            <saml:Issuer>https://example.com/idp</saml:Issuer>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
          </saml:Assertion>
        </samlp:Response>`;

      const info = SAMLInfoParser.parse(xml);
      expect(info).not.toBeNull();
      expect(info?.issuerAssertion).toBe("https://example.com/idp");
    });

    it("should extract assertion ID", () => {
      const xml = `<?xml version="1.0"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          <saml:Assertion ID="_12345">
            <saml:Issuer>https://example.com/idp</saml:Issuer>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
          </saml:Assertion>
        </samlp:Response>`;

      const info = SAMLInfoParser.parse(xml);
      expect(info).not.toBeNull();
      expect(info?.assertionId).toBe("_12345");
    });

    it("should extract subject NameID and format", () => {
      const xml = `<?xml version="1.0"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          <saml:Assertion>
            <saml:Issuer>https://example.com/idp</saml:Issuer>
            <saml:Subject>
              <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">user@example.com</saml:NameID>
            </saml:Subject>
          </saml:Assertion>
        </samlp:Response>`;

      const info = SAMLInfoParser.parse(xml);
      expect(info).not.toBeNull();
      expect(info?.subject.nameId).toBe("user@example.com");
      expect(info?.subject.format).toBe("urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress");
    });

    it("should extract conditions with NotBefore and NotOnOrAfter", () => {
      const xml = `<?xml version="1.0"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          <saml:Assertion>
            <saml:Issuer>https://example.com/idp</saml:Issuer>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
            <saml:Conditions NotBefore="2024-01-01T00:00:00Z" NotOnOrAfter="2024-01-02T00:00:00Z">
            </saml:Conditions>
          </saml:Assertion>
        </samlp:Response>`;

      const info = SAMLInfoParser.parse(xml);
      expect(info).not.toBeNull();
      expect(info?.conditions.notBefore).toBe("2024-01-01T00:00:00Z");
      expect(info?.conditions.notOnOrAfter).toBe("2024-01-02T00:00:00Z");
    });

    it("should extract audience restrictions", () => {
      const xml = `<?xml version="1.0"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          <saml:Assertion>
            <saml:Issuer>https://example.com/idp</saml:Issuer>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
            <saml:Conditions>
              <saml:AudienceRestriction>
                <saml:Audience>https://app1.example.com</saml:Audience>
                <saml:Audience>https://app2.example.com</saml:Audience>
              </saml:AudienceRestriction>
            </saml:Conditions>
          </saml:Assertion>
        </samlp:Response>`;

      const info = SAMLInfoParser.parse(xml);
      expect(info).not.toBeNull();
      expect(info?.conditions.audiences).toContain("https://app1.example.com");
      expect(info?.conditions.audiences).toContain("https://app2.example.com");
      expect(info?.conditions.audiences.length).toBe(2);
    });

    it("should extract attributes from AttributeStatement", () => {
      const xml = `<?xml version="1.0"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          <saml:Assertion>
            <saml:Issuer>https://example.com/idp</saml:Issuer>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
            <saml:AttributeStatement>
              <saml:Attribute Name="email">
                <saml:AttributeValue>user@example.com</saml:AttributeValue>
              </saml:Attribute>
              <saml:Attribute Name="role">
                <saml:AttributeValue>admin</saml:AttributeValue>
                <saml:AttributeValue>user</saml:AttributeValue>
              </saml:Attribute>
            </saml:AttributeStatement>
          </saml:Assertion>
        </samlp:Response>`;

      const info = SAMLInfoParser.parse(xml);
      expect(info).not.toBeNull();
      expect(info?.attributes.length).toBe(3);
      
      const emailAttr = info?.attributes.find(a => a.name === "email");
      expect(emailAttr?.value).toBe("user@example.com");
      
      const roleAttrs = info?.attributes.filter(a => a.name === "role");
      expect(roleAttrs?.length).toBe(2);
    });

    it("should detect signature presence", () => {
      const xmlWithSig = `<?xml version="1.0"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
          <saml:Assertion>
            <saml:Issuer>https://example.com/idp</saml:Issuer>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
            <ds:Signature>
              <ds:SignedInfo></ds:SignedInfo>
            </ds:Signature>
          </saml:Assertion>
        </samlp:Response>`;

      const info = SAMLInfoParser.parse(xmlWithSig);
      expect(info).not.toBeNull();
      expect(info?.signaturePresent).toBe(true);
    });

    it("should detect missing signature", () => {
      const xmlNoSig = `<?xml version="1.0"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          <saml:Assertion>
            <saml:Issuer>https://example.com/idp</saml:Issuer>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
          </saml:Assertion>
        </samlp:Response>`;

      const info = SAMLInfoParser.parse(xmlNoSig);
      expect(info).not.toBeNull();
      expect(info?.signaturePresent).toBe(false);
    });

    it("should handle malformed XML gracefully", () => {
      const xml = "<root><child>text</root>";
      const info = SAMLInfoParser.parse(xml);
      // xmldom is lenient and parses malformed XML, so we just check it doesn't crash
      // In a browser, DOMParser would also be lenient
      expect(info).not.toBeNull();
      // The parser should return an empty SAMLInfo object since there's no SAML content
      expect(info?.issuerAssertion).toBe("");
    });

    it("should handle empty XML gracefully", () => {
      const xml = "";
      const info = SAMLInfoParser.parse(xml);
      expect(info).toBeNull();
    });

    it("should handle SAML with no namespace prefix", () => {
      const xml = `<?xml version="1.0"?>
        <Response>
          <Assertion ID="_abc123">
            <Issuer>https://example.com/idp</Issuer>
            <Subject>
              <NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">user@example.com</NameID>
            </Subject>
            <Conditions NotBefore="2024-01-01T00:00:00Z" NotOnOrAfter="2024-01-02T00:00:00Z">
              <AudienceRestriction>
                <Audience>https://app.example.com</Audience>
              </AudienceRestriction>
            </Conditions>
            <AttributeStatement>
              <Attribute Name="department">
                <AttributeValue>Engineering</AttributeValue>
              </Attribute>
            </AttributeStatement>
          </Assertion>
        </Response>`;

      const info = SAMLInfoParser.parse(xml);
      expect(info).not.toBeNull();
      expect(info?.issuerAssertion).toBe("https://example.com/idp");
      expect(info?.assertionId).toBe("_abc123");
      expect(info?.subject.nameId).toBe("user@example.com");
      expect(info?.conditions.audiences).toContain("https://app.example.com");
      expect(info?.attributes.length).toBe(1);
    });

    it("should handle SAML with saml: namespace prefix", () => {
      const xml = `<?xml version="1.0"?>
        <Response xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          <saml:Assertion ID="_xyz789">
            <saml:Issuer>https://idp.example.com</saml:Issuer>
            <saml:Subject>
              <saml:NameID>admin@example.com</saml:NameID>
            </saml:Subject>
          </saml:Assertion>
        </Response>`;

      const info = SAMLInfoParser.parse(xml);
      expect(info).not.toBeNull();
      expect(info?.issuerAssertion).toBe("https://idp.example.com");
      expect(info?.assertionId).toBe("_xyz789");
      expect(info?.subject.nameId).toBe("admin@example.com");
    });

    it("should handle multiple attributes with same name", () => {
      const xml = `<?xml version="1.0"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          <saml:Assertion>
            <saml:Issuer>https://example.com/idp</saml:Issuer>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
            <saml:AttributeStatement>
              <saml:Attribute Name="group">
                <saml:AttributeValue>developers</saml:AttributeValue>
              </saml:Attribute>
              <saml:Attribute Name="group">
                <saml:AttributeValue>admins</saml:AttributeValue>
              </saml:Attribute>
            </saml:AttributeStatement>
          </saml:Assertion>
        </samlp:Response>`;

      const info = SAMLInfoParser.parse(xml);
      expect(info).not.toBeNull();
      const groupAttrs = info?.attributes.filter(a => a.name === "group");
      expect(groupAttrs?.length).toBe(2);
      expect(groupAttrs?.map(a => a.value)).toContain("developers");
      expect(groupAttrs?.map(a => a.value)).toContain("admins");
    });
  });
});
