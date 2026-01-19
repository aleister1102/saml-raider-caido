// Certificate Operations - Simplified implementation without node-forge
// Note: Full certificate generation requires external libraries

import type { Certificate } from "../../../shared/types";
import { CertificateStore } from "./store";

export class CertificateOperations {
  static create(_subject: string, _store: CertificateStore): Certificate {
    // Caido backend runtime doesn't support npm modules like node-forge
    // Certificate generation requires RSA key generation and X.509 operations
    throw new Error(
      "Certificate creation is not available in this version. " +
      "The Caido backend runtime doesn't support the cryptographic libraries required. " +
      "Please import an existing certificate instead."
    );
  }

  static clone(_original: Certificate, _store: CertificateStore): Certificate {
    // Caido backend runtime doesn't support npm modules like node-forge
    throw new Error(
      "Certificate cloning is not available in this version. " +
      "The Caido backend runtime doesn't support the cryptographic libraries required. " +
      "Please import an existing certificate instead."
    );
  }
}
