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
    .saml-editor-pane {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }
    .saml-editor-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
      position: relative;
      flex: 1;
      min-height: 100px;
      overflow: hidden;
    }
    .saml-editor-wrapper {
      flex: 1;
      position: relative;
      min-height: 0;
      overflow: hidden;
    }
    .saml-controls {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 6px;
      flex-shrink: 0;
    }
    .saml-toolbar-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .saml-toolbar-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .saml-toolbar-center {
      flex: 1;
      justify-content: center;
    }
    .saml-toolbar-right {
      margin-left: auto;
      gap: 8px;
    }
    .saml-controls-bottom {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .saml-toggle-button {
      background: var(--bg-secondary) !important;
      color: var(--text-secondary) !important;
      border: 1px solid var(--border-primary) !important;
    }
    .saml-toggle-button.active {
      background: var(--color-primary) !important;
      color: #fff !important;
      border-color: var(--color-primary) !important;
    }
    .saml-controls-bottom > .search-replace-container {
      width: 100%;
    }
    .saml-table-container {
      min-height: 0;
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .saml-table-header {
      padding: 8px 12px;
      background: var(--color-primary);
      color: #fff;
      border-bottom: 1px solid var(--color-primary);
      font-weight: 600;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      cursor: pointer;
      user-select: none;
    }
    .saml-table-body {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .saml-table-container.collapsed {
      height: 33px !important;
      flex: none !important;
    }
    .saml-table-container.collapsed .saml-table-body {
      display: none;
    }
    .saml-splitter {
      height: 8px;
      cursor: row-resize;
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-left: none;
      border-right: none;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 10;
      transition: background 0.2s;
      flex-shrink: 0;
    }
    .saml-splitter:hover {
      background: var(--border-primary);
    }
    .saml-splitter::after {
      content: "";
      width: 30px;
      height: 2px;
      background: var(--text-secondary);
      border-radius: 1px;
    }
    .saml-splitter-toggle {
      position: absolute;
      right: 10px;
      width: 20px;
      height: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: var(--text-secondary);
      transition: transform 0.3s;
    }
    .saml-splitter-toggle:hover {
      color: var(--text-primary);
    }
    .saml-table-container.collapsed ~ .saml-splitter .saml-splitter-toggle {
      transform: rotate(180deg);
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
    .saml-editor.nowrap {
      white-space: pre;
      word-break: normal;
      overflow-wrap: normal;
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
    .saml-highlight.nowrap {
      white-space: pre;
      word-break: normal;
      overflow-wrap: normal;
      overflow-x: auto;
    }
    .saml-hl-tag { color: #569cd6; }
    .saml-hl-attr { color: #9cdcfe; }
    .saml-hl-val { color: #ce9178; }
    .saml-hl-comment { color: #6a9955; }
    .saml-bracket-match {
      background-color: rgba(255, 215, 0, 0.4);
      border: 1px solid #ffd700;
      border-radius: 2px;
      margin: -1px;
    }
    
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
      min-height: 0;
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
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .saml-button-grid > * {
      flex-shrink: 0;
    }
    .saml-button-group {
      width: 100%;
      margin-bottom: 12px;
    }
    .saml-button-group:last-child {
      margin-bottom: 0;
    }
    .saml-button-group-label {
      font-size: 11px;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .saml-button-group-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .saml-button-group-buttons > * {
      flex-shrink: 0;
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
      font-size: 16px;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }
    .cert-panel-title i {
      color: var(--color-primary);
    }
    .cert-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .cert-item {
      padding: 16px;
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
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .cert-item-subject {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }
    .cert-item-meta {
      font-size: 13px;
      color: var(--text-secondary);
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .cert-item-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 12px;
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
    .cert-btn-disabled {
      opacity: 0.5;
      cursor: not-allowed !important;
      pointer-events: none;
    }
    .cert-btn-disabled button {
      cursor: not-allowed !important;
    }
    .cert-details {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    .cert-detail-row {
      display: flex;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-primary);
    }
    .cert-detail-row:last-child {
      border-bottom: none;
    }
    .cert-detail-label {
      width: 150px;
      font-weight: 600;
      font-size: 14px;
      color: var(--text-secondary);
    }
    .cert-detail-value {
      flex: 1;
      font-size: 14px;
      word-break: break-all;
      font-family: monospace;
      user-select: text;
      cursor: text;
    }
    .cert-pem-container {
      margin-top: 16px;
    }
    .cert-pem-label {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 10px;
    }
    .cert-pem-content {
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      padding: 12px;
      font-family: monospace;
      font-size: 13px;
      max-height: 250px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
      user-select: text;
      cursor: text;
    }
    .cert-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      text-align: center;
      color: var(--text-secondary);
      font-size: 16px;
    }
    .cert-empty i {
      font-size: 64px;
      margin-bottom: 20px;
      opacity: 0.5;
    }
    
    /* Decoder Tab Styles */
    .decoder-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px;
      flex: 1;
      min-height: 0;
    }
    .decoder-input-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .decoder-label {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-primary);
    }
    .decoder-input {
      width: 100%;
      min-height: 120px;
      padding: 12px;
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
      resize: vertical;
    }
    .decoder-input::placeholder {
      color: var(--text-secondary);
    }
    .decoder-controls {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }
    .decoder-info {
      font-size: 12px;
      color: var(--text-secondary);
      margin-left: auto;
    }
    .decoder-output-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
      min-height: 0;
    }
    .decoder-output-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .decoder-output {
      flex: 1;
      min-height: 200px;
      padding: 12px;
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .decoder-output.empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
    }
    .decoder-type-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(var(--color-primary-rgb), 0.2);
      color: var(--color-primary);
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

  const decoderTab = document.createElement("button");
  decoderTab.className = "saml-tab";
  decoderTab.textContent = "Decoder";
  tabs.appendChild(decoderTab);

  const certTab = document.createElement("button");
  certTab.className = "saml-tab";
  certTab.textContent = "Certificates";
  tabs.appendChild(certTab);

  // Tab contents
  const editorTabContent = document.createElement("div");
  editorTabContent.className = "saml-tab-content active";
  container.appendChild(editorTabContent);

  const decoderTabContent = document.createElement("div");
  decoderTabContent.className = "saml-tab-content";
  container.appendChild(decoderTabContent);

  const certTabContent = document.createElement("div");
  certTabContent.className = "saml-tab-content";
  container.appendChild(certTabContent);

  // Helper to switch tabs
  const switchToTab = (tabName: "editor" | "decoder" | "cert") => {
    editorTab.classList.remove("active");
    decoderTab.classList.remove("active");
    certTab.classList.remove("active");
    editorTabContent.classList.remove("active");
    decoderTabContent.classList.remove("active");
    certTabContent.classList.remove("active");
    
    if (tabName === "editor") {
      editorTab.classList.add("active");
      editorTabContent.classList.add("active");
    } else if (tabName === "decoder") {
      decoderTab.classList.add("active");
      decoderTabContent.classList.add("active");
    } else if (tabName === "cert") {
      certTab.classList.add("active");
      certTabContent.classList.add("active");
      refreshCerts();
    }
  };

  // Tab switching
  editorTab.addEventListener("click", () => switchToTab("editor"));
  decoderTab.addEventListener("click", () => switchToTab("decoder"));
  certTab.addEventListener("click", () => switchToTab("cert"));

  // ========== SAML Editor Tab ==========
  const content = document.createElement("div");
  content.className = "saml-content";
  editorTabContent.appendChild(content);

  const editorPane = document.createElement("div");
  editorPane.className = "saml-editor-pane";
  content.appendChild(editorPane);

  const editorContainer = document.createElement("div");
  editorContainer.className = "saml-editor-container";
  editorPane.appendChild(editorContainer);

  const undoBtn = caido.ui.button({ label: "Undo", variant: "tertiary", size: "small" });
  const redoBtn = caido.ui.button({ label: "Redo", variant: "tertiary", size: "small" });
  const prettifyBtn = caido.ui.button({ label: "Prettify", variant: "tertiary", size: "small" });
  const minifyBtn = caido.ui.button({ label: "Minify", variant: "tertiary", size: "small" });

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

  const controls = document.createElement("div");
  controls.className = "saml-controls";
  editorPane.appendChild(controls);

  const toolbarRow = document.createElement("div");
  toolbarRow.className = "saml-toolbar-row";
  controls.appendChild(toolbarRow);

  const leftGroup = document.createElement("div");
  leftGroup.className = "saml-toolbar-group saml-toolbar-left";
  leftGroup.append(prettifyBtn, minifyBtn);
  toolbarRow.appendChild(leftGroup);

  const centerGroup = document.createElement("div");
  centerGroup.className = "saml-toolbar-group saml-toolbar-center";
  centerGroup.append(undoBtn, redoBtn);
  toolbarRow.appendChild(centerGroup);

  const wrapToggle = caido.ui.button({ label: "Wrap", variant: "tertiary", size: "small" });
  wrapToggle.classList.add("saml-toggle-button");
  
  const rightGroup = document.createElement("div");
  rightGroup.className = "saml-toolbar-group saml-toolbar-right";
  rightGroup.appendChild(wrapToggle);
  toolbarRow.appendChild(rightGroup);

  const controlsBottom = document.createElement("div");
  controlsBottom.className = "saml-controls-bottom";
  controls.appendChild(controlsBottom);

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

  // Bracket matching state
  let bracketMatchPositions: { open: number; close: number } | null = null;

  /**
   * Find matching angle bracket for XML tags
   * Returns positions of both brackets if cursor is on < or >
   */
  const findMatchingBracket = (text: string, cursorPos: number): { open: number; close: number } | null => {
    const charAtCursor = text[cursorPos];
    const charBefore = cursorPos > 0 ? text[cursorPos - 1] : "";

    // Check if cursor is on or after a bracket
    let bracketPos = -1;
    let bracketChar = "";

    if (charAtCursor === "<") {
      bracketPos = cursorPos;
      bracketChar = "<";
    } else if (charAtCursor === ">") {
      bracketPos = cursorPos;
      bracketChar = ">";
    } else if (charBefore === "<") {
      bracketPos = cursorPos - 1;
      bracketChar = "<";
    } else if (charBefore === ">") {
      bracketPos = cursorPos - 1;
      bracketChar = ">";
    }

    if (bracketPos === -1) return null;

    if (bracketChar === "<") {
      // Find matching >
      let depth = 0;
      for (let i = bracketPos; i < text.length; i++) {
        if (text[i] === "<") depth++;
        else if (text[i] === ">") {
          depth--;
          if (depth === 0) {
            return { open: bracketPos, close: i };
          }
        }
      }
    } else if (bracketChar === ">") {
      // Find matching <
      let depth = 0;
      for (let i = bracketPos; i >= 0; i--) {
        if (text[i] === ">") depth++;
        else if (text[i] === "<") {
          depth--;
          if (depth === 0) {
            return { open: i, close: bracketPos };
          }
        }
      }
    }

    return null;
  };

  /**
   * Update bracket matching based on cursor position
   */
  const updateBracketMatch = () => {
    const cursorPos = editor.selectionStart;
    bracketMatchPositions = findMatchingBracket(editor.value, cursorPos);
    updateHighlight();
  };

  updateHighlight = () => {
    const rawText = editor.value;
    
    // Build the highlighted text with bracket matching
    let result = "";
    let i = 0;
    
    while (i < rawText.length) {
      const char = rawText[i];
      const escapedChar = char === "&" ? "&amp;" : char === "<" ? "&lt;" : char === ">" ? "&gt;" : char;
      
      // Check if this position is a matched bracket
      const isOpenBracket = bracketMatchPositions && i === bracketMatchPositions.open;
      const isCloseBracket = bracketMatchPositions && i === bracketMatchPositions.close;
      
      if (isOpenBracket || isCloseBracket) {
        result += `<span class="saml-bracket-match">${escapedChar}</span>`;
      } else {
        result += escapedChar;
      }
      i++;
    }
    
    // Apply syntax highlighting
    result = result.replace(/(&lt;\/?[a-zA-Z0-9:-]+)/g, '<span class="saml-hl-tag">$1</span>');
    result = result.replace(/([a-zA-Z0-9:-]+)(=)(&quot;.*?&quot;)/g, '<span class="saml-hl-attr">$1</span>$2<span class="saml-hl-val">$3</span>');
    result = result.replace(/(&lt;!--.*?--&gt;)/g, '<span class="saml-hl-comment">$1</span>');
    
    highlight.innerHTML = result;
  };

  saveToHistory(placeholderSAML);
  updateHighlight();
  updateUndoRedoButtons();

  const recordChange = () => {
    updateHighlight();
    saveToHistory(editor.value);
  };

  editor.addEventListener("input", recordChange);
  editor.addEventListener("scroll", () => {
    highlight.scrollTop = editor.scrollTop;
    highlight.scrollLeft = editor.scrollLeft;
  });
  highlight.addEventListener("scroll", () => {
    editor.scrollTop = highlight.scrollTop;
    editor.scrollLeft = highlight.scrollLeft;
  });

  // Bracket matching on cursor position change
  editor.addEventListener("click", updateBracketMatch);
  editor.addEventListener("keyup", (e: KeyboardEvent) => {
    // Update on arrow keys, home, end, etc.
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(e.key)) {
      updateBracketMatch();
    }
  });
  editor.addEventListener("focus", updateBracketMatch);
  editor.addEventListener("blur", () => {
    // Clear bracket match when editor loses focus
    bracketMatchPositions = null;
    updateHighlight();
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

  const searchReplace = createSearchReplaceComponent(caido, editor, highlight, recordChange);
  const validationStatus = createValidationStatus(caido, editor, { debounceDelay: 500 });

  controlsBottom.appendChild(searchReplace.element);
  controlsBottom.appendChild(validationStatus.element);

  const splitter = document.createElement("div");
  splitter.className = "saml-splitter";
  editorPane.appendChild(splitter);

  const toggle = document.createElement("div");
  toggle.className = "saml-splitter-toggle";
  toggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
  splitter.appendChild(toggle);

  const tableContainer = document.createElement("div");
  tableContainer.className = "saml-table-container";
  editorPane.appendChild(tableContainer);

  const tableHeader = document.createElement("div");
  tableHeader.className = "saml-table-header";
  tableHeader.innerHTML = '<i class="fas fa-table"></i> SAML Information';
  tableContainer.appendChild(tableHeader);

  const tableBody = document.createElement("div");
  tableBody.className = "saml-table-body";
  tableContainer.appendChild(tableBody);
  
  const informationTable = createInformationTableComponent(caido, editor);
  tableBody.appendChild(informationTable.element);

  // Persistence
  const STORAGE_KEY_HEIGHT = "saml-raider-table-height";
  const STORAGE_KEY_COLLAPSED = "saml-raider-table-collapsed";
  const STORAGE_KEY_WRAP = "saml-raider-wrap";

  let isDragging = false;
  let startY = 0;
  let startHeight = 0;

  const savedHeight = localStorage.getItem(STORAGE_KEY_HEIGHT);
  const savedCollapsed = localStorage.getItem(STORAGE_KEY_COLLAPSED);
  const savedWrap = localStorage.getItem(STORAGE_KEY_WRAP);

  let wrapEnabled = savedWrap !== "false";

  const applyWrap = () => {
    if (wrapEnabled) {
      editor.classList.remove("nowrap");
      highlight.classList.remove("nowrap");
      wrapToggle.classList.add("active");
      wrapToggle.textContent = "Wrap: On";
      wrapToggle.setAttribute("aria-pressed", "true");
      wrapToggle.setAttribute("title", "Text wrap: On");
    } else {
      editor.classList.add("nowrap");
      highlight.classList.add("nowrap");
      wrapToggle.classList.remove("active");
      wrapToggle.textContent = "Wrap: Off";
      wrapToggle.setAttribute("aria-pressed", "false");
      wrapToggle.setAttribute("title", "Text wrap: Off");
    }
    localStorage.setItem(STORAGE_KEY_WRAP, wrapEnabled.toString());
  };

  if (savedHeight) {
    tableContainer.style.height = `${savedHeight}px`;
    tableContainer.style.flex = "none";
  } else {
    tableContainer.style.height = "300px";
    tableContainer.style.flex = "none";
  }

  // Default to collapsed unless explicitly set to false
  const shouldCollapse = savedCollapsed !== "false";
  if (shouldCollapse) {
    tableContainer.classList.add("collapsed");
    toggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
  }

  applyWrap();

  splitter.addEventListener("mousedown", (e) => {
    if (tableContainer.classList.contains("collapsed")) return;
    isDragging = true;
    startY = e.clientY;
    startHeight = tableContainer.offsetHeight;
    document.body.style.cursor = "row-resize";
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const deltaY = startY - e.clientY;
    let newHeight = startHeight + deltaY;
    
    // Bounds
    if (newHeight < 100) newHeight = 100;
    if (newHeight > editorPane.offsetHeight - 150) newHeight = editorPane.offsetHeight - 150;

    tableContainer.style.height = `${newHeight}px`;
    tableContainer.style.flex = "none";
    localStorage.setItem(STORAGE_KEY_HEIGHT, newHeight.toString());
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = "";
    }
  });

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isCollapsed = tableContainer.classList.toggle("collapsed");
    toggle.innerHTML = isCollapsed ? '<i class="fas fa-chevron-up"></i>' : '<i class="fas fa-chevron-down"></i>';
    localStorage.setItem(STORAGE_KEY_COLLAPSED, isCollapsed.toString());
  });

  tableHeader.addEventListener("click", () => {
    const isCollapsed = tableContainer.classList.toggle("collapsed");
    toggle.innerHTML = isCollapsed ? '<i class="fas fa-chevron-up"></i>' : '<i class="fas fa-chevron-down"></i>';
    localStorage.setItem(STORAGE_KEY_COLLAPSED, isCollapsed.toString());
  });

  wrapToggle.addEventListener("click", () => {
    wrapEnabled = !wrapEnabled;
    applyWrap();
  });

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
      recordChange();
    } catch (e) {
      caido.window.showToast("Failed to prettify XML.", { variant: "error" });
    }
  });

  minifyBtn.addEventListener("click", () => {
    editor.value = editor.value.replace(/>\s+</g, "><").trim();
    recordChange();
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

  // Signature Operations Group
  const sigGroup = document.createElement("div");
  sigGroup.className = "saml-button-group";
  attackGrid.appendChild(sigGroup);
  const sigGroupLabel = document.createElement("div");
  sigGroupLabel.className = "saml-button-group-label";
  sigGroupLabel.textContent = "Signature";
  sigGroup.appendChild(sigGroupLabel);
  const sigGroupBtns = document.createElement("div");
  sigGroupBtns.className = "saml-button-group-buttons";
  sigGroup.appendChild(sigGroupBtns);

  const signBtn = caido.ui.button({ label: "Sign", variant: "secondary", size: "small" });
  signBtn.classList.add("cert-btn-disabled");
  signBtn.title = "Not available: Requires cryptographic libraries not supported in Caido runtime";
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
  sigGroupBtns.appendChild(signBtn);

  const removeSigBtn = caido.ui.button({ label: "Remove Signatures", variant: "secondary", size: "small" });
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
  sigGroupBtns.appendChild(removeSigBtn);

  const removeDocSigBtn = caido.ui.button({ label: "Remove Doc Sig", variant: "secondary", size: "small" });
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
  sigGroupBtns.appendChild(removeDocSigBtn);

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
  sigGroupBtns.appendChild(removeAssertionSigBtn);

  // Injection Attacks Group
  const injectionGroup = document.createElement("div");
  injectionGroup.className = "saml-button-group";
  attackGrid.appendChild(injectionGroup);
  const injectionGroupLabel = document.createElement("div");
  injectionGroupLabel.className = "saml-button-group-label";
  injectionGroupLabel.textContent = "Injection";
  injectionGroup.appendChild(injectionGroupLabel);
  const injectionGroupBtns = document.createElement("div");
  injectionGroupBtns.className = "saml-button-group-buttons";
  injectionGroup.appendChild(injectionGroupBtns);

  const xxeBtn = caido.ui.button({ label: "XXE", variant: "tertiary", size: "small" });
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
  injectionGroupBtns.appendChild(xxeBtn);

  const xsltBtn = caido.ui.button({ label: "XSLT", variant: "tertiary", size: "small" });
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
  injectionGroupBtns.appendChild(xsltBtn);

  // Certificate Group
  const certGroup = document.createElement("div");
  certGroup.className = "saml-button-group";
  attackGrid.appendChild(certGroup);
  const certGroupLabel = document.createElement("div");
  certGroupLabel.className = "saml-button-group-label";
  certGroupLabel.textContent = "Certificate";
  certGroup.appendChild(certGroupLabel);
  const certGroupBtns = document.createElement("div");
  certGroupBtns.className = "saml-button-group-buttons";
  certGroup.appendChild(certGroupBtns);

  const sendCertBtn = caido.ui.button({ label: "Extract to Manager", variant: "tertiary", size: "small" });
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
        switchToTab("cert");
      } else {
        caido.window.showToast(`Import failed: ${response.error?.message}`, { variant: "error" });
      }
    } catch (err) {
      caido.window.showToast("Failed to extract certificate.", { variant: "error" });
    }
  });
  certGroupBtns.appendChild(sendCertBtn);

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

  // ========== Decoder Tab ==========
  const decoderContainer = document.createElement("div");
  decoderContainer.className = "decoder-container";
  decoderTabContent.appendChild(decoderContainer);

  // Input section
  const decoderInputSection = document.createElement("div");
  decoderInputSection.className = "decoder-input-section";
  decoderContainer.appendChild(decoderInputSection);

  const decoderInputLabel = document.createElement("div");
  decoderInputLabel.className = "decoder-label";
  decoderInputLabel.textContent = "Encoded SAML (URL-encoded, Base64, or Deflate+Base64)";
  decoderInputSection.appendChild(decoderInputLabel);

  const decoderInput = document.createElement("textarea");
  decoderInput.className = "decoder-input";
  decoderInput.placeholder = "Paste SAMLResponse or SAMLRequest value here...\n\nExamples:\n- URL-encoded: SAMLResponse=PHNhbWxwOlJl...\n- Base64: PHNhbWxwOlJlc3Bv...\n- Full URL: https://example.com/acs?SAMLResponse=...";
  decoderInputSection.appendChild(decoderInput);

  // Controls
  const decoderControls = document.createElement("div");
  decoderControls.className = "decoder-controls";
  decoderInputSection.appendChild(decoderControls);

  const decodeBtn = caido.ui.button({ label: "Decode", variant: "primary" });
  decoderControls.appendChild(decodeBtn);

  const clearBtn = caido.ui.button({ label: "Clear", variant: "tertiary" });
  decoderControls.appendChild(clearBtn);

  const decoderInfo = document.createElement("div");
  decoderInfo.className = "decoder-info";
  decoderInfo.textContent = "Auto-detects encoding format";
  decoderControls.appendChild(decoderInfo);

  // Output section
  const decoderOutputSection = document.createElement("div");
  decoderOutputSection.className = "decoder-output-section";
  decoderContainer.appendChild(decoderOutputSection);

  const decoderOutputHeader = document.createElement("div");
  decoderOutputHeader.className = "decoder-output-header";
  decoderOutputSection.appendChild(decoderOutputHeader);

  const decoderOutputLabel = document.createElement("div");
  decoderOutputLabel.className = "decoder-label";
  decoderOutputLabel.textContent = "Decoded XML";
  decoderOutputHeader.appendChild(decoderOutputLabel);

  const decoderTypeBadge = document.createElement("span");
  decoderTypeBadge.className = "decoder-type-badge";
  decoderTypeBadge.style.display = "none";
  decoderOutputHeader.appendChild(decoderTypeBadge);

  const decoderOutput = document.createElement("div");
  decoderOutput.className = "decoder-output empty";
  decoderOutput.textContent = "Decoded SAML will appear here";
  decoderOutputSection.appendChild(decoderOutput);

  // Send to Editor button (hidden initially)
  const sendToEditorBtn = caido.ui.button({ label: "Send to Editor", variant: "primary" });
  sendToEditorBtn.style.display = "none";
  decoderOutputSection.appendChild(sendToEditorBtn);

  // Decoder functions
  const tryDecodeBase64 = (input: string): string | null => {
    try {
      const decoded = atob(input);
      // Check if it looks like XML
      if (decoded.includes("<") && decoded.includes(">")) {
        return decoded;
      }
      return null;
    } catch {
      return null;
    }
  };

  const tryDecodeDeflate = async (input: string): Promise<string | null> => {
    try {
      const binary = atob(input);
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      
      // Try to decompress using DecompressionStream (Deflate-raw)
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      const decoded = new TextDecoder().decode(result);
      if (decoded.includes("<") && decoded.includes(">")) {
        return decoded;
      }
      return null;
    } catch {
      return null;
    }
  };

  const extractSAMLParam = (input: string): { value: string; type: string } | null => {
    // Try to extract SAMLResponse or SAMLRequest from URL or form data
    const patterns = [
      /SAMLResponse=([^&\s]+)/i,
      /SAMLRequest=([^&\s]+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        const paramName = pattern.source.includes("Response") ? "SAMLResponse" : "SAMLRequest";
        return { value: match[1], type: paramName };
      }
    }
    
    // If no param found, assume the entire input is the value
    return null;
  };

  const decodeSAML = async (input: string): Promise<{ xml: string; type: string; encoding: string } | null> => {
    if (!input.trim()) return null;
    
    let value = input.trim();
    let samlType = "SAML";
    
    // Try to extract from URL/form parameter
    const extracted = extractSAMLParam(value);
    if (extracted) {
      value = extracted.value;
      samlType = extracted.type;
    }
    
    // URL decode if needed
    try {
      const urlDecoded = decodeURIComponent(value);
      if (urlDecoded !== value) {
        value = urlDecoded;
      }
    } catch {
      // Not URL encoded
    }
    
    // Check if already XML
    if (value.trim().startsWith("<") && value.includes("saml")) {
      return { xml: value, type: samlType, encoding: "Plain XML" };
    }
    
    // Try Base64
    const base64Decoded = tryDecodeBase64(value);
    if (base64Decoded && base64Decoded.includes("saml")) {
      return { xml: base64Decoded, type: samlType, encoding: "Base64" };
    }
    
    // Try Deflate + Base64 (common for SAMLRequest)
    const deflateDecoded = await tryDecodeDeflate(value);
    if (deflateDecoded && deflateDecoded.includes("saml")) {
      return { xml: deflateDecoded, type: samlType, encoding: "Deflate + Base64" };
    }
    
    // If Base64 decoded but doesn't contain saml, still return it
    if (base64Decoded) {
      return { xml: base64Decoded, type: samlType, encoding: "Base64" };
    }
    
    return null;
  };

  let decodedXML = "";

  decodeBtn.addEventListener("click", async () => {
    const input = decoderInput.value;
    if (!input.trim()) {
      caido.window.showToast("Please enter encoded SAML data.", { variant: "warning" });
      return;
    }

    const result = await decodeSAML(input);
    
    if (result) {
      decodedXML = result.xml;
      decoderOutput.className = "decoder-output";
      decoderOutput.textContent = result.xml;
      decoderTypeBadge.textContent = `${result.type} (${result.encoding})`;
      decoderTypeBadge.style.display = "inline-block";
      sendToEditorBtn.style.display = "block";
      caido.window.showToast("SAML decoded successfully!", { variant: "success" });
    } else {
      decodedXML = "";
      decoderOutput.className = "decoder-output empty";
      decoderOutput.textContent = "Failed to decode. Check input format.";
      decoderTypeBadge.style.display = "none";
      sendToEditorBtn.style.display = "none";
      caido.window.showToast("Failed to decode SAML data.", { variant: "error" });
    }
  });

  clearBtn.addEventListener("click", () => {
    decoderInput.value = "";
    decodedXML = "";
    decoderOutput.className = "decoder-output empty";
    decoderOutput.textContent = "Decoded SAML will appear here";
    decoderTypeBadge.style.display = "none";
    sendToEditorBtn.style.display = "none";
  });

  sendToEditorBtn.addEventListener("click", () => {
    if (!decodedXML) return;
    
    editor.value = decodedXML;
    updateHighlight();
    saveToHistory(editor.value);
    switchToTab("editor");
    caido.window.showToast("SAML sent to editor!", { variant: "success" });
  });

  // ========== Certificate Manager Tab ==========
  const certManager = document.createElement("div");
  certManager.className = "cert-manager";
  certTabContent.appendChild(certManager);

  const certActionsBar = document.createElement("div");
  certActionsBar.className = "cert-actions-bar";
  certManager.appendChild(certActionsBar);

  const importCertBtn = caido.ui.button({ label: "Import Certificate", variant: "primary", size: "small" });
  const createCertBtn = caido.ui.button({ label: "Create Self-Signed", variant: "secondary", size: "small" });
  createCertBtn.classList.add("cert-btn-disabled");
  createCertBtn.title = "Not available: Requires cryptographic libraries not supported in Caido runtime";
  const exportCertBtn = caido.ui.button({ label: "Export", variant: "tertiary", size: "small" });
  const cloneCertBtn = caido.ui.button({ label: "Clone", variant: "tertiary", size: "small" });
  cloneCertBtn.classList.add("cert-btn-disabled");
  cloneCertBtn.title = "Not available: Requires cryptographic libraries not supported in Caido runtime";
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
