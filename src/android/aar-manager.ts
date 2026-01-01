import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import { TelebirrPluginConfig } from '../types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Copies the appropriate AAR file based on environment configuration
 */
export const withTelebirrAAR: ConfigPlugin<Required<TelebirrPluginConfig>> = (config, pluginConfig) => {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const { platformProjectRoot } = cfg.modRequest;
      
      // Determine which AAR file to use based on environment
      const aarFileName = pluginConfig.environment === 'uat' 
        ? 'EthiopiaPaySdkModule-uat-release.aar'
        : 'EthiopiaPaySdkModule-prod-release.aar';
      
      // Source AAR file from our plugin
      const sourceAarPath = path.resolve(__dirname, '../../android/libs', aarFileName);
      
      // Destination in the Android project
      const libsDir = path.join(platformProjectRoot, 'app', 'libs');
      const destAarPath = path.join(libsDir, 'EthiopiaPaySdkModule-release.aar');
      
      if (pluginConfig.enableLogging) {
        console.log(`Telebirr Plugin: Copying ${aarFileName} to ${destAarPath}`);
      }
      
      try {
        // Ensure libs directory exists
        if (!fs.existsSync(libsDir)) {
          fs.mkdirSync(libsDir, { recursive: true });
        }
        
        // Copy the appropriate AAR file
        if (fs.existsSync(sourceAarPath)) {
          fs.copyFileSync(sourceAarPath, destAarPath);
          
          if (pluginConfig.enableLogging) {
            console.log(`Telebirr Plugin: Successfully copied ${aarFileName}`);
          }
        } else {
          throw new Error(`AAR file not found: ${sourceAarPath}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to copy Telebirr AAR file: ${errorMessage}`);
      }
      
      return cfg;
    },
  ]);
};