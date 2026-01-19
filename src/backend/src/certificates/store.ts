// Certificate Store - Simplified implementation without node-forge
// Note: Full certificate parsing requires external libraries

import type { Certificate } from "../../../shared/types";

export class CertificateStore {
  private certificates: Map<string, Certificate> = new Map();

  getAll(): Certificate[] {
    return Array.from(this.certificates.values());
  }

  get(id: string): Certificate | undefined {
    return this.certificates.get(id);
  }

  delete(id: string): void {
    this.certificates.delete(id);
  }

  import(pem: string, privateKeyPem?: string): Certificate {
    // Caido backend runtime doesn't support npm modules like node-forge
    // We can store the PEM but can't parse certificate details
    const id = Math.random().toString(36).substring(7);
    
    // Extract basic info from PEM using regex (limited parsing)
    const subjectMatch = pem.match(/Subject:.*?CN\s*=\s*([^,\n]+)/i);
    const issuerMatch = pem.match(/Issuer:.*?CN\s*=\s*([^,\n]+)/i);
    
    const certificate: Certificate = {
      id,
      name: subjectMatch ? subjectMatch[1].trim() : "Imported Certificate",
      pem,
      privateKeyPem,
      subject: subjectMatch ? subjectMatch[1].trim() : "Unknown",
      issuer: issuerMatch ? issuerMatch[1].trim() : "Unknown",
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      serialNumber: id,
    };

    this.certificates.set(id, certificate);
    return certificate;
  }
}
