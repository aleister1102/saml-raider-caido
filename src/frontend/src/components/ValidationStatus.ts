import type { Caido } from "@caido/sdk-frontend";
import { ValidationEngine, type ValidationResult } from "../lib/validation";

export interface ValidationStatusConfig {
  debounceDelay?: number;
}

export const createValidationStatus = (
  caido: Caido<any>,
  editor: HTMLTextAreaElement,
  config: ValidationStatusConfig = {}
) => {
  const debounceDelay = config.debounceDelay || 500;
  const container = document.createElement("div");
  container.className = "validation-status-container";

  const style = document.createElement("style");
  style.textContent = `
    .validation-status-container {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      font-size: 12px;
      color: var(--text-secondary);
      min-height: 32px;
    }
    .validation-status-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      font-size: 10px;
      font-weight: bold;
    }
    .validation-status-icon.valid {
      background: #4caf50;
      color: white;
    }
    .validation-status-icon.invalid {
      background: #f44336;
      color: white;
    }
    .validation-status-icon.validating {
      background: #ff9800;
      color: white;
      animation: pulse 1s infinite;
    }
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
    .validation-status-text {
      flex: 1;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .validation-status-errors {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 100px;
      overflow-y: auto;
    }
    .validation-error-item {
      padding: 4px 6px;
      background: var(--bg-primary);
      border-left: 3px solid #f44336;
      border-radius: 2px;
      font-size: 11px;
      color: var(--text-primary);
    }
    .validation-error-item.warning {
      border-left-color: #ff9800;
    }
  `;
  container.appendChild(style);

  const statusRow = document.createElement("div");
  statusRow.style.display = "flex";
  statusRow.style.alignItems = "center";
  statusRow.style.gap = "8px";
  statusRow.style.width = "100%";
  container.appendChild(statusRow);

  const icon = document.createElement("div");
  icon.className = "validation-status-icon";
  statusRow.appendChild(icon);

  const text = document.createElement("div");
  text.className = "validation-status-text";
  statusRow.appendChild(text);

  let validationTimeout: NodeJS.Timeout | null = null;
  let currentResult: ValidationResult | null = null;

  /**
   * Update the validation status display
   */
  const updateDisplay = (result: ValidationResult) => {
    currentResult = result;

    if (result.valid) {
      icon.className = "validation-status-icon valid";
      icon.textContent = "✓";
      text.textContent = "Valid SAML XML";
      text.style.color = "var(--text-secondary)";
    } else {
      icon.className = "validation-status-icon invalid";
      icon.textContent = "✕";

      if (result.errors.length === 1) {
        text.textContent = result.errors[0].message;
      } else {
        text.textContent = `${result.errors.length} validation errors`;
      }
      text.style.color = "var(--text-primary)";
    }
  };

  /**
   * Show validating state
   */
  const showValidating = () => {
    icon.className = "validation-status-icon validating";
    icon.textContent = "…";
    text.textContent = "Validating...";
    text.style.color = "var(--text-secondary)";
  };

  /**
   * Perform validation with debounce
   */
  const performValidation = async () => {
    const xml = editor.value;

    if (!xml || xml.trim().length === 0) {
      icon.className = "validation-status-icon";
      icon.textContent = "";
      text.textContent = "Enter SAML XML to validate";
      text.style.color = "var(--text-secondary)";
      return;
    }

    showValidating();

    try {
      const result = await ValidationEngine.validateWithDebounce(xml, debounceDelay);
      updateDisplay(result);
    } catch (e: any) {
      icon.className = "validation-status-icon invalid";
      icon.textContent = "✕";
      text.textContent = "Validation error";
      text.style.color = "var(--text-primary)";
    }
  };

  /**
   * Debounced validation trigger
   */
  const triggerValidation = () => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    validationTimeout = setTimeout(() => {
      performValidation();
    }, debounceDelay);
  };

  // Listen to editor input
  editor.addEventListener("input", triggerValidation);

  // Trigger validation immediately on blur (when editor loses focus)
  const handleBlur = () => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
      validationTimeout = null;
    }
    performValidation();
  };
  editor.addEventListener("blur", handleBlur);

  // Initial validation
  performValidation();

  return {
    element: container,
    validate: performValidation,
    getResult: () => currentResult,
    destroy: () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
      editor.removeEventListener("input", triggerValidation);
      editor.removeEventListener("blur", handleBlur);
    },
  };
};
