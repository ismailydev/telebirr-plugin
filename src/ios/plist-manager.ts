import { ConfigPlugin, withInfoPlist } from '@expo/config-plugins';
import { TelebirrPluginConfig } from '../types';

/**
 * Configures iOS Info.plist for Telebirr integration
 */
export const withTelebirrPlist: ConfigPlugin<Required<TelebirrPluginConfig>> = (config, pluginConfig) => {
  return withInfoPlist(config, (cfg) => {
    const { modResults } = cfg;
    
    if (pluginConfig.enableLogging) {
      console.log('Telebirr Plugin: Configuring iOS Info.plist');
    }
    
    // Add Telebirr configuration
    addTelebirrConfiguration(modResults, pluginConfig);
    
    // Add URL schemes for payment callbacks
    addTelebirrURLSchemes(modResults, pluginConfig, config);
    
    // Add required usage descriptions
    addUsageDescriptions(modResults);
    
    return cfg;
  });
};

/**
 * Adds Telebirr-specific configuration to Info.plist
 */
function addTelebirrConfiguration(
  infoPlist: Record<string, any>,
  pluginConfig: Required<TelebirrPluginConfig>
) {
  // Add Telebirr configuration
  infoPlist.TelebirrAppId = pluginConfig.appId;
  infoPlist.TelebirrShortCode = pluginConfig.shortCode;
  infoPlist.TelebirrEnvironment = pluginConfig.environment;
  
  // Add App Transport Security settings for Telebirr
  if (!infoPlist.NSAppTransportSecurity) {
    infoPlist.NSAppTransportSecurity = {};
  }
  
  // Allow arbitrary loads for Telebirr domains (adjust as needed)
  infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads = false;
  
  if (!infoPlist.NSAppTransportSecurity.NSExceptionDomains) {
    infoPlist.NSAppTransportSecurity.NSExceptionDomains = {};
  }
  
  // Add Telebirr domains (adjust based on actual Telebirr domains)
  const telebirrDomains = [
    'telebirr.com',
    'ethiotelecom.et',
  ];
  
  telebirrDomains.forEach(domain => {
    infoPlist.NSAppTransportSecurity.NSExceptionDomains[domain] = {
      NSExceptionAllowsInsecureHTTPLoads: true,
      NSExceptionMinimumTLSVersion: '1.0',
      NSIncludesSubdomains: true,
    };
  });
}

/**
 * Adds URL schemes for Telebirr payment callbacks
 */
function addTelebirrURLSchemes(
  infoPlist: Record<string, any>,
  pluginConfig: Required<TelebirrPluginConfig>,
  config: any
) {
  // Determine URL scheme
  let urlScheme = pluginConfig.customScheme;
  
  if (!urlScheme) {
    // Use bundle identifier as fallback
    urlScheme = config.ios?.bundleIdentifier || config.slug || 'telebirr-app';
  }
  
  if (pluginConfig.enableLogging) {
    console.log(`Telebirr Plugin: Using URL scheme: ${urlScheme}`);
  }
  
  // Ensure CFBundleURLTypes exists
  if (!infoPlist.CFBundleURLTypes) {
    infoPlist.CFBundleURLTypes = [];
  }
  
  // Check if Telebirr URL scheme already exists
  const existingScheme = infoPlist.CFBundleURLTypes.find((urlType: any) =>
    urlType.CFBundleURLSchemes?.includes(urlScheme)
  );
  
  if (!existingScheme) {
    // Add Telebirr URL scheme
    infoPlist.CFBundleURLTypes.push({
      CFBundleURLName: 'com.telebirr.payment',
      CFBundleURLSchemes: [urlScheme],
      CFBundleURLRole: 'Editor',
    });
  }
}

/**
 * Adds required usage descriptions
 */
function addUsageDescriptions(infoPlist: Record<string, any>) {
  // Add usage descriptions that might be required by Telebirr SDK
  const usageDescriptions = {
    NSCameraUsageDescription: 'This app uses the camera for payment verification.',
    NSPhotoLibraryUsageDescription: 'This app accesses the photo library for payment receipts.',
    NSLocationWhenInUseUsageDescription: 'This app uses location for payment security.',
  };
  
  // Only add if not already present
  Object.entries(usageDescriptions).forEach(([key, value]) => {
    if (!infoPlist[key]) {
      infoPlist[key] = value;
    }
  });
}