import { ConfigPlugin, withPlugins } from '@expo/config-plugins';
import { TelebirrPluginConfig } from '../types';
import { withTelebirrFramework } from './framework-manager';
import { withTelebirrPlist } from './plist-manager';
import { withTelebirrIOSBridge } from './bridge-manager';

/**
 * iOS-specific configuration for Telebirr plugin
 */
export const withTelebirrIOS: ConfigPlugin<Required<TelebirrPluginConfig>> = (config, pluginConfig) => {
  if (pluginConfig.enableLogging) {
    console.log('Telebirr Plugin: Configuring iOS platform');
  }
  
  return withPlugins(config, [
    [withTelebirrFramework, pluginConfig],
    [withTelebirrPlist, pluginConfig],
    [withTelebirrIOSBridge, pluginConfig],
  ]);
};