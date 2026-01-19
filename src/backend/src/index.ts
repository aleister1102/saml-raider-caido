import type { SDK, APISDK } from "caido:plugin";
import { SAMLParser } from "./saml/parser";
import { SAMLAttacks } from "./saml/attacks";
import { SAMLSigner } from "./saml/signer";
import { CertificateStore } from "./certificates/store";
import { CertificateOperations } from "./certificates/operations";
import type { SAMLBackendAPI } from "../../shared/types";

// Error codes and messages
export const ERROR_CODES = {
  PARSE_ERROR: "PARSE_ERROR",
  NO_ASSERTION: "NO_ASSERTION",
  NO_SIGNATURE: "NO_SIGNATURE",
  CERT_NOT_FOUND: "CERT_NOT_FOUND",
  CERT_NO_KEY: "CERT_NO_KEY",
  INVALID_VARIANT: "INVALID_VARIANT",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

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

const certStore = new CertificateStore();

/**
 * Wraps API handler functions to catch errors and return structured error responses
 * instead of throwing exceptions
 */
function wrapWithErrorHandling<T>(
  name: string,
  fn: (...args: any[]) => Promise<T>,
  sdk: SDK
): (sdkInstance: SDK, ...args: any[]) => Promise<BackendResponse<T>> {
  return async (sdkInstance: SDK, ...args: any[]) => {
    try {
      const data = await fn(...args);
      return { success: true, data };
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      sdk.console.error(`[SAML Raider] Error in ${name}: ${errorMessage}`);

      // Determine error code based on error message
      let code = ERROR_CODES.UNKNOWN_ERROR;
      let message = errorMessage;
      let details: string | undefined;

      if (errorMessage.includes("XML parsing") || errorMessage.includes("Unexpected token")) {
        code = ERROR_CODES.PARSE_ERROR;
        message = `Invalid XML: ${errorMessage}`;
      } else if (errorMessage.includes("No SAML Assertion")) {
        code = ERROR_CODES.NO_ASSERTION;
        message = "No SAML Assertion found in the XML";
      } else if (errorMessage.includes("No Signature")) {
        code = ERROR_CODES.NO_SIGNATURE;
        message = "No Signature element found for this attack";
      } else if (errorMessage.includes("Certificate not found")) {
        code = ERROR_CODES.CERT_NOT_FOUND;
        message = "Certificate not found";
      } else if (errorMessage.includes("no private key")) {
        code = ERROR_CODES.CERT_NO_KEY;
        message = "Certificate has no private key for signing";
      } else if (errorMessage.includes("variant") && errorMessage.includes("not supported")) {
        code = ERROR_CODES.INVALID_VARIANT;
        message = errorMessage;
      }

      return {
        success: false,
        error: {
          code,
          message,
          details: errorMessage,
        },
      };
    }
  };
}

export async function init(sdk: SDK) {
  const api = sdk.api as APISDK<SAMLBackendAPI>;

  const wrap = (name: string, fn: (...args: any[]) => Promise<any>) => {
    return wrapWithErrorHandling(name, fn, sdk);
  };

  api.register("decodeSAML", wrap("decodeSAML", async (raw: string, binding: "POST" | "Redirect") => {
    return SAMLParser.decode(raw, binding);
  }));

  api.register("encodeSAML", wrap("encodeSAML", async (xml: string, binding: "POST" | "Redirect") => {
    return SAMLParser.encode(xml, binding);
  }));

  api.register("removeSignatures", wrap("removeSignatures", async (xml: string) => {
    return SAMLParser.removeSignatures(xml);
  }));

  api.register("removeDocumentSignature", wrap("removeDocumentSignature", async (xml: string) => {
    return SAMLParser.removeDocumentSignature(xml);
  }));

  api.register("removeAssertionSignatures", wrap("removeAssertionSignatures", async (xml: string) => {
    return SAMLParser.removeAssertionSignatures(xml);
  }));

  api.register("signSAML", wrap("signSAML", async (xml: string, certId: string) => {
    const cert = certStore.get(certId);
    if (!cert) {
      throw new Error("Certificate not found");
    }
    if (!cert.privateKeyPem) {
      throw new Error("Certificate has no private key for signing");
    }
    return SAMLSigner.sign(xml, cert);
  }));

  api.register("applyXSW", wrap("applyXSW", async (xml: string, variant: number) => {
    if (variant < 1 || variant > 8) {
      throw new Error(`XSW variant ${variant} is not supported. Valid variants are 1-8.`);
    }
    const result = SAMLAttacks.applyXSW(xml, variant);
    if (!result.success) {
      throw new Error(result.error || "Unknown error applying XSW attack");
    }
    return result.xml;
  }));

  api.register("applyXXE", wrap("applyXXE", async (xml: string, payload: string) => {
    return SAMLAttacks.applyXXE(xml, payload);
  }));

  api.register("applyXSLT", wrap("applyXSLT", async (xml: string, payload: string) => {
    return SAMLAttacks.applyXSLT(xml, payload);
  }));

  // Certificate API
  api.register("getCertificates", wrap("getCertificates", async () => {
    return certStore.getAll();
  }));

  api.register("importCertificate", wrap("importCertificate", async (pem: string, privateKeyPem?: string) => {
    return certStore.import(pem, privateKeyPem);
  }));

  api.register("deleteCertificate", wrap("deleteCertificate", async (id: string) => {
    return certStore.delete(id);
  }));

  api.register("cloneCertificate", wrap("cloneCertificate", async (id: string) => {
    const original = certStore.get(id);
    if (!original) {
      throw new Error("Certificate not found");
    }
    return CertificateOperations.clone(original, certStore);
  }));

  api.register("createCertificate", wrap("createCertificate", async (subject: string) => {
    return CertificateOperations.create(subject, certStore);
  }));

  sdk.console.log("SAML Raider backend initialized.");
}
