# SAML Raider for Caido

A SAML security testing plugin for Caido, inspired by the original [SAMLRaider](https://github.com/CompassSecurity/SAMLRaider) Burp extension.

## Features

### SAML Editor
- **XML Editor** - Edit SAML messages with syntax highlighting and bracket matching
- **Undo/Redo** - Full edit history support
- **Search & Replace** - Find and replace text with case-sensitive toggle
- **XML Validation** - Real-time well-formedness checking with error highlighting
- **Soft Wrap Toggle** - Toggle line wrapping for long XML content

### SAML Information Table
- **Collapsible View** - Expandable panel showing parsed SAML information
- **Resizable** - Drag to resize the information panel
- **Field Details** - Shows Issuer, NameID, Conditions, Attributes, and more
- **Text Selection** - Copy any value from the table

### SAML Decoder Tab
- **URL Decoding** - Decode SAML parameters from URL-encoded format
- **Base64 Decoding** - Decode Base64-encoded SAML messages
- **Deflate Decompression** - Handle DEFLATE+Base64 encoded messages (Redirect binding)
- **Send to Editor** - Send decoded SAML to the main editor for modification

### Security Testing
- **Remove Signatures** - Strip signature elements from SAML responses
- **XSW Attacks (1-8)** - All XML Signature Wrapping attack variants
- **XXE Injection** - Insert XXE payloads into SAML messages
- **XSLT Injection** - Insert XSLT payloads into SAML messages

### Certificate Management
- **Certificate Import** - Import existing X.509 certificates with optional private keys
- **Certificate Storage** - Store and manage multiple certificates
- **Certificate Export** - Export certificates in PEM format
- **Certificate Details** - View certificate subject, issuer, validity dates, and PEM content
- **Send to Manager** - Import certificates directly from SAML responses

### Context Menu Integration
- Right-click on requests containing SAML to decode and edit them

## SDK Limitations

The Caido backend plugin runtime has limitations that affect some functionality:

### Not Available
- **SAML Signing** - Requires cryptographic libraries not available in Caido
- **Certificate Creation** - Requires RSA key generation (not supported)
- **Certificate Cloning** - Requires X.509 certificate manipulation (not supported)

### Why These Limitations Exist

The Caido backend JavaScript runtime **does not support external npm modules**. Import statements for libraries like `node-forge` fail with runtime errors. The build tool does not bundle npm dependencies into the backend code.

### Workarounds Implemented

1. **XML Manipulation** - Uses regex-based string manipulation instead of DOM parsing
2. **Signature Removal** - Uses regex pattern matching
3. **XSW Attacks** - Implemented using string manipulation
4. **Base64 Encoding** - Uses native `atob()`/`btoa()` functions
5. **Deflate Decompression** - Uses browser's native `DecompressionStream` API

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

To publish a new version of the plugin:

1. **Bump Version**: Update the version in `package.json` and `manifest.json`.
2. **Commit and Push**:
   ```bash
   git add package.json manifest.json
   git commit -m "chore: bump version to x.x.x"
   git push origin main
   ```
3. **Create Tag**: Push a tag matching `v*` to trigger the release workflow.
   ```bash
   git tag vx.x.x
   git push origin vx.x.x
   ```
4. **Automated Release**: GitHub Actions will build, sign, and publish the release.

## Architecture

```
src/
├── backend/src/           # Backend (limited by Caido runtime)
│   ├── index.ts           # API endpoint registration
│   ├── saml/
│   │   ├── parser.ts      # SAML decode/encode (regex-based)
│   │   ├── attacks.ts     # XSW, XXE, XSLT attacks (regex-based)
│   │   └── signer.ts      # Signing (disabled - needs crypto)
│   └── certificates/
│       ├── store.ts       # Certificate storage
│       └── operations.ts  # Cert operations (limited - no crypto)
├── frontend/src/          # Frontend (full browser JS support)
│   ├── index.ts           # UI registration
│   ├── components/
│   │   ├── Dashboard.ts   # Main plugin UI with editor, decoder, certs
│   │   ├── InformationTable.ts  # SAML information display
│   │   ├── SearchReplace.ts     # Search/replace functionality
│   │   ├── ValidationStatus.ts  # XML validation display
│   │   ├── CertificateManager.ts # Certificate management
│   │   └── Modal.ts       # Modal dialogs
│   ├── lib/
│   │   ├── parser.ts      # SAML XML parsing
│   │   └── validation.ts  # XML validation logic
│   └── utils/
│       └── saml.ts        # SAML utilities
└── shared/
    └── types.ts           # Shared type definitions
```

## License

MIT
