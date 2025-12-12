import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ImageService {
  constructor() {
    this.uploadsDir = path.join(__dirname, "../../uploads/");
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true, mode: 0o755 });
    }
  }

  async convertToWebP(originalPath, options = {}) {
    try {
      const {
        quality = 80,
        deleteOriginal = true,
        keepOriginalName = false,
      } = options;
      if (!fs.existsSync(originalPath))
        throw new Error(`Fichier non trouvé: ${originalPath}`);
      const originalName = path.basename(
        originalPath,
        path.extname(originalPath)
      );
      const webpFilename = `${originalName}.webp`;
      const webpPath = path.join(this.uploadsDir, webpFilename);
      const metadata = await sharp(originalPath).metadata();
      console.log(`Conversion en WebP: ${originalName}`);
      console.log(`   Format original: ${metadata.format}`);
      console.log(`   Dimensions: ${metadata.width}x${metadata.height}`);
      await sharp(originalPath)
        .webp({ quality, effort: 6, lossless: false })
        .toFile(webpPath);
      const originalStats = fs.statSync(originalPath);
      const webpStats = fs.statSync(webpPath);
      const compressionRatio = (
        ((originalStats.size - webpStats.size) / originalStats.size) *
        100
      ).toFixed(1);
      console.log(`Conversion réussie:`);
      console.log(
        `   Taille originale: ${(originalStats.size / 1024).toFixed(1)} KB`
      );
      console.log(`   Taille WebP: ${(webpStats.size / 1024).toFixed(1)} KB`);
      console.log(`   Compression: ${compressionRatio}%`);
      if (deleteOriginal) {
        fs.unlinkSync(originalPath);
        console.log(
          `Image originale supprimée: ${path.basename(originalPath)}`
        );
      }
      return webpFilename;
    } catch (error) {
      console.error("Erreur lors de la conversion WebP:", error);
      throw new Error(`Échec de la conversion WebP: ${error.message}`);
    }
  }

  async optimizeImage(originalPath, options = {}) {
    try {
      const {
        maxWidth = 1200,
        maxHeight = 1200,
        quality = 80,
        deleteOriginal = true,
      } = options;
      const originalName = path.basename(
        originalPath,
        path.extname(originalPath)
      );
      const optimizedFilename = `${originalName}.webp`;
      const optimizedPath = path.join(this.uploadsDir, optimizedFilename);
      const metadata = await sharp(originalPath).metadata();
      console.log(`Optimisation d'image: ${originalName}`);
      console.log(
        `   Dimensions originales: ${metadata.width}x${metadata.height}`
      );
      let sharpInstance = sharp(originalPath);
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
          fit: "inside",
          withoutEnlargement: true,
        });
        console.log(`   Redimensionnement: max ${maxWidth}x${maxHeight}`);
      }
      await sharpInstance.webp({ quality, effort: 6 }).toFile(optimizedPath);
      const originalStats = fs.statSync(originalPath);
      const optimizedStats = fs.statSync(optimizedPath);
      const compressionRatio = (
        ((originalStats.size - optimizedStats.size) / originalStats.size) *
        100
      ).toFixed(1);
      console.log(`Optimisation réussie:`);
      console.log(
        `   Taille originale: ${(originalStats.size / 1024).toFixed(1)} KB`
      );
      console.log(
        `   Taille optimisée: ${(optimizedStats.size / 1024).toFixed(1)} KB`
      );
      console.log(`   Compression: ${compressionRatio}%`);
      if (deleteOriginal) {
        fs.unlinkSync(originalPath);
        console.log(`Image originale supprimée`);
      }
      return optimizedFilename;
    } catch (error) {
      console.error("Erreur lors de l'optimisation:", error);
      throw new Error(`Échec de l'optimisation: ${error.message}`);
    }
  }

  async generateMultipleSizes(originalPath, options = {}) {
    try {
      const { deleteOriginal = true, quality = 80 } = options;
      const originalName = path.basename(
        originalPath,
        path.extname(originalPath)
      );
      const sizes = {
        thumbnail: { width: 150, height: 150, suffix: "_thumb" },
        medium: { width: 500, height: 500, suffix: "_medium" },
        large: { width: 1200, height: 1200, suffix: "_large" },
      };
      const generatedFiles = {};
      console.log(`Génération de multiples tailles: ${originalName}`);
      for (const [sizeName, config] of Object.entries(sizes)) {
        const filename = `${originalName}${config.suffix}.webp`;
        const outputPath = path.join(this.uploadsDir, filename);
        await sharp(originalPath)
          .resize(config.width, config.height, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality, effort: 6 })
          .toFile(outputPath);
        generatedFiles[sizeName] = filename;
        console.log(`   ${sizeName}: ${filename}`);
      }
      const originalOptimized = await this.optimizeImage(originalPath, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality,
        deleteOriginal,
      });
      generatedFiles.original = originalOptimized;
      return generatedFiles;
    } catch (error) {
      console.error("Erreur lors de la génération des tailles:", error);
      throw new Error(`Échec de la génération des tailles: ${error.message}`);
    }
  }

  async isValidImage(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      return ["jpeg", "jpg", "png", "gif", "webp", "tiff", "bmp"].includes(
        metadata.format
      );
    } catch (error) {
      return false;
    }
  }

  async cleanupOldImages(maxAgeHours = 24) {
    try {
      const files = fs.readdirSync(this.uploadsDir);
      const now = Date.now();
      let deletedCount = 0;
      for (const file of files) {
        const filePath = path.join(this.uploadsDir, file);
        const stats = fs.statSync(filePath);
        const ageHours = (now - stats.mtime.getTime()) / (1000 * 60 * 60);
        if (ageHours > maxAgeHours) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
      if (deletedCount > 0)
        console.log(`Nettoyage: ${deletedCount} anciennes images supprimées`);
    } catch (error) {
      console.error("Erreur lors du nettoyage:", error);
    }
  }
}

export default new ImageService();
