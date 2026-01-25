import type { Caido } from "@caido/sdk-frontend";

export interface ModalField {
  name: string;
  label: string;
  type: "text" | "textarea";
  placeholder?: string;
  required?: boolean;
}

export interface ModalOptions {
  title: string;
  fields: ModalField[];
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface ModalResult {
  [key: string]: string;
}

/**
 * Shows a custom modal dialog with input fields.
 * Returns a promise that resolves with field values or null if cancelled.
 */
export const showInputModal = (
  caido: Caido,
  options: ModalOptions
): Promise<ModalResult | null> => {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "saml-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "saml-modal";

    const style = document.createElement("style");
    style.textContent = `
      .saml-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .saml-modal {
        background: var(--bg-secondary);
        border: 1px solid var(--border-primary);
        border-radius: 8px;
        padding: 20px;
        min-width: 400px;
        max-width: 600px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }
      .saml-modal-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 16px;
        color: var(--text-primary);
      }
      .saml-modal-field {
        margin-bottom: 12px;
      }
      .saml-modal-label {
        display: block;
        margin-bottom: 4px;
        font-size: 13px;
        color: var(--text-secondary);
      }
      .saml-modal-input {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid var(--border-primary);
        border-radius: 4px;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 13px;
        box-sizing: border-box;
      }
      .saml-modal-input:focus {
        outline: none;
        border-color: var(--color-primary);
      }
      .saml-modal-textarea {
        min-height: 100px;
        resize: vertical;
        font-family: 'Fira Code', 'Courier New', monospace;
      }
      .saml-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }
    `;
    overlay.appendChild(style);

    const title = document.createElement("div");
    title.className = "saml-modal-title";
    title.textContent = options.title;
    modal.appendChild(title);

    const inputs: Map<string, HTMLInputElement | HTMLTextAreaElement> = new Map();

    options.fields.forEach((field) => {
      const fieldDiv = document.createElement("div");
      fieldDiv.className = "saml-modal-field";

      const label = document.createElement("label");
      label.className = "saml-modal-label";
      label.textContent = field.label + (field.required ? " *" : "");
      fieldDiv.appendChild(label);

      let input: HTMLInputElement | HTMLTextAreaElement;
      if (field.type === "textarea") {
        input = document.createElement("textarea");
        input.className = "saml-modal-input saml-modal-textarea";
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.className = "saml-modal-input";
      }
      input.placeholder = field.placeholder || "";
      fieldDiv.appendChild(input);

      inputs.set(field.name, input);
      modal.appendChild(fieldDiv);
    });

    const actions = document.createElement("div");
    actions.className = "saml-modal-actions";

    const cancelBtn = caido.ui.button({
      label: options.cancelLabel || "Cancel",
      variant: "tertiary",
      size: "small",
    });
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close(null);
      } else if (e.key === "Enter" && !e.shiftKey) {
        // Submit on Enter (unless in textarea with shift)
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== "TEXTAREA") {
          confirmBtn.click();
        }
      }
    };
    document.addEventListener("keydown", handleKeydown);

    const close = (result: ModalResult | null) => {
      overlay.remove();
      document.removeEventListener("keydown", handleKeydown);
      resolve(result);
    };

    cancelBtn.addEventListener("click", () => {
      close(null);
    });

    confirmBtn.addEventListener("click", () => {
      // Check required fields
      for (const field of options.fields) {
        if (field.required) {
          const input = inputs.get(field.name);
          if (!input?.value.trim()) {
            caido.window.showToast(`${field.label} is required.`, { variant: "warning" });
            return;
          }
        }
      }

      const result: ModalResult = {};
      inputs.forEach((input, name) => {
        result[name] = input.value;
      });
      close(result);
    });

    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Focus first input
    const firstInput = inputs.values().next().value;
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 0);
    }

    // Close on overlay click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        close(null);
      }
    });
  });
};

/**
 * Shows a confirmation dialog.
 * Returns a promise that resolves to true if confirmed, false if cancelled.
 */
export const showConfirmModal = (
  caido: Caido,
  message: string,
  options?: { title?: string; confirmLabel?: string; cancelLabel?: string }
): Promise<boolean> => {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "saml-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "saml-modal";

    const style = document.createElement("style");
    style.textContent = `
      .saml-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .saml-modal {
        background: var(--bg-secondary);
        border: 1px solid var(--border-primary);
        border-radius: 8px;
        padding: 20px;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }
      .saml-modal-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 12px;
        color: var(--text-primary);
      }
      .saml-modal-message {
        font-size: 14px;
        color: var(--text-secondary);
        margin-bottom: 16px;
      }
      .saml-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
    `;
    overlay.appendChild(style);

    if (options?.title) {
      const title = document.createElement("div");
      title.className = "saml-modal-title";
      title.textContent = options.title;
      modal.appendChild(title);
    }

    const messageEl = document.createElement("div");
    messageEl.className = "saml-modal-message";
    messageEl.textContent = message;
    modal.appendChild(messageEl);

    const actions = document.createElement("div");
    actions.className = "saml-modal-actions";

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close(false);
      } else if (e.key === "Enter") {
        confirmBtn.click();
      }
    };
    document.addEventListener("keydown", handleKeydown);

    const close = (result: boolean) => {
      overlay.remove();
      document.removeEventListener("keydown", handleKeydown);
      resolve(result);
    };

    const cancelBtn = caido.ui.button({
      label: options?.cancelLabel || "Cancel",
      variant: "tertiary",
      size: "small",
    });
    cancelBtn.addEventListener("click", () => {
      close(false);
    });
    actions.appendChild(cancelBtn);

    const confirmBtn = caido.ui.button({
      label: options?.confirmLabel || "Confirm",
      variant: "primary",
      size: "small",
    });
    confirmBtn.addEventListener("click", () => {
      close(true);
    });
    actions.appendChild(confirmBtn);

    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Focus confirm button
    setTimeout(() => confirmBtn.focus(), 0);

    // Close on overlay click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        close(false);
      }
    });
  });
};
