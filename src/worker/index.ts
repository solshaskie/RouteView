import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generateWaypoints } from "./waypoints";
import { blendImages } from "./image-processing";
import { GifFrame, GifUtil, GifCodec } from "gifwrap";
import * as jpeg from "jpeg-js";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// Endpoint to get Google Maps API key
app.get("/api/maps-config", async (c) => {
  return c.json({
    apiKey: c.env.GOOGLE_MAPS_API_KEY,
  });
});

// Street View Image Generation endpoint
const streetViewRequestSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  width: z.number().min(100).max(800),
  height: z.number().min(100).max(800),
  heading: z.number().min(0).max(360),
  pitch: z.number().min(-90).max(90).default(0),
  fov: z.number().min(10).max(120).default(90),
});

app.post("/api/streetview-image", zValidator("json", streetViewRequestSchema), async (c) => {
  const { lat, lng, width, height, heading, pitch, fov } = c.req.valid("json");
  
  const apiKey = c.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return c.json({ error: "Google Maps API key not configured" }, 500);
  }

  try {
    // Construct Google Street View Static API URL
    const streetViewUrl = new URL("https://maps.googleapis.com/maps/api/streetview");
    streetViewUrl.searchParams.set("size", `${width}x${height}`);
    streetViewUrl.searchParams.set("location", `${lat},${lng}`);
    streetViewUrl.searchParams.set("heading", heading.toString());
    streetViewUrl.searchParams.set("pitch", pitch.toString());
    streetViewUrl.searchParams.set("fov", fov.toString());
    streetViewUrl.searchParams.set("key", apiKey);

    // Fetch the image from Google Street View Static API
    const response = await fetch(streetViewUrl.toString());
    
    if (!response.ok) {
      throw new Error(`Street View API error: ${response.status}`);
    }

    // Get the image as an array buffer
    const imageBuffer = await response.arrayBuffer();
    
    // Convert to base64 data URL for easy embedding
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    return c.json({
      imageUrl: dataUrl,
      location: { lat, lng },
      heading,
      pitch,
      fov,
    });
  } catch (error) {
    console.error("Street View image generation error:", error);
    return c.json(
      { error: "Failed to generate street view image" },
      500
    );
  }
});

// Video Generation endpoint
const videoRequestSchema = z.object({
  pointA: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  pointB: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  settings: z.any(), // For now, we'll accept any settings
});

app.post("/api/generate-video", zValidator("json", videoRequestSchema), async (c) => {
  const { pointA, pointB, settings } = c.req.valid("json");
  const apiKey = c.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return c.json({ error: "Google Maps API key not configured" }, 500);
  }

  try {
    // 1. Get route from Google Directions API
    const directionsUrl = new URL("https://maps.googleapis.com/maps/api/directions/json");
    directionsUrl.searchParams.set("origin", `${pointA.lat},${pointA.lng}`);
    directionsUrl.searchParams.set("destination", `${pointB.lat},${pointB.lng}`);
    directionsUrl.searchParams.set("key", apiKey);

    const directionsResponse = await fetch(directionsUrl.toString());
    if (!directionsResponse.ok) {
      throw new Error(`Directions API error: ${directionsResponse.status}`);
    }
    const directionsData = await directionsResponse.json();

    if (directionsData.status !== "OK" || !directionsData.routes || directionsData.routes.length === 0) {
      throw new Error(`Could not find a route. Status: ${directionsData.status}`);
    }

    // 2. Generate waypoints from the route
    // The settings object from the client might not have the correct structure,
    // so we'll use default values for now.
    const waypoints = generateWaypoints(
      directionsData,
      settings.intervalDistance || 20,
      settings.smoothness || 4
    );

    console.log(`Generated ${waypoints.length} waypoints.`);

    // 3. Fetch street view images for each waypoint
    const imagePromises = waypoints.map(async (waypoint, index) => {
      // Add a small delay to avoid hitting rate limits too hard
      await new Promise(resolve => setTimeout(resolve, index * 100));

      const streetViewUrl = new URL("https://maps.googleapis.com/maps/api/streetview");
      streetViewUrl.searchParams.set("size", `${settings.imageWidth || 640}x${settings.imageHeight || 640}`);
      streetViewUrl.searchParams.set("location", `${waypoint.lat},${waypoint.lng}`);
      streetViewUrl.searchParams.set("heading", waypoint.heading.toString());
      streetViewUrl.searchParams.set("pitch", "0");
      streetViewUrl.searchParams.set("fov", "90");
      streetViewUrl.searchParams.set("key", apiKey);

      const response = await fetch(streetViewUrl.toString());
      if (!response.ok) {
        console.warn(`Failed to fetch image for waypoint ${index}. Status: ${response.status}`);
        return null; // Return null for failed images
      }
      const imageBuffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
      return `data:image/jpeg;base64,${base64}`;
    });

    const images = (await Promise.all(imagePromises)).filter(img => img !== null) as string[];

    if (images.length === 0) {
      throw new Error("Could not generate any street view images for this route.");
    }

    console.log(`Successfully fetched ${images.length} images.`);

    // 4. Decode all JPEGs into raw image data buffers
    const decodedFrames = images.map(image => {
      const base64Data = image.substring(image.indexOf(',') + 1);
      const jpegData = Buffer.from(base64Data, 'base64');
      return jpeg.decode(jpegData, { useTArray: true });
    });

    // 5. Create enhanced image sequence with interpolation
    const enhancedFrames: {data: Uint8Array, width: number, height: number}[] = [];
    const interpolationFactor = settings.frameInterpolation || 1;

    for (let i = 0; i < decodedFrames.length - 1; i++) {
      const currentFrame = decodedFrames[i];
      const nextFrame = decodedFrames[i+1];

      // Add the original frame
      enhancedFrames.push(currentFrame);

      // Add interpolated frames
      if (interpolationFactor > 1) {
        for (let j = 1; j < interpolationFactor; j++) {
          const ratio = j / interpolationFactor;
          const blendedData = blendImages(currentFrame.data, nextFrame.data, ratio);
          enhancedFrames.push({
            data: blendedData,
            width: currentFrame.width,
            height: currentFrame.height,
          });
        }
      }
    }
    // Add the very last frame
    if (decodedFrames.length > 0) {
      enhancedFrames.push(decodedFrames[decodedFrames.length - 1]);
    }

    // 6. Encode the enhanced frames into a GIF
    const gifFrames: GifFrame[] = enhancedFrames.map(frameData => {
      const frame = new GifFrame(frameData.width, frameData.height, {
        delayCentisecs: 100 / (settings.frameRate || 10) / interpolationFactor,
      });
      frame.bitmap.data.set(frameData.data);
      return frame;
    });

    const codec = new GifCodec();
    const gifBuffer = await codec.encodeGif(gifFrames, {});

    // Return the GIF file
    c.header('Content-Type', 'image/gif');
    c.header('Content-Disposition', 'attachment; filename="streetcruise.gif"');
    return c.body(gifBuffer.buffer);
  } catch (error) {
    console.error("Video generation error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to generate video" },
      500
    );
  }
});

export default app;
