# Code Signing

The desktop app is built and published by
[`Release`](../.github/workflows/release.yml). Code signing is **optional and
fail-soft**: if the signing secrets below are not configured, the workflow still
builds and publishes **unsigned** artifacts. Add the secrets when certificates
are available — no code change is required.

The `Detect signing configuration` step in the workflow reports which mode each
platform build used.

## Required repository secrets

Configure these in **Settings → Secrets and variables → Actions** of the
`iarty-ai-desktop` repo.

| Secret | Platform | Purpose |
| --- | --- | --- |
| `CSC_LINK` | macOS | Base64 of the Developer ID Application certificate (`.p12`). |
| `CSC_KEY_PASSWORD` | macOS | Password for the `.p12`. |
| `WIN_CSC_LINK` | Windows | Base64 of the Windows OV/EV code-signing cert (`.p12`/`.pfx`). Falls back to `CSC_LINK` if unset. |
| `WIN_CSC_KEY_PASSWORD` | Windows | Password for the Windows cert. Falls back to `CSC_KEY_PASSWORD`. |
| `APPLE_ID` | macOS | Apple ID email used for notarization. |
| `APPLE_APP_SPECIFIC_PASSWORD` | macOS | App-specific password for that Apple ID. |
| `APPLE_TEAM_ID` | macOS | 10-character Apple Developer Team ID. |

> `.p12` → base64: `base64 -i cert.p12 | pbcopy` (macOS) or
> `certutil -encode cert.p12 cert.b64` (Windows).

## macOS: Developer ID + notarization

1. In the Apple Developer portal, create a **Developer ID Application**
   certificate, export it as `.p12`, and set `CSC_LINK` / `CSC_KEY_PASSWORD`.
2. Create an **app-specific password** for your Apple ID and set `APPLE_ID`,
   `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
3. With all three notarization secrets present, electron-builder signs with the
   hardened runtime (see `build/entitlements.mac.plist`) and notarizes the app.

## Windows: OV/EV certificate

Create a code-signing certificate from a CA (DigiCert, Sectigo, …), export as
`.p12`/`.pfx`, and set `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD`. Without it,
SmartScreen may warn on first launch — choose *More info → Run anyway*.

## Verifying a signed build

- macOS: `codesign -dv --verbose=4 "/Applications/IARTY AI.app"` and
  `spctl -a -vv "/Applications/IARTY AI.app"`.
- Windows: right-click the installer → *Properties → Digital Signatures*.
