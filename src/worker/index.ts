import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

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

export default app;
