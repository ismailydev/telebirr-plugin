import { ConfigPlugin, withPlugins } from '@expo/config-plugins';
import { TelebirrPluginConfig } from '../types';
import { withTelebirrAAR } from './aar-manager';
import { withTelebirrManifest } from './manifest-manager';
import { withTelebirrGradle } from './gradle-manager';
import { withTelebirrBridge } from './bridge-manager';

/**
 * Android-specific configuration for Telebirr plugin
 */
export const withTelebirrAndroid: ConfigPlugin<Required<TelebirrPluginConfig>> = (config, pluginConfig) => {
  if (pluginConfig.enableLogging) {
    console.log('Telebirr Plugin: Configuring Android platform');
  }
  
  return withPlugins(config, [
    [withTelebirrAAR, pluginConfig],
    [withTelebirrManifest, pluginConfig],
    [withTelebirrGradle, pluginConfig],
    [withTelebirrBridge, pluginConfig],
  ]);
};