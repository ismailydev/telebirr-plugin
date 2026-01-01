import { ConfigPlugin, withPlugins } from "@expo/config-plugins";
import { TelebirrPluginConfig } from "./types";
import { validatePluginConfig, applyConfigDefaults } from "./validation";
import { withTelebirrAndroid } from "./android";
import { withTelebirrIOS } from "./ios";

/**
 * Main Expo Config Plugin for Telebirr payment integration
 *
 * This plugin automatically configures native Android and iOS projects
 * with the necessary Telebirr SDK dependencies, permissions, and bridging code.
 *
 * @param config - Expo config object
 * @param pluginConfig - Telebirr plugin configuration
 * @returns Modified Expo config
 */
const withTelebirr: ConfigPlugin<TelebirrPluginConfig> = (
  config,
  pluginConfig
) => {
  // Validate configuration
  const validation = validatePluginConfig(pluginConfig);
  if (!validation.isValid) {
    throw new Error(
      `Telebirr Plugin Configuration Error:\n${validation.errors.join("\n")}`
    );
  }

  // Log warnings if any
  if (validation.warnings.length > 0) {
    console.warn("Telebirr Plugin Warnings:");
    validation.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  // Apply defaults to configuration
  const fullConfig = applyConfigDefaults(pluginConfig);

  // Log configuration in development mode
  if (fullConfig.enableLogging) {
    console.log("Telebirr Plugin Configuration:", {
      environment: fullConfig.environment,
      enableLogging: fullConfig.enableLogging,
      timeout: fullConfig.timeout,
      // Don't log sensitive data
      appId: fullConfig.appId ? "[CONFIGURED]" : "[MISSING]",
      shortCode: fullConfig.shortCode ? "[CONFIGURED]" : "[MISSING]",
    });
  }

  // Apply platform-specific configurations
  return withPlugins(config, [
    [withTelebirrAndroid, fullConfig],
    [withTelebirrIOS, fullConfig],
  ]);
};

// Export as both default and named export for compatibility
export default withTelebirr;
export { withTelebirr };

// Export types and utilities for consumers (config plugin only)
export * from "./types";
export * from "./validation";
export { withTelebirrAndroid } from "./android";
export { withTelebirrIOS } from "./ios";
