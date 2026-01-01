# Telebirr Plugin

A secure and type-safe Expo Config Plugin for integrating Telebirr payments in React Native applications. This plugin automatically configures native Android and iOS projects with the Telebirr SDK and provides a simple, type-safe API for initiating payments.

## Features

- 🔧 **Automatic Native Configuration**: No manual Android/iOS setup required
- 🔒 **Secure**: Proper validation and secure parameter handling
- 📱 **Environment Support**: Automatic UAT/Production SDK switching
- 🎯 **Type Safe**: Full TypeScript support with proper interfaces
- 🚀 **Expo Compatible**: Works with EAS Build and Expo managed workflow
- 📦 **Dual Entry Points**: Separate config plugin and runtime module for optimal performance

## Installation

### As a Local Dependency

If the plugin is in a sibling directory:

```json
{
  "dependencies": {
    "telebirr-plugin": "file:../telebirr-plugin"
  }
}
```

### Configure Metro Bundler

Add to your `metro.config.js`:

```javascript
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

// Add plugin to watchFolders
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, "../telebirr-plugin"),
];

// Map plugin for resolution
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "telebirr-plugin": path.resolve(__dirname, "../telebirr-plugin"),
};
```

## Configuration

Add the plugin to your `app.config.js`:

```javascript
const telebirrEnv = process.env.EXPO_PUBLIC_TELEBIRR_ENV || "uat";

module.exports = {
  expo: {
    // ... other config
    plugins: [
      [
        "telebirr-plugin",
        {
          // Placeholder values - actual values come from backend at runtime
          appId: "placeholder-app-id",
          shortCode: "00000",
          environment: telebirrEnv, // "uat" or "production"
          enableLogging: process.env.EXPO_PUBLIC_APP_ENV === "development",
          timeout: 120, // Payment timeout in seconds
        },
      ],
    ],
  },
};
```

### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `appId` | `string` | Yes* | Telebirr app ID (placeholder for build-time) |
| `shortCode` | `string` | Yes* | Telebirr short code (placeholder for build-time) |
| `environment` | `"uat" \| "production"` | Yes | SDK environment to use |
| `enableLogging` | `boolean` | No | Enable debug logging (default: `false`) |
| `timeout` | `number` | No | Payment timeout in seconds (default: `120`) |

\* **Note**: `appId` and `shortCode` are required at build-time for plugin configuration, but placeholder values are acceptable. The actual values should be obtained from your backend API at runtime when initiating payments.

### Environment Variables

Add to your `.env` file:

```bash
EXPO_PUBLIC_TELEBIRR_ENV=uat  # or "production"
```

## Usage

### Basic Payment Flow

```typescript
import { TelebirrPaymentManager } from "telebirr-plugin";
import { Alert } from "react-native";

const handlePayment = async () => {
  try {
    // Get payment parameters from your backend
    const paymentParams = {
      appId: "your-app-id-from-backend",
      shortCode: "your-short-code-from-backend",
      receiveCode: "your-receive-code-from-backend",
    };

    const result = await TelebirrPaymentManager.startPayment(paymentParams);

    if (result.code === 0) {
      Alert.alert("Success", "Payment completed successfully!");
    } else if (result.code === -3) {
      Alert.alert("Cancelled", "Payment was cancelled");
    } else if (result.code === -10) {
      Alert.alert("App Not Installed", "Please install Telebirr app");
    } else {
      Alert.alert("Failed", result.message || "Payment failed");
    }
  } catch (error) {
    Alert.alert("Error", error.message);
  }
};
```

### Payment Response Codes

| Code | Description |
|------|-------------|
| `0` | Payment successful |
| `-3` | Payment cancelled by user |
| `-10` | Telebirr app not installed |
| Other negative codes | Payment failed (check `message` for details) |

### TypeScript Types

```typescript
import {
  TelebirrPaymentManager,
  PaymentRequest,
  PaymentResponse,
  TelebirrPaymentError,
} from "telebirr-plugin";

// Payment request interface
interface PaymentRequest {
  appId: string;
  shortCode: string;
  receiveCode: string;
}

// Payment response interface
interface PaymentResponse {
  code: number;
  message: string;
  data?: any;
}
```

### Check if Telebirr App is Installed

```typescript
const isInstalled = await TelebirrPaymentManager.isAppInstalled();

if (!isInstalled) {
  Alert.alert(
    "Telebirr Not Installed",
    "Please install the Telebirr app to make payments."
  );
}
```

## Plugin Architecture

### Structure

```
telebirr-plugin/
├── src/
│   ├── index.ts              # Config plugin entry (for expo prebuild)
│   ├── runtime.ts            # Runtime exports (for React Native)
│   ├── payment-manager.ts    # TelebirrPaymentManager class
│   ├── types.ts              # TypeScript interfaces
│   ├── validation.ts         # Validation utilities
│   ├── android/              # Android config plugins
│   │   ├── aar-manager.ts    # AAR file management
│   │   ├── bridge-manager.ts # Native bridge setup
│   │   ├── gradle-manager.ts # Gradle configuration
│   │   └── manifest-manager.ts # Manifest updates
│   └── ios/                  # iOS config plugins
│       ├── framework-manager.ts # Framework setup
│       ├── bridge-manager.ts    # Native bridge setup
│       └── plist-manager.ts     # Info.plist updates
├── android/
│   └── libs/                 # AAR files (UAT/Prod)
├── ios/
│   └── EthiopiaPaySDK.framework/ # iOS SDK framework
├── app.plugin.js             # Expo config plugin entry point
└── package.json
```

### How It Works

1. **Config Plugin** (`app.config.js` → `expo prebuild`):
   - Automatically copies SDK files to native projects
   - Configures Gradle (Android) and Podfile (iOS)
   - Sets up native bridge modules
   - Updates manifests/plists with required permissions and URL schemes

2. **Runtime Module** (React Native):
   - Provides `TelebirrPaymentManager` class
   - Handles native module communication
   - Type-safe payment API
   - Error handling and validation

3. **Module Resolution**:
   - **Expo Prebuild** (Node.js): Resolves to `build/index.js` (config plugin only)
   - **React Native/Metro**: Resolves to `build/runtime.js` (payment manager)
   - This separation prevents React Native dependencies from loading during build

## Development

### Building the Plugin

```bash
npm install
npm run build
```

### Development Mode

```bash
npm run dev  # Watch mode for TypeScript compilation
```

### Project Setup

1. Install dependencies: `npm install`
2. Build the plugin: `npm run build`
3. In your app, add as local dependency: `"telebirr-plugin": "file:../telebirr-plugin"`
4. Configure Metro bundler (see Installation section)
5. Add plugin to `app.config.js`
6. Run `npx expo prebuild --clean`

## What the Plugin Handles Automatically

### Android
- ✅ Copies AAR files to `android/app/libs/`
- ✅ Updates `build.gradle` with dependencies
- ✅ Updates `AndroidManifest.xml` with permissions
- ✅ Creates native bridge module (`TelebirrPaymentModule`)
- ✅ Registers package in `MainApplication`
- ✅ Configures ProGuard rules

### iOS
- ✅ Copies Framework to `ios/`
- ✅ Updates `Podfile` with framework reference
- ✅ Updates `Info.plist` with URL schemes
- ✅ Creates native bridge module (`ExpoTelebirrPayment`)
- ✅ Configures build settings

## Troubleshooting

### Module Resolution Issues

**Error**: `Unable to resolve module 'telebirr-plugin'`

**Solution**:
1. Ensure `metro.config.js` includes the plugin in `watchFolders` and `extraNodeModules`
2. Rebuild the plugin: `npm run build`
3. Clear Metro cache: `npx expo start --clear`

### Plugin Not Found During Prebuild

**Error**: `Unable to resolve a valid config plugin for telebirr-plugin`

**Solution**:
1. Ensure `app.plugin.js` exists in plugin root
2. Rebuild the plugin: `npm run build`
3. Verify plugin is in `package.json` dependencies

### Native Module Not Found

**Error**: `Native module not found` or `LINKING_ERROR`

**Solution**:
1. Run `npx expo prebuild --clean` to regenerate native projects
2. Ensure you're using a development build (not Expo Go)
3. Rebuild the app: `npm run dev` or `npm run dev:ios`

### SDK Files Missing

**Error**: Build fails with missing SDK files

**Solution**:
1. Verify AAR files exist in `android/libs/` (both UAT and Production)
2. Verify Framework exists in `ios/EthiopiaPaySDK.framework/`
3. Run prebuild again: `npx expo prebuild --clean`

## Requirements

- Expo SDK >= 49
- React Native >= 0.70
- Development build (Expo Go not supported)
- Android SDK with minimum API level 21
- iOS 11.0+

## License

MIT

## Support

For issues or questions, please refer to the integration guide in your project documentation.
