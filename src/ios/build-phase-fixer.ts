import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import { TelebirrPluginConfig } from '../types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Fixes the Xcode project to ensure ExpoTelebirrPayment.mm is in compile sources
 * This runs after the project is created to add the file to the build phase
 */
export const withTelebirrBuildPhaseFix: ConfigPlugin<Required<TelebirrPluginConfig>> = (config, pluginConfig) => {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectPath = path.join(
        cfg.modRequest.platformProjectRoot,
        cfg.modRequest.projectName + '.xcodeproj',
        'project.pbxproj'
      );
      
      if (!fs.existsSync(projectPath)) {
        if (pluginConfig.enableLogging) {
          console.warn('Telebirr Plugin: Xcode project file not found, skipping build phase fix');
        }
        return cfg;
      }
      
      try {
        let projectContent = fs.readFileSync(projectPath, 'utf-8');
        
        // Check if file is already in compile sources
        if (projectContent.includes('ExpoTelebirrPayment.mm in Sources')) {
          if (pluginConfig.enableLogging) {
            // console.log('Telebirr Plugin: File already in compile sources build phase');
          }
          return cfg;
        }
        
        // Find the file reference for ExpoTelebirrPayment.mm
        // Try multiple patterns to find the file reference
        let fileRefMatch = projectContent.match(/([A-F0-9]{24}) \/\* ExpoTelebirrPayment\.mm \*\/ = \{isa = PBXFileReference;[\s\S]*?\};/);
        
        // If not found, try a more flexible pattern
        if (!fileRefMatch) {
          fileRefMatch = projectContent.match(/([A-F0-9]{24})[^=]*ExpoTelebirrPayment\.mm[^=]*= \{isa = PBXFileReference;/);
        }
        
        if (!fileRefMatch) {
          if (pluginConfig.enableLogging) {
            console.warn('Telebirr Plugin: Could not find ExpoTelebirrPayment.mm file reference');
            console.warn('Telebirr Plugin: Searching for file reference in project...');
            // Try to find any reference to ExpoTelebirrPayment.mm
            const anyRef = projectContent.match(/([A-F0-9]{24})[^;]*ExpoTelebirrPayment\.mm/);
            if (anyRef) {
              console.warn(`Telebirr Plugin: Found potential UUID: ${anyRef[1]}`);
            }
          }
          return cfg;
        }
        
        const fileRefUuid = fileRefMatch[1];
        
        // Check if build file already exists
        const buildFileRegex = new RegExp(`([A-F0-9]{24}) /\\* ExpoTelebirrPayment\\.mm in Sources \\*/ = \\{isa = PBXBuildFile; fileRef = ${fileRefUuid} /\\* ExpoTelebirrPayment\\.mm \\*/; \\};`);
        const existingBuildFile = projectContent.match(buildFileRegex);
        
        let buildFileUuid: string;
        if (existingBuildFile) {
          buildFileUuid = existingBuildFile[1];
          if (pluginConfig.enableLogging) {
            // console.log('Telebirr Plugin: Build file already exists, using existing UUID');
          }
        } else {
          // Generate a new build file UUID
          buildFileUuid = generateUuid();
          
          // Add build file entry to PBXBuildFile section
          const buildFileSectionRegex = /(\/\* Begin PBXBuildFile section \*\/)/;
          if (projectContent.match(buildFileSectionRegex)) {
            const buildFileEntry = `\t\t${buildFileUuid} /* ExpoTelebirrPayment.mm in Sources */ = {isa = PBXBuildFile; fileRef = ${fileRefUuid} /* ExpoTelebirrPayment.mm */; };\n`;
            projectContent = projectContent.replace(
              buildFileSectionRegex,
              `$1\n${buildFileEntry}`
            );
          }
        }
        
        // Find the PBXSourcesBuildPhase section (13B07F871A680F5B00A75B9A is the standard UUID)
        const sourcesBuildPhaseRegex = /(13B07F871A680F5B00A75B9A \/\* Sources \*\/ = \{[\s\S]*?isa = PBXSourcesBuildPhase;[\s\S]*?files = \([\s\S]*?)(\);[\s\S]*?runOnlyForDeploymentPostprocessing)/;
        const match = projectContent.match(sourcesBuildPhaseRegex);
        
        if (match) {
          const beforeFiles = match[1];
          const afterFiles = match[2];
          
          // Check if already in files array
          const fileEntryRegex = new RegExp(`\\t\\t\\t\\t${buildFileUuid} /\\* ExpoTelebirrPayment\\.mm in Sources \\*/`);
          if (projectContent.match(fileEntryRegex)) {
            if (pluginConfig.enableLogging) {
              // console.log('Telebirr Plugin: File already in compile sources build phase');
            }
            return cfg;
          }
          
          // Add to sources build phase files array
          const newFileEntry = `\t\t\t\t${buildFileUuid} /* ExpoTelebirrPayment.mm in Sources */,\n`;
          projectContent = projectContent.replace(
            sourcesBuildPhaseRegex,
            `${beforeFiles}${newFileEntry}\t\t\t${afterFiles}`
          );
          
          fs.writeFileSync(projectPath, projectContent);
          
          if (pluginConfig.enableLogging) {
            // console.log('Telebirr Plugin: Added ExpoTelebirrPayment.mm to compile sources build phase');
          }
        } else {
          if (pluginConfig.enableLogging) {
            console.warn('Telebirr Plugin: Could not find Sources build phase in Xcode project');
          }
        }
      } catch (error) {
        if (pluginConfig.enableLogging) {
          console.warn('Telebirr Plugin: Error fixing build phase:', error);
        }
        // Don't fail the build if we can't fix the build phase
      }
      
      return cfg;
    },
  ]);
};

/**
 * Generates a UUID in Xcode project format (24 hex characters)
 */
function generateUuid(): string {
  return Array.from({ length: 24 }, () => 
    Math.floor(Math.random() * 16).toString(16).toUpperCase()
  ).join('');
}
