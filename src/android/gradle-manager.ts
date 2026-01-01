import { ConfigPlugin, withAppBuildGradle, withProjectBuildGradle } from '@expo/config-plugins';
import { mergeContents } from '@expo/config-plugins/build/utils/generateCode';
import { TelebirrPluginConfig } from '../types';

/**
 * Configures Android Gradle files for Telebirr SDK
 */
export const withTelebirrGradle: ConfigPlugin<Required<TelebirrPluginConfig>> = (config, pluginConfig) => {
  // Configure app-level build.gradle
  config = withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = addTelebirrDependencies(cfg.modResults.contents, pluginConfig);
    return cfg;
  });
  
  // Configure project-level build.gradle if needed
  config = withProjectBuildGradle(config, (cfg) => {
    cfg.modResults.contents = addTelebirrRepositories(cfg.modResults.contents, pluginConfig);
    return cfg;
  });
  
  return config;
};

/**
 * Adds Telebirr AAR dependency to app/build.gradle
 */
function addTelebirrDependencies(buildGradle: string, pluginConfig: Required<TelebirrPluginConfig>): string {
  if (pluginConfig.enableLogging) {
    console.log('Telebirr Plugin: Adding AAR dependency to app/build.gradle');
  }
  
  // Check if react-native-telebirr-payment is already present in dependencies
  if (buildGradle.includes('react-native-telebirr-payment') || buildGradle.includes('EthiopiaPaySdkModule-prod-release')) {
    if (pluginConfig.enableLogging) {
      console.log('Telebirr Plugin: Original react-native-telebirr-payment detected, skipping AAR dependency to avoid conflicts');
    }
    // Still add repositories block for consistency
    return addRepositoriesBlock(buildGradle, pluginConfig);
  }
  
  let modifiedGradle = buildGradle;
  
  // First, add the AAR dependency
  const aarDependency = `    implementation(name: 'EthiopiaPaySdkModule-release', ext: 'aar')`;
  
  const addDependency = mergeContents({
    tag: 'telebirr-aar-dependency',
    src: modifiedGradle,
    newSrc: aarDependency,
    anchor: /dependencies\s*{/,
    offset: 1,
    comment: '//',
  });
  
  if (addDependency.didMerge) {
    modifiedGradle = addDependency.contents;
    if (pluginConfig.enableLogging) {
      console.log('Telebirr Plugin: Successfully added AAR dependency');
    }
  } else {
    console.warn('Telebirr Plugin: Could not add AAR dependency to build.gradle. Please add manually:');
    console.warn(aarDependency);
  }
  
  // Add repositories block
  return addRepositoriesBlock(modifiedGradle, pluginConfig);
}

/**
 * Adds repositories block with flatDir to android section
 */
function addRepositoriesBlock(buildGradle: string, pluginConfig: Required<TelebirrPluginConfig>): string {
  // Now add the repositories block with flatDir to the android section
  const repositoriesBlock = `    repositories {
        flatDir {
            dirs 'libs'
        }
    }`;
  
  const addRepositories = mergeContents({
    tag: 'telebirr-repositories-block',
    src: buildGradle,
    newSrc: repositoriesBlock,
    anchor: /android\s*{/,
    offset: 1,
    comment: '//',
  });
  
  if (addRepositories.didMerge) {
    if (pluginConfig.enableLogging) {
      console.log('Telebirr Plugin: Successfully added repositories block with flatDir');
    }
    return addRepositories.contents;
  } else {
    console.warn('Telebirr Plugin: Could not add repositories block to android section. Please add manually:');
    console.warn(repositoriesBlock);
    return buildGradle;
  }
}

/**
 * Ensures that the android block has a repositories section
 */
function ensureRepositoriesBlock(buildGradle: string, pluginConfig: Required<TelebirrPluginConfig>): string {
  // This function is no longer needed as we're adding the repositories block directly
  return buildGradle;
}

/**
 * Adds any required repositories to project-level build.gradle
 */
function addTelebirrRepositories(buildGradle: string, pluginConfig: Required<TelebirrPluginConfig>): string {
  if (pluginConfig.enableLogging) {
    console.log('Telebirr Plugin: Checking project-level build.gradle');
  }
  
  // For now, we don't need to add any special repositories at the project level
  // The Telebirr SDK is provided as a local AAR file
  
  return buildGradle;
}

/**
 * Adds ProGuard rules for Telebirr SDK
 */
export function getTelebirrProGuardRules(): string {
  return `
# Telebirr SDK ProGuard rules
-keep class com.huawei.ethiopia.pay.sdk.** { *; }
-keep interface com.huawei.ethiopia.pay.sdk.** { *; }
-dontwarn com.huawei.ethiopia.pay.sdk.**

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep callback interfaces
-keep class * implements com.huawei.ethiopia.pay.sdk.api.core.listener.PayCallback {
    public <methods>;
}
`;
}