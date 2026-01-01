import { ConfigPlugin, withDangerousMod } from "@expo/config-plugins";
import { TelebirrPluginConfig } from "../types";
import * as path from "path";
import * as fs from "fs";

/**
 * Copies native bridge files to the Android project
 */
export const withTelebirrBridge: ConfigPlugin<
  Required<TelebirrPluginConfig>
> = (config, pluginConfig) => {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const { platformProjectRoot } = cfg.modRequest;

      if (pluginConfig.enableLogging) {
        console.log("Telebirr Plugin: Adding native bridge files");
      }

      try {
        // Get the package name from the Android project
        const packageName = getAndroidPackageName(platformProjectRoot);

        // Copy and modify bridge files
        await copyBridgeFiles(platformProjectRoot, packageName, pluginConfig);

        if (pluginConfig.enableLogging) {
          console.log(
            "Telebirr Plugin: Successfully added native bridge files"
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to add Telebirr bridge files: ${errorMessage}`);
      }

      return cfg;
    },
  ]);
};

/**
 * Gets the Android package name from the MainApplication file
 * This is more reliable than build.gradle since MainApplication location determines the actual package
 */
function getAndroidPackageName(platformProjectRoot: string): string {
  try {
    // First, try to find MainApplication.kt or MainApplication.java
    const javaSrcPath = path.join(
      platformProjectRoot,
      "app",
      "src",
      "main",
      "java"
    );

    // Search for MainApplication files
    const findMainApplication = (
      dir: string,
      packageParts: string[] = []
    ): string | null => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const result = findMainApplication(path.join(dir, entry.name), [
            ...packageParts,
            entry.name,
          ]);
          if (result) return result;
        } else if (
          entry.name === "MainApplication.kt" ||
          entry.name === "MainApplication.java"
        ) {
          // Found MainApplication, return the package name
          return packageParts.join(".");
        }
      }
      return null;
    };

    const packageName = findMainApplication(javaSrcPath);
    if (packageName) {
      return packageName;
    }

    // Fallback: try to read package name from build.gradle
    const buildGradlePath = path.join(
      platformProjectRoot,
      "app",
      "build.gradle"
    );
    if (fs.existsSync(buildGradlePath)) {
      const buildGradleContent = fs.readFileSync(buildGradlePath, "utf8");
      const packageMatch = buildGradleContent.match(
        /applicationId\s+["']([^"']+)["']/
      );
      if (packageMatch) {
        return packageMatch[1];
      }
    }

    throw new Error(
      "Could not determine Android package name from MainApplication"
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get Android package name: ${errorMessage}`);
  }
}

/**
 * Copies and modifies bridge files for the specific package
 */
async function copyBridgeFiles(
  platformProjectRoot: string,
  packageName: string,
  pluginConfig: Required<TelebirrPluginConfig>
): Promise<void> {
  const packagePath = packageName.replace(/\./g, "/");
  const targetDir = path.join(
    platformProjectRoot,
    "app",
    "src",
    "main",
    "java",
    packagePath
  );

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Source files from our plugin
  const sourceDir = path.resolve(
    __dirname,
    "../../android/src/main/java/com/telebirr"
  );

  // Copy and modify TelebirrPaymentModule.java
  const moduleSource = path.join(sourceDir, "TelebirrPaymentModule.java");
  const moduleTarget = path.join(targetDir, "TelebirrPaymentModule.java");

  let moduleContent = fs.readFileSync(moduleSource, "utf8");
  moduleContent = moduleContent.replace(
    /package com\.telebirr;/,
    `package ${packageName};`
  );
  fs.writeFileSync(moduleTarget, moduleContent);

  // Copy and modify TelebirrPaymentPackage.java
  const packageSource = path.join(sourceDir, "TelebirrPaymentPackage.java");
  const packageTarget = path.join(targetDir, "TelebirrPaymentPackage.java");

  let packageContent = fs.readFileSync(packageSource, "utf8");
  packageContent = packageContent.replace(
    /package com\.telebirr;/,
    `package ${packageName};`
  );
  fs.writeFileSync(packageTarget, packageContent);

  // Copy original library's source files to make them available for compilation
  await copyOriginalLibraryFiles(platformProjectRoot, pluginConfig);

  // Add package registration to MainApplication.java
  await addPackageRegistration(platformProjectRoot, packageName, pluginConfig);
}

/**
 * Copies the original library's Java source files to the Android project
 */
async function copyOriginalLibraryFiles(
  platformProjectRoot: string,
  pluginConfig: Required<TelebirrPluginConfig>
): Promise<void> {
  try {
    // Find the original library's source directory
    // platformProjectRoot is the android folder, so we need to go up to project root
    const projectRoot = path.resolve(platformProjectRoot, "..");
    const originalLibPath = path.join(
      projectRoot,
      "node_modules/react-native-telebirr-payment/android/src/main/java/com/telebirrpayment"
    );

    if (!fs.existsSync(originalLibPath)) {
      if (pluginConfig.enableLogging) {
        console.warn(
          "Telebirr Plugin: Original library source files not found at:",
          originalLibPath
        );
      }
      return;
    }

    // Target directory for original library files
    const targetDir = path.join(
      platformProjectRoot,
      "app",
      "src",
      "main",
      "java",
      "com",
      "telebirrpayment"
    );

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copy TelebirrPaymentModule.java
    const moduleSource = path.join(
      originalLibPath,
      "TelebirrPaymentModule.java"
    );
    const moduleTarget = path.join(targetDir, "TelebirrPaymentModule.java");

    if (fs.existsSync(moduleSource)) {
      fs.copyFileSync(moduleSource, moduleTarget);
    }

    // Copy TelebirrPaymentPackage.java
    const packageSource = path.join(
      originalLibPath,
      "TelebirrPaymentPackage.java"
    );
    const packageTarget = path.join(targetDir, "TelebirrPaymentPackage.java");

    if (fs.existsSync(packageSource)) {
      fs.copyFileSync(packageSource, packageTarget);
    }

    if (pluginConfig.enableLogging) {
      console.log(
        "Telebirr Plugin: Successfully copied original library source files"
      );
    }
  } catch (error) {
    if (pluginConfig.enableLogging) {
      console.warn(
        "Telebirr Plugin: Failed to copy original library files:",
        error
      );
    }
  }
}

/**
 * Adds the Telebirr package to MainApplication.java or MainApplication.kt
 */
async function addPackageRegistration(
  platformProjectRoot: string,
  packageName: string,
  pluginConfig: Required<TelebirrPluginConfig>
): Promise<void> {
  const packagePath = packageName.replace(/\./g, "/");

  // Try both Java and Kotlin files
  const javaPath = path.join(
    platformProjectRoot,
    "app",
    "src",
    "main",
    "java",
    packagePath,
    "MainApplication.java"
  );

  const kotlinPath = path.join(
    platformProjectRoot,
    "app",
    "src",
    "main",
    "java",
    packagePath,
    "MainApplication.kt"
  );

  let mainAppPath: string;
  let isKotlin = false;

  if (fs.existsSync(kotlinPath)) {
    mainAppPath = kotlinPath;
    isKotlin = true;
  } else if (fs.existsSync(javaPath)) {
    mainAppPath = javaPath;
    isKotlin = false;
  } else {
    if (pluginConfig.enableLogging) {
      console.warn(
        "Telebirr Plugin: MainApplication file not found, skipping package registration"
      );
    }
    return;
  }

  let mainAppContent = fs.readFileSync(mainAppPath, "utf8");

  // Add imports for both packages if not present
  const customImportStatement = `import ${packageName}.TelebirrPaymentPackage`;
  const originalImportStatement = `import com.telebirrpayment.TelebirrPaymentPackage`;

  // Don't add conflicting imports, use fully qualified names instead
  // if (!mainAppContent.includes(customImportStatement)) {
  //   // Find the last import statement and add after it
  //   const lastImportMatch = mainAppContent.match(/import\s+[^;\n]+[\n;]/g);
  //   if (lastImportMatch) {
  //     const lastImport = lastImportMatch[lastImportMatch.length - 1];
  //     const newImport = isKotlin ? customImportStatement + '\n' : customImportStatement + ';\n';
  //     mainAppContent = mainAppContent.replace(lastImport, lastImport + newImport);
  //   }
  // }

  // if (!mainAppContent.includes(originalImportStatement)) {
  //   // Find the last import statement and add after it
  //   const lastImportMatch = mainAppContent.match(/import\s+[^;\n]+[\n;]/g);
  //   if (lastImportMatch) {
  //     const lastImport = lastImportMatch[lastImportMatch.length - 1];
  //     const newImport = isKotlin ? originalImportStatement + '\n' : originalImportStatement + ';\n';
  //     mainAppContent = mainAppContent.replace(lastImport, lastImport + newImport);
  //   }
  // }

  // Add packages to the packages list using fully qualified names to avoid conflicts
  const originalPackageRegistration =
    "com.telebirrpayment.TelebirrPaymentPackage()";
  const customPackageRegistration = `${packageName}.TelebirrPaymentPackage()`;

  // Add original library package first (only if react-native-telebirr-payment is installed)
  // Skip this for now since we're using our custom plugin only
  // if (!mainAppContent.includes(originalPackageRegistration)) {
  //   // Find the packages list and add our package
  //   const packagesMatch = mainAppContent.match(/(add\([^)]+\))/g);
  //   if (packagesMatch) {
  //     const lastPackage = packagesMatch[packagesMatch.length - 1];
  //     const newPackage = isKotlin ? `add(${originalPackageRegistration})` : `add(new ${originalPackageRegistration});`;
  //     mainAppContent = mainAppContent.replace(
  //       lastPackage,
  //       lastPackage + '\n              ' + newPackage
  //     );
  //   }
  // }

  // Add custom package second
  if (!mainAppContent.includes(customPackageRegistration)) {
    // Find the packages list - look for the apply block with add() calls
    // Match pattern: packages.apply { ... add(...) ... }
    const applyBlockMatch = mainAppContent.match(
      /packages\.apply\s*\{([^}]+)\}/s
    );
    if (applyBlockMatch) {
      const applyBlockContent = applyBlockMatch[1];
      // Find the last actual add() call (not in comments) before closing brace
      // Match add() calls that are not preceded by // on the same line
      const lines = applyBlockContent.split("\n");
      let lastAddLineIndex = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        // Check if line contains add() and is not a comment
        if (line.includes("add(") && !line.startsWith("//")) {
          lastAddLineIndex = i;
          break;
        }
      }

      if (lastAddLineIndex >= 0) {
        // Insert after the last add() line
        const newPackage = isKotlin
          ? `add(${customPackageRegistration})`
          : `add(new ${customPackageRegistration});`;
        // Get the indentation from the last add line
        const lastAddLine = lines[lastAddLineIndex];
        const indentMatch = lastAddLine.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : "              ";
        lines.splice(lastAddLineIndex + 1, 0, indent + newPackage);
        const newApplyBlock = lines.join("\n");
        mainAppContent = mainAppContent.replace(
          applyBlockMatch[0],
          `packages.apply {${newApplyBlock}}`
        );
      } else {
        // No add() calls found, add after comments but before closing brace
        const newPackage = isKotlin
          ? `add(${customPackageRegistration})`
          : `add(new ${customPackageRegistration});`;
        // Add with proper indentation
        const newLine = "              " + newPackage;
        const newApplyBlock = applyBlockContent.trim()
          ? applyBlockContent + "\n" + newLine
          : newLine;
        mainAppContent = mainAppContent.replace(
          applyBlockMatch[0],
          `packages.apply {${newApplyBlock}}`
        );
      }
    } else {
      // Fallback: try the old method (but skip commented lines)
      const packagesMatch = mainAppContent.match(/(?<!\/\/.*)(add\([^)]+\))/g);
      if (packagesMatch) {
        const lastPackage = packagesMatch[packagesMatch.length - 1];
        const newPackage = isKotlin
          ? `add(${customPackageRegistration})`
          : `add(new ${customPackageRegistration});`;
        mainAppContent = mainAppContent.replace(
          lastPackage,
          lastPackage + "\n              " + newPackage
        );
      }
    }
  }

  fs.writeFileSync(mainAppPath, mainAppContent);
}
