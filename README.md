# SAML Raider for Caido

A SAML security testing plugin for Caido, inspired by the original [SAMLRaider](https://github.com/CompassSecurity/SAMLRaider) Burp extension.

## Features

### Working Features

- **SAML Decoding/Encoding** - Decode and encode SAML messages (POST binding)
- **Remove Signatures** - Strip signature elements from SAML responses
- **XSW Attacks (1-8)** - All XML Signature Wrapping attack variants
- **XXE Injection** - Insert XXE payloads into SAML messages
- **XSLT Injection** - Insert XSLT payloads into SAML messages
- **Search & Replace** - Find and replace text in the SAML editor
- **Syntax Highlighting** - XML syntax highlighting in the editor
- **Certificate Import** - Import existing certificates (basic storage)

### Limited Features

- **Redirect Binding** - Partial support (no DEFLATE compression)
- **Certificate Parsing** - Imported certificates are stored but not fully parsed

### Not Available

- **SAML Signing** - Requires cryptographic libraries not available in Caido
- **Certificate Creation** - Requires RSA key generation
- **Certificate Cloning** - Requires X.509 certificate manipulation

## Caido SDK Limitations

The Caido backend plugin runtime has significant limitations that affect this plugin:

### No NPM Module Support

The Caido backend JavaScript runtime **does not support external npm modules**. Import statements like:

```typescript
import forge from "node-forge";
import { XMLParser } from "fast-xml-parser";
import * as pako from "pako";
```

Will fail with errors like:
```
Runtime error: could not load module 'node-forge'
```

The build tool (`@caido-community/dev`) does **not bundle** npm dependencies into the backend code. It leaves ES6 import statements as-is, which the Caido runtime cannot resolve.

### Affected Functionality

| Feature | Required Library | Status |
|---------|-----------------|--------|
| SAML Signing | `node-forge` (RSA, SHA256) | ❌ Not available |
| Certificate Creation | `node-forge` (RSA keygen, X.509) | ❌ Not available |
| Certificate Cloning | `node-forge` (X.509 parsing) | ❌ Not available |
| Certificate Parsing | `node-forge` (X.509 parsing) | ⚠️ Limited (basic storage only) |
| XML Parsing | `fast-xml-parser` | ⚠️ Replaced with regex |
| DEFLATE Compression | `pako` | ❌ Not available |

### Workarounds Implemented

1. **XML Manipulation** - Replaced `fast-xml-parser` with regex-based string manipulation
2. **Signature Removal** - Uses regex pattern matching instead of DOM parsing
3. **XSW Attacks** - Implemented using string manipulation and regex
4. **Base64 Encoding** - Uses native `atob()`/`btoa()` functions

### Future Implementation Options

To restore full functionality, consider these approaches:

#### Option 1: Move Logic to Frontend

The frontend runs in a browser environment with full JavaScript support. Complex operations could be moved to the frontend, though this breaks the backend/frontend separation pattern.

#### Option 2: WebAssembly

Compile cryptographic libraries to WASM and load them in the backend. This requires:
- Building `node-forge` or similar as WASM
- Testing WASM support in Caido's runtime

#### Option 3: Caido SDK Enhancement

Request Caido to:
- Support bundling npm dependencies in backend builds
- Provide built-in cryptographic primitives (`caido:crypto`)
- Add XML parsing utilities (`caido:xml`)

#### Option 4: External Service

Offload cryptographic operations to an external service or local process that the plugin communicates with via HTTP.

## Installation

1. Build the plugin: `bun run build && bun run package`
2. Install `dist/plugin_package.zip` in Caido

## Development

```bash
bun install          # Install dependencies
bun run dev          # Development server
bun run build        # Build plugin
bun run package      # Create distributable zip
bun run typecheck    # Type checking
```

## Releasing

To publish a new version of the plugin, follow these steps:

1. **Bump Version**: Update the version in `package.json` and `manifest.json`.
   ```json
   "version": "1.0.x"
   ```
2. **Commit and Push**:
   ```bash
   git add package.json manifest.json
   git commit -m "chore: bump version to 1.0.x"
   git push origin main
   ```
3. **Create Tag**: Push a tag matching `v*` to trigger the release workflow.
   ```bash
   git tag v1.0.x
   git push origin v1.0.x
   ```
4. **Automated Release**: GitHub Actions will automatically:
   - Build the plugin.
   - Sign the package using the `PRIVATE_KEY` secret.
   - Create a new GitHub release with the signed `plugin_package.zip`.

## Architecture

```
src/
├── backend/src/           # Backend (limited by Caido runtime)
│   ├── index.ts           # API endpoint registration
│   ├── saml/
│   │   ├── parser.ts      # SAML decode/encode (regex-based)
│   │   ├── attacks.ts     # XSW, XXE, XSLT attacks (regex-based)
│   │   └── signer.ts      # Signing (disabled - needs node-forge)
│   └── certificates/
│       ├── store.ts       # Certificate storage (basic)
│       └── operations.ts  # Cert operations (disabled - needs node-forge)
├── frontend/src/          # Frontend (full browser JS support)
│   ├── index.ts           # UI registration
│   └── components/        # Vue/TS components
└── shared/
    └── types.ts           # Shared type definitions
```

## License

MIT
