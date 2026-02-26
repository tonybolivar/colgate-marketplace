# Colgate Marketplace — iOS

Capacitor iOS wrapper for the Colgate Marketplace web app.

> The web app lives on the `main` branch and is deployed at [colgatemarket.com](https://colgatemarket.com).

## Requirements

- macOS with Xcode 14+
- Node.js 18+
- CocoaPods (`brew install cocoapods`)
- Apple Developer account

## Setup

```bash
npm install
npx cap open ios
```

Xcode will open. Under **Signing & Capabilities**, set your Apple Developer account and you're ready to build.

## Development Workflow

After making changes to the web app:

```bash
npm run build
npx cap sync
```

Then build and run from Xcode.

## Bundle ID

`com.colgatemarket.app`

---

© 2026 Tony Bolivar · Built as a TIA Venture · Not affiliated with Colgate University
