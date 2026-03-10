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
      // console.log('Telebirr Plugin: Adding iOS bridge files');
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
        // console.log('Telebirr Plugin: Successfully added iOS bridge files');
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
    // console.log('Telebirr Plugin: Copied bridge files to iOS project');
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
  
  // Manually add to compile sources build phase
  // This is necessary because addFile doesn't always add .mm files to the build phase
  if (implFileRef) {
    try {
      // Get file reference UUID
      const fileRefUuid = typeof implFileRef === 'string' 
        ? implFileRef 
        : String((implFileRef as any)?.uuid || (implFileRef as any)?.fileRef || '');
      
      if (fileRefUuid) {
        // Get all native targets
        const targets = xcodeProject.pbxNativeTargetSection();
        
        for (const targetUuid of Object.keys(targets)) {
          const target = targets[targetUuid];
          if (!target || !target.buildPhases) continue;
          
          // Find sources build phase
          for (const phaseUuid of target.buildPhases) {
            const phaseUuidStr = typeof phaseUuid === 'string' ? phaseUuid : String(phaseUuid);
            const buildPhase = xcodeProject.hash.project.objects?.PBXSourcesBuildPhase?.[phaseUuidStr];
            
            if (!buildPhase || buildPhase.isa !== 'PBXSourcesBuildPhase') continue;
            
            // Find or create build file
            let buildFileUuid: string | undefined;
            const buildFiles = xcodeProject.hash.project.objects?.PBXBuildFile || {};
            
            // Check if build file exists
            for (const [uuid, buildFile] of Object.entries(buildFiles)) {
              const bf = buildFile as any;
              if (bf?.fileRef === fileRefUuid) {
                buildFileUuid = uuid;
                break;
              }
            }
            
            // Create build file if needed
            if (!buildFileUuid) {
              const newUuid = xcodeProject.generateUuid();
              if (!newUuid) {
                throw new Error('Failed to generate UUID for build file');
              }
              buildFileUuid = newUuid as string;
              if (!xcodeProject.hash.project.objects.PBXBuildFile) {
                xcodeProject.hash.project.objects.PBXBuildFile = {};
              }
              xcodeProject.hash.project.objects.PBXBuildFile[buildFileUuid] = {
                isa: 'PBXBuildFile',
                fileRef: fileRefUuid,
              };
            }
            
            // Add to sources build phase files
            const finalBuildFileUuid = buildFileUuid;
            if (finalBuildFileUuid) {
              if (!buildPhase.files) {
                buildPhase.files = [];
              }
              
              const files = Array.isArray(buildPhase.files) ? buildPhase.files : [];
              const alreadyAdded = files.some((f: any) => {
                const fUuid = typeof f === 'string' ? f : String(f?.value || f);
                return fUuid === finalBuildFileUuid;
              });
              
              if (!alreadyAdded) {
                files.push({
                  value: finalBuildFileUuid,
                  comment: 'ExpoTelebirrPayment.mm in Sources',
                });
                buildPhase.files = files;
              }
            }
          }
        }
      }
    } catch (error) {
      // Log but don't fail - the file is still in the project
      if (pluginConfig.enableLogging) {
        console.warn('Telebirr Plugin: Could not automatically add to compile sources:', error);
      }
    }
  }
  
  if (pluginConfig.enableLogging) {
    // console.log('Telebirr Plugin: Added bridge files to Xcode project');
  }
}