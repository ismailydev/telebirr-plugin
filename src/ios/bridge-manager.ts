import { ConfigPlugin, withXcodeProject } from '@expo/config-plugins';
import { TelebirrPluginConfig } from '../types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Adds native bridge files to the iOS project
 */
export const withTelebirrIOSBridge: ConfigPlugin<Required<TelebirrPluginConfig>> = (config, pluginConfig) => {
  return withXcodeProject(config, (cfg) => {
    const { modResults: xcodeProject, modRequest } = cfg;
    const { projectName, projectRoot } = modRequest;
    
    if (pluginConfig.enableLogging) {
      console.log('Telebirr Plugin: Adding iOS bridge files');
    }
    
    try {
      if (!projectName) {
        throw new Error('Project name is not defined');
      }
      
      // Copy bridge files to iOS project
      copyBridgeFiles(projectRoot, projectName, pluginConfig);
      
      // Add bridge files to Xcode project
      addBridgeFilesToXcode(xcodeProject, projectName, pluginConfig);
      
      if (pluginConfig.enableLogging) {
        console.log('Telebirr Plugin: Successfully added iOS bridge files');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to add iOS bridge files: ${errorMessage}`);
    }
    
    return cfg;
  });
};

/**
 * Copies bridge files to the iOS project directory
 */
function copyBridgeFiles(
  projectRoot: string,
  projectName: string,
  pluginConfig: Required<TelebirrPluginConfig>
) {
  const iosProjectPath = path.join(projectRoot, 'ios', projectName);
  
  // Ensure iOS project directory exists
  if (!fs.existsSync(iosProjectPath)) {
    fs.mkdirSync(iosProjectPath, { recursive: true });
  }
  
  // Source files from our plugin
  const sourceDir = path.resolve(__dirname, '../../ios');
  
  // Copy header file
  const headerSource = path.join(sourceDir, 'ExpoTelebirrPayment.h');
  const headerTarget = path.join(iosProjectPath, 'ExpoTelebirrPayment.h');
  
  if (fs.existsSync(headerSource)) {
    fs.copyFileSync(headerSource, headerTarget);
  } else {
    throw new Error(`Header file not found: ${headerSource}`);
  }
  
  // Copy implementation file
  const implSource = path.join(sourceDir, 'ExpoTelebirrPayment.mm');
  const implTarget = path.join(iosProjectPath, 'ExpoTelebirrPayment.mm');
  
  if (fs.existsSync(implSource)) {
    fs.copyFileSync(implSource, implTarget);
  } else {
    throw new Error(`Implementation file not found: ${implSource}`);
  }
  
  if (pluginConfig.enableLogging) {
    console.log('Telebirr Plugin: Copied bridge files to iOS project');
  }
}

/**
 * Adds bridge files to the Xcode project
 */
function addBridgeFilesToXcode(
  xcodeProject: any,
  projectName: string,
  pluginConfig: Required<TelebirrPluginConfig>
) {
  // Get the main group
  const group = xcodeProject.pbxGroupByName(projectName);
  if (!group) {
    throw new Error(`Could not find main group for project ${projectName}`);
  }
  
  const key = xcodeProject.findPBXGroupKey({
    name: group.name,
    path: group.path,
  });
  
  // Add header file
  const headerPath = `${projectName}/ExpoTelebirrPayment.h`;
  const headerFileRef = xcodeProject.addFile(headerPath, key, {
    lastKnownFileType: 'sourcecode.c.h',
  });
  
  // Add implementation file
  const implPath = `${projectName}/ExpoTelebirrPayment.mm`;
  const implFileRef = xcodeProject.addFile(implPath, key, {
    lastKnownFileType: 'sourcecode.cpp.objcpp',
  });
  
  // Add implementation file to compile sources build phase
  if (implFileRef) {
    xcodeProject.addSourceFile(`${projectName}/ExpoTelebirrPayment.mm`, null, key);
  }
  
  if (pluginConfig.enableLogging) {
    console.log('Telebirr Plugin: Added bridge files to Xcode project');
  }
}