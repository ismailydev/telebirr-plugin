import { ConfigPlugin, withAndroidManifest, AndroidConfig } from '@expo/config-plugins';
import { TelebirrPluginConfig } from '../types';

/**
 * Adds required permissions and activities to AndroidManifest.xml
 */
export const withTelebirrManifest: ConfigPlugin<Required<TelebirrPluginConfig>> = (config, pluginConfig) => {
  return withAndroidManifest(config, (cfg) => {
    const { modResults } = cfg;
    
    if (pluginConfig.enableLogging) {
      console.log('Telebirr Plugin: Configuring Android manifest');
    }
    
    // Add required permissions
    addTelebirrPermissions(modResults);
    
    // Add Telebirr activity declarations
    addTelebirrActivities(modResults, pluginConfig);
    
    return cfg;
  });
};

/**
 * Adds required permissions for Telebirr SDK
 */
function addTelebirrPermissions(androidManifest: AndroidConfig.Manifest.AndroidManifest) {
  const requiredPermissions = [
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.READ_EXTERNAL_STORAGE',
  ];
  
  requiredPermissions.forEach(permission => {
    AndroidConfig.Permissions.addPermission(androidManifest, permission);
  });
}

/**
 * Adds Telebirr activity declarations to the manifest
 */
function addTelebirrActivities(
  androidManifest: AndroidConfig.Manifest.AndroidManifest,
  pluginConfig: Required<TelebirrPluginConfig>
) {
  const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
  
  // Add metadata for Telebirr configuration
  AndroidConfig.Manifest.addMetaDataItemToMainApplication(
    mainApplication,
    'com.telebirr.app_id',
    pluginConfig.appId
  );
  
  AndroidConfig.Manifest.addMetaDataItemToMainApplication(
    mainApplication,
    'com.telebirr.short_code',
    pluginConfig.shortCode
  );
  
  AndroidConfig.Manifest.addMetaDataItemToMainApplication(
    mainApplication,
    'com.telebirr.environment',
    pluginConfig.environment
  );
  
  // Add Telebirr SDK activities (these are typically required by the SDK)
  const telebirrActivities = [
    {
      $: {
        'android:name': 'com.huawei.ethiopia.pay.sdk.ui.PaymentActivity',
        'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
        'android:exported': 'false',
        'android:screenOrientation': 'portrait',
      },
    },
    {
      $: {
        'android:name': 'com.huawei.ethiopia.pay.sdk.ui.WebViewActivity',
        'android:theme': '@android:style/Theme.NoTitleBar',
        'android:exported': 'false',
        'android:screenOrientation': 'portrait',
      },
    },
  ];
  
  // Add activities to the application
  if (!mainApplication.activity) {
    mainApplication.activity = [];
  }
  
  telebirrActivities.forEach(activity => {
    // Check if activity already exists to avoid duplicates
    const existingActivity = mainApplication.activity?.find(
      (existingAct: any) => existingAct.$?.['android:name'] === activity.$['android:name']
    );
    
    if (!existingActivity && mainApplication.activity) {
      mainApplication.activity.push(activity as any);
    }
  });
}