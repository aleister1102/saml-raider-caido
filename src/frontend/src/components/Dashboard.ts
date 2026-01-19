import type { Caido } from "@caido/sdk-frontend";
import type { SAMLBackendAPI, Certificate } from "../../../shared/types";
import { createSearchReplaceComponent } from "./SearchReplace";
import { createValidationStatus } from "./ValidationStatus";
import { createInformationTableComponent } from "./InformationTable";
import { showInputModal, showConfirmModal } from "./Modal";

export const createDashboard = (caido: Caido<SAMLBackendAPI>) => {
  // Forward declarations for functions used before definition
  let refreshCerts: () => Promise<void>;
  let renderCertList: () => void;
  let renderCertDetails: (cert: Certificate | null) => void;
  let updateHighlight: () => void;
  let undo: () => void;
  let redo: () => void;
  let updateUndoRedoButtons: () => void;
  
  const container = document.createElement("div");
  container.className = "saml-dashboard";

  const style = document.createElement("style");
  style.textContent = `
    .saml-dashboard {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: 100%;
      box-sizing: border-box;
      background: var(--bg-primary);
      color: var(--text-primary);
    }
    .saml-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .saml-logo {
      font-size: 24px;
      color: var(--color-primary);
    }
    .saml-tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--border-primary);
    }
    .saml-tab {
      padding: 10px 20px;
      cursor: pointer;
      border: 1px solid transparent;
      border-bottom: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
      margin-bottom: -1px;
    }
    .saml-tab:hover {
      color: var(--text-primary);
      background: var(--bg-secondary);
    }
    .saml-tab.active {
      color: var(--text-primary);
      background: var(--bg-secondary);
      border-color: var(--border-primary);
      border-bottom-color: var(--bg-secondary);
      border-radius: 4px 4px 0 0;
    }
    .saml-tab-content {
      display: none;
      flex: 1;
      min-height: 0;
    }
    .saml-tab-content.active {
      display: flex;
      flex-direction: column;
    }
    .saml-content {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 20px;
      flex: 1;
      min-height: 0;
    }
    .saml-editor-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
      position: relative;
    }
    .saml-editor-wrapper {
      flex: 1;
      position: relative;
      min-height: 0;
    }
    .saml-table-container {
      flex: 1;
      min-height: 0;
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      overflow: hidden;
    }
    .saml-editor, .saml-highlight {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 16px;
      line-height: 1.6;
      padding: 12px;
      margin: 0;
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      box-sizing: border-box;
      white-space: pre-wrap;
      word-break: break-all;
      overflow-y: auto;
      overflow-x: auto;
    }
    .saml-editor {
      background: transparent;
      color: inherit;
      caret-color: #fff;
      z-index: 2;
      resize: none;
      -webkit-text-fill-color: transparent;
    }
    .saml-editor:focus {
      outline: 1px solid var(--color-primary);
    }
    .saml-highlight {
      background: var(--bg-secondary);
      color: var(--text-primary);
      z-index: 1;
      pointer-events: none;
      overflow-y: auto;
      overflow-x: auto;
    }
    .saml-hl-tag { color: #569cd6; }
    .saml-hl-attr { color: #9cdcfe; }
    .saml-hl-val { color: #ce9178; }
    .saml-hl-comment { color: #6a9955; }
    
    .saml-editor-toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 5px;
    }
    .saml-sidebar {
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow-y: auto;
    }
    .saml-card {
      padding: 15px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 8px;
    }
    .saml-card-title {
      font-weight: bold;
      margin-bottom: 10px;
      display: block;
    }
    .saml-button-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    
    /* Certificate Manager Styles */
    .cert-manager {
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
      min-height: 0;
    }
    .cert-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      flex: 1;
      min-height: 0;
    }
    .cert-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 8px;
      padding: 16px;
      overflow: hidden;
    }
    .cert-panel-title {
      font-weight: bold;
      font-size: 14px;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .cert-panel-title i {
      color: var(--color-primary);
    }
    .cert-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .cert-item {
      padding: 12px;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .cert-item:hover {
      border-color: var(--color-primary);
    }
    .cert-item.selected {
      border-color: var(--color-primary);
      background: rgba(var(--color-primary-rgb), 0.1);
    }
    .cert-item-name {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .cert-item-subject {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }
    .cert-item-meta {
      font-size: 11px;
      color: var(--text-secondary);
      display: flex;
      gap: 12px;
    }
    .cert-item-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .cert-item-badge.has-key {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }
    .cert-item-badge.no-key {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }
    .cert-actions-bar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .cert-details {
      flex: 1;
      overflow-y: auto;
    }
    .cert-detail-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-primary);
    }
    .cert-detail-row:last-child {
      border-bottom: none;
    }
    .cert-detail-label {
      width: 120px;
      font-weight: 600;
      font-size: 12px;
      color: var(--text-secondary);
    }
    .cert-detail-value {
      flex: 1;
      font-size: 12px;
      word-break: break-all;
      font-family: monospace;
    }
    .cert-pem-container {
      margin-top: 12px;
    }
    .cert-pem-label {
      font-weight: 600;
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }
    .cert-pem-content {
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      padding: 8px;
      font-family: monospace;
      font-size: 11px;
      max-height: 150px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .cert-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      text-align: center;
      color: var(--text-secondary);
    }
    .cert-empty i {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
  `;
  container.appendChild(style);

  const header = document.createElement("div");
  header.className = "saml-header";
  header.innerHTML = `
    <i class="fas fa-mask saml-logo"></i>
    <h1>SAML Raider</h1>
  `;
  container.appendChild(header);

  // Tabs
  const tabs = document.createElement("div");
  tabs.className = "saml-tabs";
  container.appendChild(tabs);

  const editorTab = document.createElement("button");
  editorTab.className = "saml-tab active";
  editorTab.textContent = "SAML Editor";
  tabs.appendChild(editorTab);

  const certTab = document.createElement("button");
  certTab.className = "saml-tab";
  certTab.textContent = "Certificates";
  tabs.appendChild(certTab);

  // Tab contents
  const editorTabContent = document.createElement("div");
  editorTabContent.className = "saml-tab-content active";
  container.appendChild(editorTabContent);

  const certTabContent = document.createElement("div");
  certTabContent.className = "saml-tab-content";
  container.appendChild(certTabContent);

  // Tab switching
  editorTab.addEventListener("click", () => {
    editorTab.classList.add("active");
    certTab.classList.remove("active");
    editorTabContent.classList.add("active");
    certTabContent.classList.remove("active");
  });

  certTab.addEventListener("click", () => {
    certTab.classList.add("active");
    editorTab.classList.remove("active");
    certTabContent.classList.add("active");
    editorTabContent.classList.remove("active");
    refreshCerts();
  });

  // ========== SAML Editor Tab ==========
  const content = document.createElement("div");
  content.className = "saml-content";
  editorTabContent.appendChild(content);

  const editorContainer = document.createElement("div");
  editorContainer.className = "saml-editor-container";
  content.appendChild(editorContainer);

  const toolbar = document.createElement("div");
  toolbar.className = "saml-editor-toolbar";
  editorContainer.appendChild(toolbar);

  const undoBtn = caido.ui.button({ label: "Undo", variant: "tertiary", size: "small" });
  const redoBtn = caido.ui.button({ label: "Redo", variant: "tertiary", size: "small" });
  const prettifyBtn = caido.ui.button({ label: "Prettify", variant: "tertiary", size: "small" });
  const minifyBtn = caido.ui.button({ label: "Minify", variant: "tertiary", size: "small" });
  toolbar.append(undoBtn, redoBtn, prettifyBtn, minifyBtn);

  const editorWrapper = document.createElement("div");
  editorWrapper.className = "saml-editor-wrapper";
  editorContainer.appendChild(editorWrapper);

  const highlight = document.createElement("div");
  highlight.className = "saml-highlight";
  editorWrapper.appendChild(highlight);

  const editor = document.createElement("textarea");
  editor.className = "saml-editor";
  editor.placeholder = "Paste SAML XML here or select a message from History...";
  editor.spellcheck = false;
  editor.setAttribute("autocorrect", "off");
  editor.setAttribute("autocapitalize", "off");
  editorWrapper.appendChild(editor);

  // Placeholder SAML Response
  const placeholderSAML = `<?xml version="1.0"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="pfx109a203a-d97d-7c5c-6d0a-9a71151eefde" Version="2.0" IssueInstant="2014-07-17T01:01:48Z" Destination="http://sp.example.com/demo1/index.php?acs" InResponseTo="ONELOGIN_4fee3b046395c4e751011e97f8900b5273d56685">
  <saml:Issuer>http://idp.example.com/metadata.php</saml:Issuer>
  <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <ds:SignedInfo>
      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
      <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
      <ds:Reference URI="#pfx109a203a-d97d-7c5c-6d0a-9a71151eefde">
        <ds:Transforms>
          <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
          <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        </ds:Transforms>
        <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
        <ds:DigestValue>6RqtZU4XDcZJXy9SExZ0YjQR40k=</ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue>rHYOgqQwbAzxPQLg6ThygltdFl/M0plEkVii1rJe2z1rHjontOIjNvsFYa4MkzlJCpiN7j6IEAllR5YJU3rvEmiuVqC+YQrdyV3iMeo67DaebyCWojlOjqiv8eszjnfmPWqvP2eBuMaA3RHLQ2pW0wQ0J/KB3B78qMzBnNTX8nk=</ds:SignatureValue>
    <ds:KeyInfo>
      <ds:X509Data>
        <ds:X509Certificate>MIICajCCAdOgAwIBAgIBADANBgkqhkiG9w0BAQ0FADBSMQswCQYDVQQGEwJ1czETMBEGA1UECAwKQ2FsaWZvcm5pYTEVMBMGA1UECgwMT25lbG9naW4gSW5jMRcwFQYDVQQDDA5zcC5leGFtcGxlLmNvbTAeFw0xNDA3MTcxNDEyNTZaFw0xNTA3MTcxNDEyNTZaMFIxCzAJBgNVBAYTAnVzMRMwEQYDVQQIDApDYWxpZm9ybmlhMRUwEwYDVQQKDAxPbmVsb2dpbiBJbmMxFzAVBgNVBAMMDnNwLmV4YW1wbGUuY29tMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDZx+ON4IUoIWxgukTb1tOiX3bMYzYQiwWPUNMp+Fq82xoNogso2bykZG0yiJm5o8zv/sd6pGouayMgkx/2FSOdc36T0jGbCHuRSbtia0PEzNIRtmViMrt3AeoWBidRXmZsxCNLwgIV6dn2WpuE5Az0bHgpZnQxTKFek0BMKU/d8wIDAQABo1AwTjAdBgNVHQ4EFgQUGHxYqZYyX7cTxKVODVgZwSTdCnwwHwYDVR0jBBgwFoAUGHxYqZYyX7cTxKVODVgZwSTdCnwwDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQ0FAAOBgQByFOl+hMFICbd3DJfnp2Rgd/dqttsZG/tyhILWvErbio/DEe98mXpowhTkC04ENprOyXi7ZbUqiicF89uAGyt1oqgTUCD1VsLahqIcmrzgumNyTwLGWo17WDAa1/usDhetWAMhgzF/Cnf5ek0nK00m0YZGyc4LzgD0CROMASTWNg==</ds:X509Certificate>
      </ds:X509Data>
    </ds:KeyInfo>
  </ds:Signature>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema" ID="pfxdb076fac-03c2-6e40-f1b7-2b1c0b7f1200" Version="2.0" IssueInstant="2014-07-17T01:01:48Z">
    <saml:Issuer>http://idp.example.com/metadata.php</saml:Issuer>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
        <ds:Reference URI="#pfxdb076fac-03c2-6e40-f1b7-2b1c0b7f1200">
          <ds:Transforms>
            <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          </ds:Transforms>
          <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
          <ds:DigestValue>G3lwt9EEoQVIxWrqv/Ttci25KMI=</ds:DigestValue>
        </ds:Reference>
      </ds:SignedInfo>
      <ds:SignatureValue>hCzsWZbKQt8DhC5IrahJSgYeLOXghLpetcmn72rFZPIvpx7fdZ5OPk7YbaOtB8nfrCXMUhZpz+0WYfCblabDzNuWZuBdhpvSvxrKIask2rJQGp0cLfYoMJ3kNjq4fVnbtSoMmdmK1vEBbP89aSeL9bQkJ1bPDt43to1V4wHiy10=</ds:SignatureValue>
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>MIICajCCAdOgAwIBAgIBADANBgkqhkiG9w0BAQ0FADBSMQswCQYDVQQGEwJ1czETMBEGA1UECAwKQ2FsaWZvcm5pYTEVMBMGA1UECgwMT25lbG9naW4gSW5jMRcwFQYDVQQDDA5zcC5leGFtcGxlLmNvbTAeFw0xNDA3MTcxNDEyNTZaFw0xNTA3MTcxNDEyNTZaMFIxCzAJBgNVBAYTAnVzMRMwEQYDVQQIDApDYWxpZm9ybmlhMRUwEwYDVQQKDAxPbmVsb2dpbiBJbmMxFzAVBgNVBAMMDnNwLmV4YW1wbGUuY29tMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDZx+ON4IUoIWxgukTb1tOiX3bMYzYQiwWPUNMp+Fq82xoNogso2bykZG0yiJm5o8zv/sd6pGouayMgkx/2FSOdc36T0jGbCHuRSbtia0PEzNIRtmViMrt3AeoWBidRXmZsxCNLwgIV6dn2WpuE5Az0bHgpZnQxTKFek0BMKU/d8wIDAQABo1AwTjAdBgNVHQ4EFgQUGHxYqZYyX7cTxKVODVgZwSTdCnwwHwYDVR0jBBgwFoAUGHxYqZYyX7cTxKVODVgZwSTdCnwwDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQ0FAAOBgQByFOl+hMFICbd3DJfnp2Rgd/dqttsZG/tyhILWvErbio/DEe98mXpowhTkC04ENprOyXi7ZbUqiicF89uAGyt1oqgTUCD1VsLahqIcmrzgumNyTwLGWo17WDAa1/usDhetWAMhgzF/Cnf5ek0nK00m0YZGyc4LzgD0CROMASTWNg==</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </ds:Signature>
    <saml:Subject>
      <saml:NameID SPNameQualifier="http://sp.example.com/demo1/metadata.php" Format="urn:oasis:names:tc:SAML:2.0:nameid-format:transient">_ce3d2948b4cf20146dee0a0b3dd6f69b6cf86f62d7</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData NotOnOrAfter="2024-01-18T06:21:48Z" Recipient="http://sp.example.com/demo1/index.php?acs" InResponseTo="ONELOGIN_4fee3b046395c4e751011e97f8900b5273d56685"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="2014-07-17T01:01:18Z" NotOnOrAfter="2024-01-18T06:21:48Z">
      <saml:AudienceRestriction>
        <saml:Audience>http://sp.example.com/demo1/metadata.php</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="2014-07-17T01:01:48Z" SessionNotOnOrAfter="2024-07-17T09:01:48Z" SessionIndex="_be9967abd904ddcae3c0eb4189adbe3f71e327cf93">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:Password</saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="uid" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">test</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="mail" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">test@example.com</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="eduPersonAffiliation" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">users</saml:AttributeValue>
        <saml:AttributeValue xsi:type="xs:string">examplerole1</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;
  editor.value = placeholderSAML;

  // Undo/Redo history
  const history: string[] = [];
  let historyIndex = -1;
  let isUndoRedo = false;

  const saveToHistory = (value: string) => {
    if (isUndoRedo) return;
    if (historyIndex >= 0 && history[historyIndex] === value) return;
    if (historyIndex < history.length - 1) {
      history.splice(historyIndex + 1);
    }
    history.push(value);
    historyIndex = history.length - 1;
    if (history.length > 50) {
      history.shift();
      historyIndex--;
    }
    updateUndoRedoButtons();
  };

  undo = () => {
    if (historyIndex > 0) {
      historyIndex--;
      isUndoRedo = true;
      editor.value = history[historyIndex];
      updateHighlight();
      isUndoRedo = false;
      updateUndoRedoButtons();
    }
  };

  redo = () => {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      isUndoRedo = true;
      editor.value = history[historyIndex];
      updateHighlight();
      isUndoRedo = false;
      updateUndoRedoButtons();
    }
  };

  updateUndoRedoButtons = () => {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= history.length - 1;
  };

  updateHighlight = () => {
    let text = editor.value;
    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    text = text.replace(/(&lt;\/?[a-zA-Z0-9:-]+)/g, '<span class="saml-hl-tag">$1</span>');
    text = text.replace(/([a-zA-Z0-9:-]+)(=)(&quot;.*?&quot;)/g, '<span class="saml-hl-attr">$1</span>$2<span class="saml-hl-val">$3</span>');
    text = text.replace(/(&lt;!--.*?--&gt;)/g, '<span class="saml-hl-comment">$1</span>');
    highlight.innerHTML = text;
  };

  saveToHistory(placeholderSAML);
  updateHighlight();
  updateUndoRedoButtons();

  editor.addEventListener("input", () => {
    updateHighlight();
    saveToHistory(editor.value);
  });
  editor.addEventListener("scroll", () => {
    highlight.scrollTop = editor.scrollTop;
    highlight.scrollLeft = editor.scrollLeft;
  });
  highlight.addEventListener("scroll", () => {
    editor.scrollTop = highlight.scrollTop;
    editor.scrollLeft = highlight.scrollLeft;
  });

  // Keyboard shortcuts
  container.addEventListener("keydown", (e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    
    if (cmdOrCtrl && e.key === 'f') {
      e.preventDefault();
      searchReplace.focusSearch();
      return;
    }
    if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if ((cmdOrCtrl && e.shiftKey && e.key === 'z') || (cmdOrCtrl && e.key === 'y')) {
      e.preventDefault();
      redo();
      return;
    }
  });

  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);

  const searchReplace = createSearchReplaceComponent(caido, editor, highlight, updateHighlight);
  editorContainer.appendChild(searchReplace.element);

  const validationStatus = createValidationStatus(caido, editor, { debounceDelay: 500 });
  editorContainer.appendChild(validationStatus.element);

  const tableContainer = document.createElement("div");
  tableContainer.className = "saml-table-container";
  editorContainer.appendChild(tableContainer);
  
  const informationTable = createInformationTableComponent(caido, editor);
  tableContainer.appendChild(informationTable.element);

  prettifyBtn.addEventListener("click", () => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(editor.value, "text/xml");
      const serializer = new XMLSerializer();
      let xml = serializer.serializeToString(xmlDoc);
      let formatted = "";
      let indent = 0;
      xml.split(/>\s*</).forEach(node => {
        if (node.match(/^\/\w/)) indent--;
        formatted += "  ".repeat(Math.max(0, indent)) + "<" + node + ">\n";
        if (node.match(/^<?\w[^>]*[^\/]$/)) indent++;
      });
      editor.value = formatted.trim().replace(/^<|>$/g, "");
      updateHighlight();
      saveToHistory(editor.value);
    } catch (e) {
      caido.window.showToast("Failed to prettify XML.", { variant: "error" });
    }
  });

  minifyBtn.addEventListener("click", () => {
    editor.value = editor.value.replace(/>\s+</g, "><").trim();
    updateHighlight();
    saveToHistory(editor.value);
  });

  // Sidebar
  const sidebar = document.createElement("div");
  sidebar.className = "saml-sidebar";
  content.appendChild(sidebar);


  // Attack Card
  const attackCard = document.createElement("div");
  attackCard.className = "saml-card";
  sidebar.appendChild(attackCard);

  const attackTitle = document.createElement("span");
  attackTitle.className = "saml-card-title";
  attackTitle.textContent = "SAML Attacks";
  attackCard.appendChild(attackTitle);

  const attackGrid = document.createElement("div");
  attackGrid.className = "saml-button-grid";
  attackCard.appendChild(attackGrid);

  const signBtn = caido.ui.button({ label: "Sign Message", variant: "secondary", size: "small" });
  signBtn.addEventListener("click", async () => {
    const xml = editor.value;
    if (!xml) return;
    try {
      const certsResponse = await caido.backend.getCertificates();
      if (!certsResponse.success || !certsResponse.data) {
        caido.window.showToast("Failed to load certificates.", { variant: "error" });
        return;
      }
      const certs = certsResponse.data;
      if (certs.length === 0) {
        caido.window.showToast("No certificates available. Go to Certificates tab.", { variant: "warning" });
        return;
      }
      const cert = certs.find(c => !!c.privateKeyPem);
      if (!cert) {
        caido.window.showToast("No certificate with private key found.", { variant: "warning" });
        return;
      }
      const signResponse = await caido.backend.signSAML(xml, cert.id);
      if (signResponse.success && signResponse.data) {
        editor.value = signResponse.data;
        updateHighlight();
        saveToHistory(editor.value);
        caido.window.showToast(`Signed with ${cert.name}.`, { variant: "success" });
      } else {
        caido.window.showToast(`Signing failed: ${signResponse.error?.message || "Unknown error"}`, { variant: "error" });
      }
    } catch (err) {
      caido.window.showToast("Signing failed.", { variant: "error" });
    }
  });
  attackGrid.appendChild(signBtn);

  const removeSigBtn = caido.ui.button({ label: "Remove All Signatures", variant: "secondary", size: "small" });
  removeSigBtn.addEventListener("click", async () => {
    const xml = editor.value;
    if (!xml) return;
    try {
      const response = await caido.backend.removeSignatures(xml);
      if (response.success && response.data) {
        editor.value = response.data;
        updateHighlight();
        saveToHistory(editor.value);
        caido.window.showToast("All signatures removed.", { variant: "info" });
      } else {
        caido.window.showToast(`Failed: ${response.error?.message || "Unknown error"}`, { variant: "error" });
      }
    } catch (err) {
      caido.window.showToast("Failed to remove signatures.", { variant: "error" });
    }
  });
  attackGrid.appendChild(removeSigBtn);

  const removeDocSigBtn = caido.ui.button({ label: "Remove Document Sig", variant: "secondary", size: "small" });
  removeDocSigBtn.addEventListener("click", async () => {
    const xml = editor.value;
    if (!xml) return;
    try {
      const response = await caido.backend.removeDocumentSignature(xml);
      if (response.success && response.data) {
        editor.value = response.data;
        updateHighlight();
        saveToHistory(editor.value);
        caido.window.showToast("Document signature removed.", { variant: "info" });
      } else {
        caido.window.showToast(`Failed: ${response.error?.message || "Unknown error"}`, { variant: "error" });
      }
    } catch (err) {
      caido.window.showToast("Failed to remove document signature.", { variant: "error" });
    }
  });
  attackGrid.appendChild(removeDocSigBtn);

  const removeAssertionSigBtn = caido.ui.button({ label: "Remove Assertion Sig", variant: "secondary", size: "small" });
  removeAssertionSigBtn.addEventListener("click", async () => {
    const xml = editor.value;
    if (!xml) return;
    try {
      const response = await caido.backend.removeAssertionSignatures(xml);
      if (response.success && response.data) {
        editor.value = response.data;
        updateHighlight();
        saveToHistory(editor.value);
        caido.window.showToast("Assertion signatures removed.", { variant: "info" });
      } else {
        caido.window.showToast(`Failed: ${response.error?.message || "Unknown error"}`, { variant: "error" });
      }
    } catch (err) {
      caido.window.showToast("Failed to remove assertion signatures.", { variant: "error" });
    }
  });
  attackGrid.appendChild(removeAssertionSigBtn);

  const sendCertBtn = caido.ui.button({ label: "Send Cert to Manager", variant: "tertiary", size: "small" });
  sendCertBtn.addEventListener("click", async () => {
    const xml = editor.value;
    if (!xml) return;
    try {
      // Extract X509Certificate from SAML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, "text/xml");
      const certElements = xmlDoc.getElementsByTagNameNS("http://www.w3.org/2000/09/xmldsig#", "X509Certificate");
      if (certElements.length === 0) {
        caido.window.showToast("No X509Certificate found in SAML.", { variant: "warning" });
        return;
      }
      // Get the first certificate
      const certBase64 = certElements[0].textContent?.trim();
      if (!certBase64) {
        caido.window.showToast("Certificate content is empty.", { variant: "warning" });
        return;
      }
      // Convert to PEM format
      const pemCert = `-----BEGIN CERTIFICATE-----\n${certBase64.match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`;
      const response = await caido.backend.importCertificate(pemCert);
      if (response.success) {
        caido.window.showToast("Certificate imported to manager.", { variant: "success" });
        refreshCerts();
      } else {
        caido.window.showToast(`Import failed: ${response.error?.message}`, { variant: "error" });
      }
    } catch (err) {
      caido.window.showToast("Failed to extract certificate.", { variant: "error" });
    }
  });
  attackGrid.appendChild(sendCertBtn);

  const xxeBtn = caido.ui.button({ label: "Apply XXE", variant: "tertiary", size: "small" });
  xxeBtn.addEventListener("click", async () => {
    const result = await showInputModal(caido, {
      title: "Apply XXE Payload",
      fields: [{ name: "url", label: "OOB Server URL", type: "text", placeholder: "http://your-server.com/xxe.dtd", required: true }],
      confirmLabel: "Apply",
    });
    if (result?.url) {
      try {
        const response = await caido.backend.applyXXE(editor.value, result.url);
        if (response.success && response.data) {
          editor.value = response.data;
          updateHighlight();
          saveToHistory(editor.value);
          caido.window.showToast("XXE payload applied.", { variant: "success" });
        } else {
          caido.window.showToast(`Failed: ${response.error?.message || "Unknown error"}`, { variant: "error" });
        }
      } catch (err) {
        caido.window.showToast("Failed to apply XXE.", { variant: "error" });
      }
    }
  });
  attackGrid.appendChild(xxeBtn);

  const xsltBtn = caido.ui.button({ label: "Apply XSLT", variant: "tertiary", size: "small" });
  xsltBtn.addEventListener("click", async () => {
    const result = await showInputModal(caido, {
      title: "Apply XSLT Payload",
      fields: [{ name: "payload", label: "XSLT Content", type: "textarea", placeholder: "<xsl:stylesheet ...>", required: true }],
      confirmLabel: "Apply",
    });
    if (result?.payload) {
      try {
        const response = await caido.backend.applyXSLT(editor.value, result.payload);
        if (response.success && response.data) {
          editor.value = response.data;
          updateHighlight();
          saveToHistory(editor.value);
          caido.window.showToast("XSLT payload applied.", { variant: "success" });
        } else {
          caido.window.showToast(`Failed: ${response.error?.message || "Unknown error"}`, { variant: "error" });
        }
      } catch (err) {
        caido.window.showToast("Failed to apply XSLT.", { variant: "error" });
      }
    }
  });
  attackGrid.appendChild(xsltBtn);

  // XSW Card
  const xswCard = document.createElement("div");
  xswCard.className = "saml-card";
  sidebar.appendChild(xswCard);

  const xswTitle = document.createElement("span");
  xswTitle.className = "saml-card-title";
  xswTitle.textContent = "XSW Attacks";
  xswCard.appendChild(xswTitle);

  const xswGrid = document.createElement("div");
  xswGrid.className = "saml-button-grid";
  xswCard.appendChild(xswGrid);

  for (let i = 1; i <= 8; i++) {
    const btn = caido.ui.button({ label: `XSW${i}`, variant: "tertiary", size: "small" });
    btn.addEventListener("click", async () => {
      const xml = editor.value;
      if (!xml) return;
      try {
        const response = await caido.backend.applyXSW(xml, i);
        if (response.success && response.data) {
          editor.value = response.data;
          updateHighlight();
          saveToHistory(editor.value);
          caido.window.showToast(`XSW${i} applied.`, { variant: "info" });
        } else {
          caido.window.showToast(`Failed: ${response.error?.message || "Unknown error"}`, { variant: "error" });
        }
      } catch (err) {
        caido.window.showToast(`Failed to apply XSW${i}.`, { variant: "error" });
      }
    });
    xswGrid.appendChild(btn);
  }

  // ========== Certificate Manager Tab ==========
  const certManager = document.createElement("div");
  certManager.className = "cert-manager";
  certTabContent.appendChild(certManager);

  const certActionsBar = document.createElement("div");
  certActionsBar.className = "cert-actions-bar";
  certManager.appendChild(certActionsBar);

  const importCertBtn = caido.ui.button({ label: "Import Certificate", variant: "primary", size: "small" });
  const createCertBtn = caido.ui.button({ label: "Create Self-Signed", variant: "secondary", size: "small" });
  const exportCertBtn = caido.ui.button({ label: "Export", variant: "tertiary", size: "small" });
  const cloneCertBtn = caido.ui.button({ label: "Clone", variant: "tertiary", size: "small" });
  const deleteCertBtn = caido.ui.button({ label: "Delete", variant: "tertiary", size: "small" });
  certActionsBar.append(importCertBtn, createCertBtn, exportCertBtn, cloneCertBtn, deleteCertBtn);

  const certLayout = document.createElement("div");
  certLayout.className = "cert-layout";
  certManager.appendChild(certLayout);

  // Left panel - Certificate list
  const certListPanel = document.createElement("div");
  certListPanel.className = "cert-panel";
  certLayout.appendChild(certListPanel);

  const certListTitle = document.createElement("div");
  certListTitle.className = "cert-panel-title";
  certListTitle.innerHTML = '<i class="fas fa-key"></i> Certificates';
  certListPanel.appendChild(certListTitle);

  const certList = document.createElement("div");
  certList.className = "cert-list";
  certListPanel.appendChild(certList);

  // Right panel - Certificate details
  const certDetailsPanel = document.createElement("div");
  certDetailsPanel.className = "cert-panel";
  certLayout.appendChild(certDetailsPanel);

  const certDetailsTitle = document.createElement("div");
  certDetailsTitle.className = "cert-panel-title";
  certDetailsTitle.innerHTML = '<i class="fas fa-info-circle"></i> Certificate Details';
  certDetailsPanel.appendChild(certDetailsTitle);

  const certDetails = document.createElement("div");
  certDetails.className = "cert-details";
  certDetailsPanel.appendChild(certDetails);

  let certificates: Certificate[] = [];
  let selectedCertId: string | null = null;

  refreshCerts = async () => {
    const response = await caido.backend.getCertificates();
    if (response.success && response.data) {
      certificates = response.data;
      renderCertList();
      if (selectedCertId) {
        const cert = certificates.find(c => c.id === selectedCertId);
        if (cert) renderCertDetails(cert);
        else {
          selectedCertId = null;
          renderCertDetails(null);
        }
      }
    }
  };

  renderCertList = () => {
    certList.innerHTML = "";
    if (certificates.length === 0) {
      certList.innerHTML = `
        <div class="cert-empty">
          <i class="fas fa-certificate"></i>
          <p>No certificates yet</p>
          <p style="font-size: 12px;">Import or create a certificate to get started</p>
        </div>
      `;
      return;
    }
    certificates.forEach(cert => {
      const item = document.createElement("div");
      item.className = `cert-item ${cert.id === selectedCertId ? 'selected' : ''}`;
      item.innerHTML = `
        <div class="cert-item-name">${cert.name}</div>
        <div class="cert-item-subject">${cert.subject}</div>
        <div class="cert-item-meta">
          <span>Valid: ${new Date(cert.validFrom).toLocaleDateString()} - ${new Date(cert.validTo).toLocaleDateString()}</span>
          <span class="cert-item-badge ${cert.privateKeyPem ? 'has-key' : 'no-key'}">${cert.privateKeyPem ? 'Has Key' : 'No Key'}</span>
        </div>
      `;
      item.addEventListener("click", () => {
        selectedCertId = cert.id;
        renderCertList();
        renderCertDetails(cert);
      });
      certList.appendChild(item);
    });
  };

  renderCertDetails = (cert: Certificate | null) => {
    if (!cert) {
      certDetails.innerHTML = `
        <div class="cert-empty">
          <i class="fas fa-hand-pointer"></i>
          <p>Select a certificate</p>
        </div>
      `;
      return;
    }
    certDetails.innerHTML = `
      <div class="cert-detail-row"><div class="cert-detail-label">Name</div><div class="cert-detail-value">${cert.name}</div></div>
      <div class="cert-detail-row"><div class="cert-detail-label">Subject</div><div class="cert-detail-value">${cert.subject}</div></div>
      <div class="cert-detail-row"><div class="cert-detail-label">Issuer</div><div class="cert-detail-value">${cert.issuer}</div></div>
      <div class="cert-detail-row"><div class="cert-detail-label">Serial Number</div><div class="cert-detail-value">${cert.serialNumber}</div></div>
      <div class="cert-detail-row"><div class="cert-detail-label">Valid From</div><div class="cert-detail-value">${new Date(cert.validFrom).toLocaleString()}</div></div>
      <div class="cert-detail-row"><div class="cert-detail-label">Valid To</div><div class="cert-detail-value">${new Date(cert.validTo).toLocaleString()}</div></div>
      <div class="cert-detail-row"><div class="cert-detail-label">Has Private Key</div><div class="cert-detail-value">${cert.privateKeyPem ? 'Yes' : 'No'}</div></div>
      <div class="cert-pem-container">
        <div class="cert-pem-label">Certificate PEM</div>
        <div class="cert-pem-content">${cert.pem}</div>
      </div>
      ${cert.privateKeyPem ? `
        <div class="cert-pem-container">
          <div class="cert-pem-label">Private Key PEM</div>
          <div class="cert-pem-content">${cert.privateKeyPem}</div>
        </div>
      ` : ''}
    `;
  };

  importCertBtn.addEventListener("click", async () => {
    const result = await showInputModal(caido, {
      title: "Import Certificate",
      fields: [
        { name: "pem", label: "Certificate PEM", type: "textarea", placeholder: "-----BEGIN CERTIFICATE-----\n...", required: true },
        { name: "privateKey", label: "Private Key PEM (optional)", type: "textarea", placeholder: "-----BEGIN PRIVATE KEY-----\n...", required: false },
      ],
      confirmLabel: "Import",
    });
    if (result?.pem) {
      const response = await caido.backend.importCertificate(result.pem, result.privateKey || undefined);
      if (response.success) {
        caido.window.showToast("Certificate imported.", { variant: "success" });
        refreshCerts();
      } else {
        caido.window.showToast(`Import failed: ${response.error?.message}`, { variant: "error" });
      }
    }
  });

  createCertBtn.addEventListener("click", async () => {
    const result = await showInputModal(caido, {
      title: "Create Self-Signed Certificate",
      fields: [{ name: "subject", label: "Common Name (CN)", type: "text", placeholder: "example.com", required: true }],
      confirmLabel: "Create",
    });
    if (result?.subject) {
      const response = await caido.backend.createCertificate(result.subject);
      if (response.success) {
        caido.window.showToast("Certificate created.", { variant: "success" });
        refreshCerts();
      } else {
        caido.window.showToast(`Creation failed: ${response.error?.message}`, { variant: "error" });
      }
    }
  });

  exportCertBtn.addEventListener("click", () => {
    if (!selectedCertId) {
      caido.window.showToast("Select a certificate first.", { variant: "warning" });
      return;
    }
    const cert = certificates.find(c => c.id === selectedCertId);
    if (!cert) return;
    const content = cert.privateKeyPem ? `${cert.pem}\n${cert.privateKeyPem}` : cert.pem;
    const blob = new Blob([content], { type: "application/x-pem-file" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cert.name.replace(/[^a-z0-9]/gi, '_')}.pem`;
    a.click();
    URL.revokeObjectURL(url);
    caido.window.showToast("Certificate exported.", { variant: "success" });
  });

  cloneCertBtn.addEventListener("click", async () => {
    if (!selectedCertId) {
      caido.window.showToast("Select a certificate first.", { variant: "warning" });
      return;
    }
    const response = await caido.backend.cloneCertificate(selectedCertId);
    if (response.success) {
      caido.window.showToast("Certificate cloned.", { variant: "success" });
      refreshCerts();
    } else {
      caido.window.showToast(`Clone failed: ${response.error?.message}`, { variant: "error" });
    }
  });

  deleteCertBtn.addEventListener("click", async () => {
    if (!selectedCertId) {
      caido.window.showToast("Select a certificate first.", { variant: "warning" });
      return;
    }
    const confirmed = await showConfirmModal(caido, "Delete this certificate?", { title: "Confirm Delete", confirmLabel: "Delete" });
    if (confirmed) {
      const response = await caido.backend.deleteCertificate(selectedCertId);
      if (response.success) {
        selectedCertId = null;
        caido.window.showToast("Certificate deleted.", { variant: "info" });
        refreshCerts();
        renderCertDetails(null);
      } else {
        caido.window.showToast(`Delete failed: ${response.error?.message}`, { variant: "error" });
      }
    }
  });

  renderCertDetails(null);

  return {
    element: container,
    refresh: () => {},
    setXML: (xml: string) => {
      editor.value = xml;
      updateHighlight();
      saveToHistory(xml);
    }
  };
};
