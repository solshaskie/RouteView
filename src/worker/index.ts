import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generateWaypoints } from "./waypoints";
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import * as jpeg from "jpeg-js";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/api/maps-config", async (c) => {
  return c.json({
    apiKey: c.env.GOOGLE_MAPS_API_KEY,
  });
});

const videoRequestSchema = z.object({
  pointA: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  pointB: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  settings: z.any(),
});

app.post("/api/generate-video", zValidator("json", videoRequestSchema), async (c) => {
  const { pointA, pointB, settings } = c.req.valid("json");
  const apiKey = c.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return c.json({ error: "Google Maps API key not configured" }, 500);
  }

  try {
    const directionsUrl = new URL("https://maps.googleapis.com/maps/api/directions/json");
    directionsUrl.searchParams.set("origin", `${pointA.lat},${pointA.lng}`);
    directionsUrl.searchParams.set("destination", `${pointB.lat},${pointB.lng}`);
    directionsUrl.searchParams.set("key", apiKey);

    const directionsResponse = await fetch(directionsUrl.toString());
    if (!directionsResponse.ok) {
        const errorText = await directionsResponse.text();
        throw new Error(`Directions API error: ${directionsResponse.status} - ${errorText}`);
    }
    const directionsData = await directionsResponse.json();

    if (directionsData.status !== "OK" || !directionsData.routes || directionsData.routes.length === 0) {
      throw new Error(`Could not find a route. Status: ${directionsData.status}`);
    }

    const waypoints = generateWaypoints(
      directionsData,
      settings.intervalDistance || 20,
      settings.smoothness || 4
    );
    console.log(`Generated ${waypoints.length} waypoints.`);

    const imagePromises = waypoints.map(async (waypoint, index) => {
      try {
        await new Promise(resolve => setTimeout(resolve, index * 50));
        const streetViewUrl = new URL("https://maps.googleapis.com/maps/api/streetview");
        streetViewUrl.searchParams.set("size", `${settings.imageWidth || 640}x${settings.imageHeight || 640}`);
        streetViewUrl.searchParams.set("location", `${waypoint.lat},${waypoint.lng}`);
        streetViewUrl.searchParams.set("heading", waypoint.heading.toString());
        streetViewUrl.searchParams.set("pitch", "0");
        streetViewUrl.searchParams.set("fov", "90");
        streetViewUrl.searchParams.set("key", apiKey);
        const response = await fetch(streetViewUrl.toString());
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch image for waypoint ${index}. Status: ${response.status}. Error: ${errorText}`);
          return null;
        }
        const imageBuffer = await response.arrayBuffer();
        return Buffer.from(imageBuffer);
      } catch (e) {
        console.error(`An exception occurred while fetching image for waypoint ${index}:`, e);
        return null;
      }
    });

    const imageBuffers = (await Promise.all(imagePromises)).filter(img => img !== null) as Buffer[];
    if (imageBuffers.length === 0) {
      throw new Error("Could not generate any street view images for this route.");
    }
    console.log(`Successfully fetched ${imageBuffers.length} images.`);

    const decodedFrames = imageBuffers.map(buffer => jpeg.decode(buffer, { useTArray: true }));

    const { width, height } = decodedFrames[0];
    const gif = GIFEncoder();
    const delay = 1000 / (settings.frameRate || 10);

    for (const frame of decodedFrames) {
        const palette = quantize(frame.data, 256);
        const index = applyPalette(frame.data, palette);
        gif.writeFrame(index, width, height, { palette, delay });
    }

    gif.finish();
    const gifBuffer = gif.bytes();

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