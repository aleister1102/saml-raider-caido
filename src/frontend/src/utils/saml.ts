export const findSAML = (data: string): { raw: string, binding: "POST" | "Redirect", parameter: string } | null => {
  // Check common SAML parameter names
  const params = new URLSearchParams(data);
  const samlRequest = params.get("SAMLRequest");
  if (samlRequest) {
    return { raw: samlRequest, binding: "Redirect", parameter: "SAMLRequest" };
  }
  const samlResponse = params.get("SAMLResponse");
  if (samlResponse) {
    return { raw: samlResponse, binding: "POST", parameter: "SAMLResponse" };
  }
  
  // Also check if it's in a body (e.g. POST binding)
  // Usually the same URLSearchParams works for application/x-www-form-urlencoded
  
  return null;
};
