/**
 * This file contains helper functions for image processing on the backend.
 * These functions operate on raw RGBA image data buffers.
 */

/**
 * Blends two raw image data buffers together.
 * Assumes both buffers are of the same dimensions and are RGBA.
 * @param buffer1 The raw pixel data for the first image.
 * @param buffer2 The raw pixel data for the second image.
 * @param ratio The blending ratio (0.0 to 1.0). 0.0 returns buffer1, 1.0 returns buffer2.
 * @returns A new buffer containing the blended image data.
 */
export function blendImages(
  buffer1: Uint8Array,
  buffer2: Uint8Array,
  ratio: number
): Uint8Array {
  if (buffer1.length !== buffer2.length) {
    throw new Error("Buffers must have the same length to be blended.");
  }

  const newBuffer = new Uint8Array(buffer1.length);

  for (let i = 0; i < buffer1.length; i += 4) {
    // Blend Red channel
    newBuffer[i] = Math.round(buffer1[i] * (1 - ratio) + buffer2[i] * ratio);
    // Blend Green channel
    newBuffer[i + 1] = Math.round(buffer1[i + 1] * (1 - ratio) + buffer2[i + 1] * ratio);
    // Blend Blue channel
    newBuffer[i + 2] = Math.round(buffer1[i + 2] * (1 - ratio) + buffer2[i + 2] * ratio);
    // Alpha channel - for JPEGs, this is usually fixed at 255.
    // We'll just take the alpha from the first image.
    newBuffer[i + 3] = buffer1[i + 3];
  }

  return newBuffer;
}
