import { createCanvas, loadImage } from 'canvas';

/**
 * Optimize image by resizing and compressing
 * Reduces file size while maintaining reasonable quality
 */
export async function optimizeImage(
  imageBuffer: Buffer,
  maxWidth: number = 768,
  maxHeight: number = 768,
  quality: number = 0.85
): Promise<Buffer> {
  try {
    // Convert buffer to data URL for canvas loadImage
    // Canvas loadImage accepts data URLs, paths, or ImageData
    const dataUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    
    // Load image from data URL
    const img = await loadImage(dataUrl);
    
    // Calculate new dimensions (maintain aspect ratio)
    let width = img.width;
    let height = img.height;
    
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }
    
    // Create canvas with new dimensions
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Draw image to canvas (this automatically applies compression)
    ctx.drawImage(img, 0, 0, width, height);
    
    // Convert to buffer with PNG format and compression
    // PNG compression is automatic, quality parameter doesn't apply to PNG
    // But we can control the output size by adjusting dimensions
    const optimizedBuffer = canvas.toBuffer('image/png', {
      compressionLevel: 9, // Maximum compression (0-9)
    });
    
    console.log(`✅ Image optimized: ${imageBuffer.length} bytes → ${optimizedBuffer.length} bytes (${Math.round((1 - optimizedBuffer.length / imageBuffer.length) * 100)}% reduction)`);
    
    return optimizedBuffer;
  } catch (error) {
    console.error("❌ Error optimizing image:", error);
    // If optimization fails, return original buffer
    return imageBuffer;
  }
}

