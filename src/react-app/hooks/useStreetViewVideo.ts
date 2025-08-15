import { useState } from "react";
import { RoutePoint } from "@/shared/types";

interface StreetViewVideoState {
  isGenerating: boolean;
  progress: number;
  error: string | null;
  videoUrl: string | null;
  totalFrames: number;
  currentFrame: number;
  images: string[];
}

interface VideoGenerationOptions {
  frameRate: number; // frames per second
  intervalDistance: number; // meters between each frame
  imageWidth: number;
  imageHeight: number;
  smoothness: number; // interpolation factor for smoother transitions (1-5)
  motionBlur: boolean; // enable motion blur for smoother transitions
  crossfadeStrength: number; // crossfade between frames (0-1)
  frameInterpolation: number; // additional interpolated frames (1-4)
}

export function useStreetViewVideo() {
  const [state, setState] = useState<StreetViewVideoState>({
    isGenerating: false,
    progress: 0,
    error: null,
    videoUrl: null,
    totalFrames: 0,
    currentFrame: 0,
    images: [],
  });

  const generateVideo = async (
    route: google.maps.DirectionsResult,
    options: VideoGenerationOptions
  ) => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      progress: 0,
      error: null,
      videoUrl: null,
      images: [],
    }));

    try {
      // Step 1: Generate waypoints along the route
      const waypoints = generateWaypoints(route, options.intervalDistance, options.smoothness);
      
      setState(prev => ({
        ...prev,
        totalFrames: waypoints.length,
      }));

      // Step 2: Generate street view images for each waypoint
      const images: string[] = [];
      
      for (let i = 0; i < waypoints.length; i++) {
        const waypoint = waypoints[i];
        
        try {
          const imageUrl = await generateStreetViewImage(
            waypoint,
            options.imageWidth,
            options.imageHeight,
            waypoint.heading
          );
          
          images.push(imageUrl);
          
          setState(prev => ({
            ...prev,
            currentFrame: i + 1,
            progress: Math.round(((i + 1) / waypoints.length) * 70), // 70% for image generation
            images: [...images],
          }));
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(`Failed to generate image for waypoint ${i}:`, error);
          // Use a placeholder or skip this frame
          continue;
        }
      }

      if (images.length === 0) {
        throw new Error("No street view images could be generated for this route");
      }

      setState(prev => ({
        ...prev,
        progress: 80,
      }));

      // Step 3: Create cinematic video from images with enhanced transitions
      const videoBlob = await createCinematicVideoFromImages(images, options);
      const videoUrl = URL.createObjectURL(videoBlob);

      setState(prev => ({
        ...prev,
        isGenerating: false,
        progress: 100,
        videoUrl,
        images,
      }));

      return videoUrl;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }));
      throw error;
    }
  };

  const reset = () => {
    setState({
      isGenerating: false,
      progress: 0,
      error: null,
      videoUrl: null,
      totalFrames: 0,
      currentFrame: 0,
      images: [],
    });
  };

  return {
    ...state,
    generateVideo,
    reset,
  };
}

interface Waypoint extends RoutePoint {
  heading: number;
}

function generateWaypoints(
  route: google.maps.DirectionsResult,
  intervalDistance: number,
  smoothness: number = 1
): Waypoint[] {
  const waypoints: Waypoint[] = [];
  const leg = route.routes[0]?.legs[0];
  
  if (!leg) return waypoints;

  // Collect all points along the entire route
  const allPoints: google.maps.LatLng[] = [];
  for (const step of leg.steps) {
    const path = step.path;
    if (path && path.length > 0) {
      allPoints.push(...path);
    }
  }

  if (allPoints.length < 2) return waypoints;

  // Generate ultra-smooth waypoints with cinematic heading transitions
  let totalDistance = 0;
  let nextWaypointDistance = 0;
  
  // Pre-process route to create smoothed path with spline interpolation
  const smoothedPoints = createSmoothPath(allPoints, smoothness);
  
  for (let i = 0; i < smoothedPoints.length - 1; i++) {
    const point1 = smoothedPoints[i];
    const point2 = smoothedPoints[i + 1];
    
    const segmentDistance = google.maps.geometry.spherical.computeDistanceBetween(point1, point2);
    
    // Check if we need to add waypoints along this segment
    while (totalDistance + segmentDistance >= nextWaypointDistance) {
      const distanceAlongSegment = nextWaypointDistance - totalDistance;
      const ratio = distanceAlongSegment / segmentDistance;
      
      // Interpolate position along the segment with cubic smoothing
      const interpolatedPoint = google.maps.geometry.spherical.interpolate(
        point1,
        point2,
        smoothCubic(ratio)
      );
      
      // Calculate cinematic heading with lookahead and momentum
      let heading: number;
      if (waypoints.length === 0) {
        // First waypoint - use smoothed heading
        const lookAheadIndex = Math.min(i + Math.max(3, smoothness), smoothedPoints.length - 1);
        heading = google.maps.geometry.spherical.computeHeading(interpolatedPoint, smoothedPoints[lookAheadIndex]);
      } else {
        // Ultra-smooth heading with momentum-based transitions
        const lookAheadDistance = Math.min(smoothness * 2, smoothedPoints.length - i - 1);
        const lookAheadPoint = smoothedPoints[i + lookAheadDistance];
        const rawHeading = google.maps.geometry.spherical.computeHeading(interpolatedPoint, lookAheadPoint);
        
        // Apply momentum-based smoothing for more natural camera movement
        const prevHeading = waypoints[waypoints.length - 1].heading;
        const momentum = Math.min(waypoints.length * 0.1, 0.8); // Increase momentum over time
        heading = blendHeadingsWithMomentum(prevHeading, rawHeading, momentum, smoothness);
      }
      
      waypoints.push({
        lat: interpolatedPoint.lat(),
        lng: interpolatedPoint.lng(),
        heading: heading,
      });
      
      nextWaypointDistance += intervalDistance;
    }
    
    totalDistance += segmentDistance;
  }

  // Always include the final destination
  if (allPoints.length > 0) {
    const lastPoint = allPoints[allPoints.length - 1];
    const secondLastPoint = allPoints[allPoints.length - 2] || lastPoint;
    const finalHeading = google.maps.geometry.spherical.computeHeading(secondLastPoint, lastPoint);
    
    waypoints.push({
      lat: lastPoint.lat(),
      lng: lastPoint.lng(),
      heading: finalHeading,
    });
  }

  return waypoints;
}

// Create a smooth path using spline interpolation
function createSmoothPath(points: google.maps.LatLng[], smoothness: number): google.maps.LatLng[] {
  if (points.length <= 2) return points;
  
  const smoothedPoints: google.maps.LatLng[] = [];
  const tension = Math.max(0.1, 1 - (smoothness * 0.2)); // Lower tension = smoother curves
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    // Add original point
    smoothedPoints.push(p1);
    
    // Add interpolated points for ultra-smooth transitions
    const segments = Math.max(2, smoothness);
    for (let t = 1; t <= segments; t++) {
      const ratio = t / (segments + 1);
      const smoothedPoint = catmullRomSpline(p0, p1, p2, p3, ratio, tension);
      smoothedPoints.push(smoothedPoint);
    }
  }
  
  // Add final point
  smoothedPoints.push(points[points.length - 1]);
  return smoothedPoints;
}

// Catmull-Rom spline interpolation for smooth curves
function catmullRomSpline(
  p0: google.maps.LatLng,
  p1: google.maps.LatLng,
  p2: google.maps.LatLng,
  p3: google.maps.LatLng,
  t: number,
  tension: number
): google.maps.LatLng {
  const t2 = t * t;
  const t3 = t2 * t;
  
  // Catmull-Rom basis functions
  const v0 = (p2.lat() - p0.lat()) * tension;
  const v1 = (p3.lat() - p1.lat()) * tension;
  const lat = p1.lat() + v0 * t + (3 * (p2.lat() - p1.lat()) - 2 * v0 - v1) * t2 + (2 * (p1.lat() - p2.lat()) + v0 + v1) * t3;
  
  const v0lng = (p2.lng() - p0.lng()) * tension;
  const v1lng = (p3.lng() - p1.lng()) * tension;
  const lng = p1.lng() + v0lng * t + (3 * (p2.lng() - p1.lng()) - 2 * v0lng - v1lng) * t2 + (2 * (p1.lng() - p2.lng()) + v0lng + v1lng) * t3;
  
  return new google.maps.LatLng(lat, lng);
}

// Smooth cubic easing function
function smoothCubic(t: number): number {
  return t * t * (3 - 2 * t);
}

// Helper function to blend two headings smoothly with momentum
function blendHeadingsWithMomentum(heading1: number, heading2: number, momentum: number, smoothness: number): number {
  // Normalize headings to [0, 360)
  heading1 = ((heading1 % 360) + 360) % 360;
  heading2 = ((heading2 % 360) + 360) % 360;
  
  // Calculate the shortest angular distance
  let diff = heading2 - heading1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  
  // Apply easing function for smoother transitions
  const easedMomentum = smoothCubic(momentum);
  const smoothnessFactor = Math.max(0.3, 1 - (smoothness * 0.1));
  
  // Blend with momentum and smoothness
  const blended = heading1 + (diff * easedMomentum * smoothnessFactor);
  return ((blended % 360) + 360) % 360;
}

// Legacy function for compatibility
function blendHeadings(heading1: number, heading2: number, factor: number): number {
  return blendHeadingsWithMomentum(heading1, heading2, factor, 3);
}

async function generateStreetViewImage(
  waypoint: Waypoint,
  width: number,
  height: number,
  heading: number
): Promise<string> {
  const response = await fetch("/api/streetview-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lat: waypoint.lat,
      lng: waypoint.lng,
      width,
      height,
      heading: Math.round(heading),
      pitch: 0,
      fov: 90,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate street view image: ${response.statusText}`);
  }

  const data = await response.json();
  return data.imageUrl;
}

async function createCinematicVideoFromImages(
  images: string[],
  options: VideoGenerationOptions
): Promise<Blob> {
  // Create enhanced image sequence with interpolation and effects
  const enhancedImages = await createEnhancedImageSequence(images, options);
  
  return createVideoFromImageSequence(enhancedImages, options.frameRate);
}

async function createEnhancedImageSequence(
  images: string[],
  options: VideoGenerationOptions
): Promise<string[]> {
  const enhancedSequence: string[] = [];
  
  for (let i = 0; i < images.length; i++) {
    const currentImage = images[i];
    const nextImage = images[i + 1];
    
    // Add the current frame
    enhancedSequence.push(currentImage);
    
    // Add interpolated frames for ultra-smooth transitions
    if (nextImage && options.frameInterpolation > 1) {
      for (let j = 1; j < options.frameInterpolation; j++) {
        const blend = j / options.frameInterpolation;
        const interpolatedFrame = await createInterpolatedFrame(
          currentImage,
          nextImage,
          blend,
          options
        );
        enhancedSequence.push(interpolatedFrame);
      }
    }
    
    // Add crossfaded frame for smoother transitions
    if (nextImage && options.crossfadeStrength > 0 && i < images.length - 1) {
      const crossfadedFrame = await createCrossfadedFrame(
        currentImage,
        nextImage,
        options.crossfadeStrength
      );
      enhancedSequence.push(crossfadedFrame);
    }
  }
  
  return enhancedSequence;
}

async function createInterpolatedFrame(
  image1: string,
  image2: string,
  blend: number,
  options: VideoGenerationOptions
): Promise<string> {
  const img1 = await loadImage(image1);
  const img2 = await loadImage(image2);
  
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  
  if (!ctx) {
    throw new Error("Could not create canvas context");
  }
  
  canvas.width = img1.width;
  canvas.height = img1.height;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw first image
  ctx.globalAlpha = 1 - blend;
  ctx.drawImage(img1, 0, 0);
  
  // Apply motion blur if enabled
  if (options.motionBlur) {
    ctx.filter = `blur(${blend * 2}px)`;
  }
  
  // Blend with second image
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = blend * 0.7; // Subtle blending
  ctx.drawImage(img2, 0, 0);
  
  // Reset context
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  
  return canvas.toDataURL('image/jpeg', 0.85);
}

async function createCrossfadedFrame(
  image1: string,
  image2: string,
  strength: number
): Promise<string> {
  const img1 = await loadImage(image1);
  const img2 = await loadImage(image2);
  
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  
  if (!ctx) {
    throw new Error("Could not create canvas context");
  }
  
  canvas.width = img1.width;
  canvas.height = img1.height;
  
  // Draw base image
  ctx.drawImage(img1, 0, 0);
  
  // Crossfade with next image
  ctx.globalAlpha = strength;
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(img2, 0, 0);
  
  // Reset context
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  
  return canvas.toDataURL('image/jpeg', 0.85);
}

async function createVideoFromImageSequence(
  images: string[],
  frameRate: number
): Promise<Blob> {
  // Create a canvas to draw frames
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  
  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  // Load the first image to get dimensions
  const firstImage = await loadImage(images[0]);
  canvas.width = firstImage.width;
  canvas.height = firstImage.height;

  // Create video using MediaRecorder API with codec fallbacks
  const stream = canvas.captureStream(frameRate);
  
  // Try different codec options in order of preference
  const codecOptions = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8", 
    "video/webm",
    "video/mp4"
  ];

  let mediaRecorder: MediaRecorder;
  let supportedMimeType: string | null = null;

  for (const mimeType of codecOptions) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      supportedMimeType = mimeType;
      break;
    }
  }

  if (!supportedMimeType) {
    throw new Error("No supported video codecs found in this browser");
  }

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: supportedMimeType,
  });

  const chunks: Blob[] = [];
  
  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const videoBlob = new Blob(chunks, { type: "video/webm" });
      resolve(videoBlob);
    };

    mediaRecorder.onerror = () => {
      reject(new Error("MediaRecorder error occurred"));
    };

    mediaRecorder.start();

    // Draw images to canvas at the specified frame rate
    let frameIndex = 0;
    const frameDuration = 1000 / frameRate;

    const drawNextFrame = async () => {
      if (frameIndex >= images.length) {
        mediaRecorder.stop();
        return;
      }

      const image = await loadImage(images[frameIndex]);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);

      frameIndex++;
      setTimeout(drawNextFrame, frameDuration);
    };

    drawNextFrame();
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}
