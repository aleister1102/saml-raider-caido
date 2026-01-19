export interface SAMLMessage {
  id: string;
  raw: string;
  decoded: string;
  isResponse: boolean;
  binding: "POST" | "Redirect";
  parameterName: string; // SAMLRequest or SAMLResponse or custom
}

export interface Certificate {
  id: string;
  name: string;
  pem: string;
  privateKeyPem?: string;
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
}

export interface SAMLError {
  code: string;
  message: string;
  details?: string;
}

export interface BackendResponse<T> {
  success: boolean;
  data?: T;
  error?: SAMLError;
}

// SAML Information extracted from assertions
export interface SAMLInfo {
  issuer: string;
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

// Validation result for SAML XML
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

export interface SAMLBackendAPI {
  // SAML Operations
  decodeSAML(raw: string, binding: "POST" | "Redirect"): Promise<BackendResponse<string>>;
  encodeSAML(xml: string, binding: "POST" | "Redirect"): Promise<BackendResponse<string>>;
  removeSignatures(xml: string): Promise<BackendResponse<string>>;
  removeDocumentSignature(xml: string): Promise<BackendResponse<string>>;
  removeAssertionSignatures(xml: string): Promise<BackendResponse<string>>;
  signSAML(xml: string, certId: string): Promise<BackendResponse<string>>;
  
  // Attacks
  applyXSW(xml: string, variant: number): Promise<BackendResponse<string>>;
  applyXXE(xml: string, payload: string): Promise<BackendResponse<string>>;
  applyXSLT(xml: string, payload: string): Promise<BackendResponse<string>>;
  
  // Certificate Management
  getCertificates(): Promise<BackendResponse<Certificate[]>>;
  importCertificate(pem: string, privateKeyPem?: string): Promise<BackendResponse<Certificate>>;
  deleteCertificate(id: string): Promise<BackendResponse<void>>;
  cloneCertificate(id: string): Promise<BackendResponse<Certificate>>;
  createCertificate(subject: string): Promise<BackendResponse<Certificate>>;
}
