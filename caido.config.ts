import { defineConfig } from "@caido-community/dev";

export default defineConfig({
  id: "saml-raider",
  name: "SAML Raider",
  description: "SAML2 manipulation and certificate management plugin for Caido.",
  version: "1.0.4",
  author: {
    name: "insomnia1102",
    email: "marucube35@gmail.com",
    url: "https://github.com/aleister1102/saml-raider-caido",
  },
  plugins: [
    {
      kind: "frontend",
      id: "saml-raider-frontend",
      name: "SAML Raider Frontend",
      root: "./src/frontend",
      backend: {
        id: "saml-raider-backend",
      },
    },
    {
      kind: "backend",
      id: "saml-raider-backend",
      name: "SAML Raider Backend",
      root: "./src/backend",
    },
  ],
});
