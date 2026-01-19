import type { Caido } from "@caido/sdk-frontend";
import { SAMLInfoParser, type SAMLInfo } from "../lib/parser";

export const createInformationTableComponent = (
  caido: Caido<any>,
  editor: HTMLTextAreaElement
) => {
  const container = document.createElement("div");
  container.className = "information-table-container";

  const style = document.createElement("style");
  style.textContent = `
    .information-table-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
      height: 100%;
      box-sizing: border-box;
    }

    .information-table-tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--border-primary);
    }

    .information-table-tab {
      padding: 8px 16px;
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 13px;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .information-table-tab:hover {
      color: var(--text-primary);
    }

    .information-table-tab.active {
      color: var(--text-primary);
      border-bottom-color: var(--color-primary);
    }

    .information-table-content {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }

    .information-table-view {
      display: none;
    }

    .information-table-view.active {
      display: block;
    }

    .information-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .information-table th {
      background: var(--bg-secondary);
      color: var(--text-primary);
      padding: 8px;
      text-align: left;
      font-weight: 600;
      border-bottom: 1px solid var(--border-primary);
      position: sticky;
      top: 0;
    }

    .information-table td {
      padding: 8px;
      border-bottom: 1px solid var(--border-primary);
      word-break: break-word;
    }

    .information-table tr:hover {
      background: var(--bg-secondary);
    }

    .information-table-section {
      margin-bottom: 16px;
    }

    .information-table-section-title {
      font-weight: 600;
      color: var(--text-primary);
      padding: 8px;
      background: var(--bg-secondary);
      border-left: 3px solid var(--color-primary);
      margin-bottom: 8px;
    }

    .information-table-row {
      display: flex;
      gap: 16px;
      padding: 8px;
      border-bottom: 1px solid var(--border-primary);
    }

    .information-table-label {
      font-weight: 600;
      color: var(--text-secondary);
      min-width: 120px;
    }

    .information-table-value {
      color: var(--text-primary);
      word-break: break-word;
      flex: 1;
    }

    .information-table-error {
      padding: 16px;
      background: var(--bg-secondary);
      color: var(--text-error, #ff6b6b);
      border-left: 3px solid var(--text-error, #ff6b6b);
      border-radius: 4px;
    }

    .information-table-empty {
      padding: 16px;
      color: var(--text-secondary);
      text-align: center;
    }

    .information-table-badge {
      display: inline-block;
      padding: 2px 8px;
      background: var(--color-primary);
      color: white;
      border-radius: 3px;
      font-size: 11px;
      margin-right: 4px;
    }
  `;
  container.appendChild(style);

  // Tab buttons
  const tabsContainer = document.createElement("div");
  tabsContainer.className = "information-table-tabs";
  container.appendChild(tabsContainer);

  const xmlTabBtn = document.createElement("button");
  xmlTabBtn.className = "information-table-tab active";
  xmlTabBtn.textContent = "XML View";
  tabsContainer.appendChild(xmlTabBtn);

  const tableTabBtn = document.createElement("button");
  tableTabBtn.className = "information-table-tab";
  tableTabBtn.textContent = "Table View";
  tabsContainer.appendChild(tableTabBtn);

  // Content area
  const contentArea = document.createElement("div");
  contentArea.className = "information-table-content";
  container.appendChild(contentArea);

  // XML View (placeholder - will be replaced by actual editor)
  const xmlView = document.createElement("div");
  xmlView.className = "information-table-view active";
  xmlView.innerHTML = "<p style='padding: 16px; color: var(--text-secondary);'>XML view is shown in the editor above</p>";
  contentArea.appendChild(xmlView);

  // Table View
  const tableView = document.createElement("div");
  tableView.className = "information-table-view";
  contentArea.appendChild(tableView);

  /**
   * Render the information table
   */
  const renderTable = (info: SAMLInfo) => {
    tableView.innerHTML = "";

    // Issuer section
    if (info.issuer) {
      const section = document.createElement("div");
      section.className = "information-table-section";
      
      const title = document.createElement("div");
      title.className = "information-table-section-title";
      title.textContent = "Issuer";
      section.appendChild(title);

      const row = document.createElement("div");
      row.className = "information-table-row";
      row.innerHTML = `
        <div class="information-table-label">Issuer:</div>
        <div class="information-table-value">${escapeHtml(info.issuer)}</div>
      `;
      section.appendChild(row);
      tableView.appendChild(section);
    }

    // Assertion ID section
    if (info.assertionId) {
      const section = document.createElement("div");
      section.className = "information-table-section";
      
      const title = document.createElement("div");
      title.className = "information-table-section-title";
      title.textContent = "Assertion";
      section.appendChild(title);

      const row = document.createElement("div");
      row.className = "information-table-row";
      row.innerHTML = `
        <div class="information-table-label">ID:</div>
        <div class="information-table-value">${escapeHtml(info.assertionId)}</div>
      `;
      section.appendChild(row);
      tableView.appendChild(section);
    }

    // Subject section
    if (info.subject.nameId) {
      const section = document.createElement("div");
      section.className = "information-table-section";
      
      const title = document.createElement("div");
      title.className = "information-table-section-title";
      title.textContent = "Subject";
      section.appendChild(title);

      const nameIdRow = document.createElement("div");
      nameIdRow.className = "information-table-row";
      nameIdRow.innerHTML = `
        <div class="information-table-label">NameID:</div>
        <div class="information-table-value">${escapeHtml(info.subject.nameId)}</div>
      `;
      section.appendChild(nameIdRow);

      if (info.subject.format) {
        const formatRow = document.createElement("div");
        formatRow.className = "information-table-row";
        formatRow.innerHTML = `
          <div class="information-table-label">Format:</div>
          <div class="information-table-value">${escapeHtml(info.subject.format)}</div>
        `;
        section.appendChild(formatRow);
      }

      tableView.appendChild(section);
    }

    // Conditions section
    if (info.conditions.notBefore || info.conditions.notOnOrAfter || info.conditions.audiences.length > 0) {
      const section = document.createElement("div");
      section.className = "information-table-section";
      
      const title = document.createElement("div");
      title.className = "information-table-section-title";
      title.textContent = "Conditions";
      section.appendChild(title);

      if (info.conditions.notBefore) {
        const row = document.createElement("div");
        row.className = "information-table-row";
        row.innerHTML = `
          <div class="information-table-label">NotBefore:</div>
          <div class="information-table-value">${escapeHtml(info.conditions.notBefore)}</div>
        `;
        section.appendChild(row);
      }

      if (info.conditions.notOnOrAfter) {
        const row = document.createElement("div");
        row.className = "information-table-row";
        row.innerHTML = `
          <div class="information-table-label">NotOnOrAfter:</div>
          <div class="information-table-value">${escapeHtml(info.conditions.notOnOrAfter)}</div>
        `;
        section.appendChild(row);
      }

      if (info.conditions.audiences.length > 0) {
        const row = document.createElement("div");
        row.className = "information-table-row";
        const audienceBadges = info.conditions.audiences
          .map(a => `<span class="information-table-badge">${escapeHtml(a)}</span>`)
          .join("");
        row.innerHTML = `
          <div class="information-table-label">Audiences:</div>
          <div class="information-table-value">${audienceBadges}</div>
        `;
        section.appendChild(row);
      }

      tableView.appendChild(section);
    }

    // Attributes section
    if (info.attributes.length > 0) {
      const section = document.createElement("div");
      section.className = "information-table-section";
      
      const title = document.createElement("div");
      title.className = "information-table-section-title";
      title.textContent = `Attributes (${info.attributes.length})`;
      section.appendChild(title);

      const table = document.createElement("table");
      table.className = "information-table";
      
      const thead = document.createElement("thead");
      thead.innerHTML = `
        <tr>
          <th>Name</th>
          <th>Value</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      for (const attr of info.attributes) {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${escapeHtml(attr.name)}</td>
          <td>${escapeHtml(attr.value)}</td>
        `;
        tbody.appendChild(row);
      }
      table.appendChild(tbody);
      section.appendChild(table);
      tableView.appendChild(section);
    }

    // Signature section
    const sigSection = document.createElement("div");
    sigSection.className = "information-table-section";
    
    const sigTitle = document.createElement("div");
    sigTitle.className = "information-table-section-title";
    sigTitle.textContent = "Security";
    sigSection.appendChild(sigTitle);

    const sigRow = document.createElement("div");
    sigRow.className = "information-table-row";
    const sigStatus = info.signaturePresent ? "✓ Present" : "✗ Not Present";
    const sigColor = info.signaturePresent ? "var(--color-success, #51cf66)" : "var(--text-error, #ff6b6b)";
    sigRow.innerHTML = `
      <div class="information-table-label">Signature:</div>
      <div class="information-table-value" style="color: ${sigColor};">${sigStatus}</div>
    `;
    sigSection.appendChild(sigRow);
    tableView.appendChild(sigSection);
  };

  /**
   * Update table view based on editor content
   */
  const updateTableView = () => {
    const xml = editor.value;
    
    if (!xml || xml.trim().length === 0) {
      tableView.innerHTML = '<div class="information-table-empty">No SAML XML to display</div>';
      return;
    }

    const info = SAMLInfoParser.parse(xml);
    
    if (!info) {
      tableView.innerHTML = '<div class="information-table-error">Failed to parse SAML XML. Please check the XML syntax.</div>';
      return;
    }

    renderTable(info);
  };

  // Tab switching
  xmlTabBtn.addEventListener("click", () => {
    xmlTabBtn.classList.add("active");
    tableTabBtn.classList.remove("active");
    xmlView.classList.add("active");
    tableView.classList.remove("active");
  });

  tableTabBtn.addEventListener("click", () => {
    tableTabBtn.classList.add("active");
    xmlTabBtn.classList.remove("active");
    tableView.classList.add("active");
    xmlView.classList.remove("active");
    updateTableView();
  });

  // Update table when editor changes
  editor.addEventListener("input", () => {
    if (tableTabBtn.classList.contains("active")) {
      updateTableView();
    }
  });

  return {
    element: container,
    updateTableView,
  };
};

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
