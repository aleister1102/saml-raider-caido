// SAML Signing - Simplified implementation without node-forge
// Note: Full cryptographic signing requires external libraries
// This provides a placeholder that explains the limitation

import type { Certificate } from "../../../shared/types";

export class SAMLSigner {
  static sign(_xml: string, _cert: Certificate): string {
    // Caido backend runtime doesn't support npm modules like node-forge
    // Full SAML signing requires RSA cryptographic operations
    throw new Error(
      "SAML signing is not available in this version. " +
      "The Caido backend runtime doesn't support the cryptographic libraries required for signing. " +
      "Please use an external tool to sign SAML messages."
    );
  }
}
