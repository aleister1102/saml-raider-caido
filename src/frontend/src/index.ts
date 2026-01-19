import type { Caido } from "@caido/sdk-frontend";
import type { SAMLBackendAPI } from "../../shared/types";
import { findSAML } from "./utils/saml";
import { createDashboard } from "./components/Dashboard";

export const init = (caido: Caido<SAMLBackendAPI>) => {
  const SIDEBAR_PATH = "/saml-raider";
  
  const dashboard = createDashboard(caido);

  caido.navigation.addPage(SIDEBAR_PATH, {
    body: dashboard.element,
    onEnter: dashboard.refresh,
  });

  caido.sidebar.registerItem("SAML Raider", SIDEBAR_PATH, {
    icon: "fas fa-mask",
    group: "Plugins",
  });

  const condition = (data: any): boolean => {
    if (!data?.raw) return false;
    return !!findSAML(data.raw);
  };

  const viewMode = {
    label: "SAML",
    view: {
      component: (container: HTMLElement, data: any) => {
        const saml = findSAML(data.raw);
        if (!saml) {
          container.textContent = "Not a SAML message";
          return;
        }

        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.height = "100%";
        container.style.padding = "10px";
        container.style.overflow = "auto";

        const info = document.createElement("div");
        info.style.marginBottom = "10px";
        info.style.padding = "5px";
        info.style.background = "var(--bg-secondary)";
        info.style.borderRadius = "4px";
        info.innerHTML = `<b>Binding:</b> ${saml.binding} | <b>Parameter:</b> ${saml.parameter}`;
        container.appendChild(info);

        const pre = document.createElement("pre");
        pre.style.margin = "0";
        pre.style.flex = "1";
        pre.style.fontFamily = "monospace";
        pre.textContent = "Decoding...";
        container.appendChild(pre);

        caido.backend.decodeSAML(saml.raw, saml.binding).then((response) => {
          if (response.success && response.data) {
            pre.textContent = response.data;
            dashboard.setXML(response.data);
          } else {
            const errorMsg = response.error?.message || "Unknown error";
            pre.textContent = "Error decoding SAML: " + errorMsg;
          }
        }).catch((err) => {
          pre.textContent = "Error decoding SAML: " + err;
        });
      },
    },
    condition,
  };

  if (caido.httpHistory) {
    caido.httpHistory.addRequestViewMode(viewMode);
    // @ts-ignore
    if (caido.httpHistory.addResponseViewMode) {
      // @ts-ignore
      caido.httpHistory.addResponseViewMode(viewMode);
    }
  }

  // Register command to open SAML Raider UI
  const OPEN_UI_COMMAND = "saml-raider.openUI";
  caido.commands.register(OPEN_UI_COMMAND, {
    name: "SAML Raider: Open Dashboard",
    run: () => {
      caido.navigation.goTo(SIDEBAR_PATH);
    },
  });
  caido.commandPalette.register(OPEN_UI_COMMAND);

  const REMOVE_SIGNATURE_COMMAND = "saml-raider.removeSignature";
  caido.commands.register(REMOVE_SIGNATURE_COMMAND, {
    name: "SAML Raider: Remove Signatures",
    run: async (context: any) => {
      let request;
      if (context.type === "RequestContext") {
        request = context.request;
      } else if (context.type === "RequestRowContext" && context.requests.length > 0) {
        request = context.requests[0];
      }

      if (request) {
        const raw = request.getRaw().toText();
        const saml = findSAML(raw);
        if (saml) {
          try {
            const decodedResponse = await caido.backend.decodeSAML(saml.raw, saml.binding);
            if (!decodedResponse.success || !decodedResponse.data) {
              const errorMsg = decodedResponse.error?.message || "Failed to decode SAML";
              caido.window.showToast(errorMsg, { variant: "error" });
              return;
            }

            const strippedResponse = await caido.backend.removeSignatures(decodedResponse.data);
            if (!strippedResponse.success || !strippedResponse.data) {
              const errorMsg = strippedResponse.error?.message || "Failed to remove signatures";
              caido.window.showToast(errorMsg, { variant: "error" });
              return;
            }

            const encodedResponse = await caido.backend.encodeSAML(strippedResponse.data, saml.binding);
            if (!encodedResponse.success || !encodedResponse.data) {
              const errorMsg = encodedResponse.error?.message || "Failed to encode SAML";
              caido.window.showToast(errorMsg, { variant: "error" });
              return;
            }
            
            // Replace the parameter
            const parts = raw.split("\r\n\r\n");
            let head = parts[0];
            let body = parts[1] || "";

            // Check if it's in body or query
            if (body.includes(saml.parameter)) {
              const params = new URLSearchParams(body);
              params.set(saml.parameter, encodedResponse.data);
              body = params.toString();
            } else {
              const urlParts = head.split(" ");
              if (urlParts.length > 1) {
                const url = new URL(urlParts[1], "http://dummy");
                url.searchParams.set(saml.parameter, encodedResponse.data);
                urlParts[1] = url.pathname + url.search;
                head = urlParts.join(" ");
              }
            }

            const newRaw = head + "\r\n\r\n" + body;
            
            // @ts-ignore
            if (caido.replay) {
              const session = await caido.replay.createSession({
                raw: newRaw,
                host: request.getHost(),
                port: request.getPort(),
                tls: request.getTls(),
              });
              caido.window.showToast("Signature removed! Sent to Replay.", { variant: "success" });
              caido.navigation.goTo(`/replay/${session.getId()}`);
            }
          } catch (err) {
            caido.log.error("Failed to remove signature: " + err);
            caido.window.showToast("Failed to remove signature.", { variant: "error" });
          }
        } else {
          caido.window.showToast("No SAML message found in request.", { variant: "warning" });
        }
      }
    },
  });

  caido.menu.registerItem({
    type: "Request",
    commandId: REMOVE_SIGNATURE_COMMAND,
  });
  caido.menu.registerItem({
    type: "RequestRow",
    commandId: REMOVE_SIGNATURE_COMMAND,
  });

  caido.log.info("SAML Raider frontend initialized.");
};
