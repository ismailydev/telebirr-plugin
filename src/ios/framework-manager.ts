import { ConfigPlugin, withXcodeProject } from '@expo/config-plugins';
import { TelebirrPluginConfig } from '../types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Integrates EthiopiaPaySDK.framework into the iOS project
 */
export const withTelebirrFramework: ConfigPlugin<Required<TelebirrPluginConfig>> = (config, pluginConfig) => {
  return withXcodeProject(config, (cfg) => {
    const { modResults: xcodeProject, modRequest } = cfg;
    const { projectName, projectRoot } = modRequest;
    
    if (pluginConfig.enableLogging) {
      // console.log('Telebirr Plugin: Integrating iOS framework');
    }
    
    try {
      if (!projectName) {
        throw new Error('Project name is not defined');
      }
      
      // Copy framework to iOS project
      copyFrameworkToProject(projectRoot, pluginConfig);
      
      // Add framework to Xcode project
      addFrameworkToXcodeProject(xcodeProject, projectName, pluginConfig);
      
      if (pluginConfig.enableLogging) {
        // console.log('Telebirr Plugin: Successfully integrated iOS framework');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to integrate iOS framework: ${errorMessage}`);
    }
    
    return cfg;
  });
};

/**
 * Copies the EthiopiaPaySDK.framework to the iOS project
 */
function copyFrameworkToProject(projectRoot: string, pluginConfig: Required<TelebirrPluginConfig>) {
  const sourceFrameworkPath = path.resolve(__dirname, '../../ios/EthiopiaPaySDK.framework');
  const targetFrameworkPath = path.join(projectRoot, 'ios', 'EthiopiaPaySDK.framework');
  
  if (pluginConfig.enableLogging) {
    // console.log(`Telebirr Plugin: Copying framework from ${sourceFrameworkPath} to ${targetFrameworkPath}`);
  }
  
  // Remove existing framework if it exists
  if (fs.existsSync(targetFrameworkPath)) {
    fs.rmSync(targetFrameworkPath, { recursive: true, force: true });
  }
  
  // Copy the framework
  if (fs.existsSync(sourceFrameworkPath)) {
    copyRecursiveSync(sourceFrameworkPath, targetFrameworkPath);
    
    // Convert binary Info.plist to XML format to prevent UTF-8 encoding errors
    // This is necessary because React Native's post-install script tries to read
    // Info.plist files and fails on binary plists
    const infoPlistPath = path.join(targetFrameworkPath, 'Info.plist');
    if (fs.existsSync(infoPlistPath)) {
      try {
        const { execSync } = require('child_process');
        // Check if it's a binary plist and convert to XML
        const fileType = execSync(`file -b "${infoPlistPath}"`, { encoding: 'utf-8' }).trim();
        if (fileType.includes('Apple binary property list')) {
          execSync(`plutil -convert xml1 "${infoPlistPath}"`, { stdio: 'inherit' });
          if (pluginConfig.enableLogging) {
            // console.log('Telebirr Plugin: Converted Info.plist from binary to XML format');
          }
        }
      } catch (error) {
        // Log warning but don't fail the build if conversion fails
        console.warn('Telebirr Plugin: Warning - Could not convert Info.plist:', error);
      }
    }
  } else {
    throw new Error(`EthiopiaPaySDK.framework not found at ${sourceFrameworkPath}`);
  }
}

/**
 * Adds the framework to the Xcode project configuration
 */
function addFrameworkToXcodeProject(
  xcodeProject: any,
  projectName: string,
  pluginConfig: Required<TelebirrPluginConfig>
) {
  const frameworkName = 'EthiopiaPaySDK.framework';
  const frameworkPath = `${projectName}/${frameworkName}`;
  
  // Get the main group
  const group = xcodeProject.pbxGroupByName(projectName);
  if (!group) {
    throw new Error(`Could not find main group for project ${projectName}`);
  }
  
  const key = xcodeProject.findPBXGroupKey({
    name: group.name,
    path: group.path,
  });
  
  // Add framework file reference
  const frameworkFileRef = xcodeProject.addFile(frameworkPath, key, {
    lastKnownFileType: 'wrapper.framework',
    sourceTree: 'SOURCE_ROOT',
  });
  
  if (frameworkFileRef) {
    // Add to frameworks build phase
    xcodeProject.addFramework(frameworkPath, {
      link: true,
      embed: true,
    });
    
    // Add framework search paths
    xcodeProject.addToFrameworkSearchPaths({
      path: `$(PROJECT_DIR)/${projectName}`,
      recursive: false,
    });
    
    if (pluginConfig.enableLogging) {
      // console.log('Telebirr Plugin: Added framework to Xcode project');
    }
  }
}

/**
 * Recursively copies a directory
 */
function copyRecursiveSync(src: string, dest: string) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}