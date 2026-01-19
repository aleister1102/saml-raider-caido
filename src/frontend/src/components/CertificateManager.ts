import type { Caido } from "@caido/sdk-frontend";
import type { SAMLBackendAPI, Certificate } from "../../../shared/types";
import { showInputModal, showConfirmModal } from "./Modal";

export const createCertificateManager = (caido: Caido<SAMLBackendAPI>) => {
  const container = document.createElement("div");
  container.className = "cert-manager";

  const style = document.createElement("style");
  style.textContent = `
    .cert-manager {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .cert-table {
      width: 100%;
      border-collapse: collapse;
    }
    .cert-table th, .cert-table td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid var(--border-primary);
    }
    .cert-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
  `;
  container.appendChild(style);

  const title = document.createElement("h2");
  title.textContent = "Certificate Management";
  container.appendChild(title);

  const actions = document.createElement("div");
  actions.className = "cert-actions";
  container.appendChild(actions);

  const importBtn = caido.ui.button({
    label: "Import Certificate",
    variant: "primary",
    size: "small",
  });
  importBtn.addEventListener("click", async () => {
    const result = await showInputModal(caido, {
      title: "Import Certificate",
      fields: [
        {
          name: "pem",
          label: "Certificate PEM",
          type: "textarea",
          placeholder: "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
          required: true,
        },
        {
          name: "privateKey",
          label: "Private Key PEM (optional)",
          type: "textarea",
          placeholder: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
          required: false,
        },
      ],
      confirmLabel: "Import",
    });
    
    if (result?.pem) {
      try {
        const response = await caido.backend.importCertificate(result.pem, result.privateKey || undefined);
        if (response.success) {
          refresh();
          caido.window.showToast("Certificate imported.", { variant: "success" });
        } else {
          const errorMsg = response.error?.message || "Unknown error";
          caido.window.showToast("Import failed: " + errorMsg, { variant: "error" });
        }
      } catch (err) {
        caido.window.showToast("Import failed: " + err, { variant: "error" });
      }
    }
  });
  actions.appendChild(importBtn);

  const createBtn = caido.ui.button({
    label: "Create New Certificate",
    variant: "secondary",
    size: "small",
  });
  createBtn.addEventListener("click", async () => {
    const result = await showInputModal(caido, {
      title: "Create New Certificate",
      fields: [
        {
          name: "subject",
          label: "Common Name",
          type: "text",
          placeholder: "example.com",
          required: true,
        },
      ],
      confirmLabel: "Create",
    });
    
    if (result?.subject) {
      try {
        const response = await caido.backend.createCertificate(result.subject);
        if (response.success) {
          refresh();
          caido.window.showToast("Certificate created.", { variant: "success" });
        } else {
          const errorMsg = response.error?.message || "Unknown error";
          caido.window.showToast("Creation failed: " + errorMsg, { variant: "error" });
        }
      } catch (err) {
        caido.window.showToast("Creation failed: " + err, { variant: "error" });
      }
    }
  });
  actions.appendChild(createBtn);

  const tableContainer = document.createElement("div");
  container.appendChild(tableContainer);

  const refresh = async () => {
    const response = await caido.backend.getCertificates();
    tableContainer.innerHTML = "";
    
    if (!response.success || !response.data) {
      const errorMsg = response.error?.message || "Failed to load certificates";
      tableContainer.textContent = errorMsg;
      return;
    }

    const certs = response.data;
    
    const table = document.createElement("table");
    table.className = "cert-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Subject</th>
          <th>Valid To</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody")!;
    
    certs.forEach(cert => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${cert.name}</td>
        <td>${cert.subject}</td>
        <td>${new Date(cert.validTo).toLocaleDateString()}</td>
        <td class="row-actions"></td>
      `;
      
      const rowActions = tr.querySelector(".row-actions")!;
      
      const cloneBtn = caido.ui.button({ label: "Clone", variant: "tertiary", size: "small" });
      cloneBtn.addEventListener("click", () => {
        caido.backend.cloneCertificate(cert.id).then((response) => {
          if (response.success) {
            refresh();
            caido.window.showToast("Certificate cloned.", { variant: "success" });
          } else {
            const errorMsg = response.error?.message || "Unknown error";
            caido.window.showToast("Clone failed: " + errorMsg, { variant: "error" });
          }
        });
      });
      rowActions.appendChild(cloneBtn);

      const deleteBtn = caido.ui.button({ label: "Delete", variant: "tertiary", size: "small" });
      deleteBtn.addEventListener("click", async () => {
        const confirmed = await showConfirmModal(caido, "Delete this certificate?", {
          title: "Confirm Delete",
          confirmLabel: "Delete",
        });
        if (confirmed) {
          try {
            const response = await caido.backend.deleteCertificate(cert.id);
            if (response.success) {
              refresh();
              caido.window.showToast("Certificate deleted.", { variant: "info" });
            } else {
              const errorMsg = response.error?.message || "Unknown error";
              caido.window.showToast("Delete failed: " + errorMsg, { variant: "error" });
            }
          } catch (err) {
            caido.window.showToast("Delete failed: " + err, { variant: "error" });
          }
        }
      });
      rowActions.appendChild(deleteBtn);

      tbody.appendChild(tr);
    });
    
    tableContainer.appendChild(table);
  };

  return { element: container, refresh };
};
