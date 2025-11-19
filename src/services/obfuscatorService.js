const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const unzipper = require('unzipper');

/**
 * Service for code obfuscation operations
 */
class ObfuscatorService {
  /**
   * Get obfuscation options based on level
   */
  getObfuscationOptions(level, customOptions = {}) {
    const presets = {
      low: {
        compact: true,
        simplify: true,
        stringArray: false,
        stringArrayThreshold: 0,
        rotateStringArray: false,
        shuffleStringArray: false,
        splitStrings: false,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        selfDefending: false,
        sourceMap: false,
        sourceMapMode: 'separate',
        transformObjectKeys: false,
        unicodeEscapeSequence: false
      },
      medium: {
        compact: true,
        simplify: true,
        stringArray: true,
        stringArrayThreshold: 0.75,
        rotateStringArray: true,
        shuffleStringArray: true,
        splitStrings: true,
        splitStringsChunkLength: 10,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        selfDefending: false,
        sourceMap: false,
        transformObjectKeys: true,
        unicodeEscapeSequence: false
      },
      high: {
        compact: true,
        simplify: true,
        stringArray: true,
        stringArrayThreshold: 0.85,
        rotateStringArray: true,
        shuffleStringArray: true,
        splitStrings: true,
        splitStringsChunkLength: 5,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: false,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        selfDefending: true,
        sourceMap: false,
        transformObjectKeys: true,
        unicodeEscapeSequence: true
      }
    };

    const baseOptions = presets[level] || presets.medium;
    return { ...baseOptions, ...customOptions };
  }

  /**
   * Obfuscate a single JavaScript file
   */
  async obfuscateFile(inputPath, outputPath, level = 'medium', customOptions = {}) {
    try {
      // Read source code
      const code = await fs.readFile(inputPath, 'utf8');

      // Get obfuscation options
      const options = this.getObfuscationOptions(level, customOptions);

      // Obfuscate code
      const obfuscationResult = JavaScriptObfuscator.obfuscate(code, options);
      const obfuscatedCode = obfuscationResult.getObfuscatedCode();

      // Write obfuscated code
      await fs.writeFile(outputPath, obfuscatedCode, 'utf8');

      // Get file stats
      const originalSize = (await fs.stat(inputPath)).size;
      const obfuscatedSize = (await fs.stat(outputPath)).size;

      return {
        success: true,
        originalSize,
        obfuscatedSize,
        reduction: ((originalSize - obfuscatedSize) / originalSize * 100).toFixed(2)
      };
    } catch (error) {
      throw new Error(`Obfuscation error: ${error.message}`);
    }
  }

  /**
   * Obfuscate multiple files from ZIP
   */
  async obfuscateZip(inputZipPath, outputZipPath, level = 'medium', customOptions = {}) {
    const tempDir = path.join(path.dirname(inputZipPath), `temp_${Date.now()}`);
    const outputDir = path.join(path.dirname(inputZipPath), `obf_${Date.now()}`);

    try {
      // Create temp directories
      await fs.mkdir(tempDir, { recursive: true });
      await fs.mkdir(outputDir, { recursive: true });

      // Extract ZIP
      await fs.createReadStream(inputZipPath)
        .pipe(unzipper.Extract({ path: tempDir }))
        .promise();

      // Find all .js files
      const jsFiles = await this.findJSFiles(tempDir);

      if (jsFiles.length === 0) {
        throw new Error('No JavaScript files found in ZIP');
      }

      // Obfuscate each file
      const results = [];
      for (const file of jsFiles) {
        const relativePath = path.relative(tempDir, file);
        const outputPath = path.join(outputDir, relativePath);

        // Create output directory
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // Obfuscate
        const result = await this.obfuscateFile(file, outputPath, level, customOptions);
        results.push({
          file: relativePath,
          ...result
        });
      }

      // Create output ZIP
      await this.createZip(outputDir, outputZipPath);

      // Get stats
      const originalSize = (await fs.stat(inputZipPath)).size;
      const obfuscatedSize = (await fs.stat(outputZipPath)).size;

      // Cleanup
      await this.removeDirectory(tempDir);
      await this.removeDirectory(outputDir);

      return {
        success: true,
        filesProcessed: jsFiles.length,
        originalSize,
        obfuscatedSize,
        reduction: ((originalSize - obfuscatedSize) / originalSize * 100).toFixed(2),
        details: results
      };
    } catch (error) {
      // Cleanup on error
      await this.removeDirectory(tempDir).catch(() => {});
      await this.removeDirectory(outputDir).catch(() => {});
      throw error;
    }
  }

  /**
   * Find all .js files recursively
   */
  async findJSFiles(dir) {
    const files = [];
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...await this.findJSFiles(fullPath));
      } else if (item.isFile() && item.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Create ZIP archive from directory
   */
  async createZip(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Remove directory recursively
   */
  async removeDirectory(dir) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Calculate file hash
   */
  async calculateFileHash(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  /**
   * Validate JavaScript syntax
   */
  async validateJavaScript(filePath) {
    try {
      const code = await fs.readFile(filePath, 'utf8');
      // Try to parse with Node's VM
      const vm = require('vm');
      new vm.Script(code);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        line: error.lineNumber || null
      };
    }
  }
}

module.exports = new ObfuscatorService();
