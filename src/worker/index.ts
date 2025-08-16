import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/api/maps-config", async (c) => {
  return c.json({
    apiKey: c.env.GOOGLE_MAPS_API_KEY,
  });
});

// Simplified endpoint for testing
app.post("/api/generate-video", async (c) => {
  const apiKey = c.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return c.json({ error: "Google Maps API key not configured" }, 500);
  }

  try {
    console.log("Attempting to fetch a single hardcoded Street View image...");

    const streetViewUrl = new URL("https://maps.googleapis.com/maps/api/streetview");
    streetViewUrl.searchParams.set("size", `640x640`);
    // Coordinates for the Empire State Building
    streetViewUrl.searchParams.set("location", `40.7484405,-73.9856644`);
    streetViewUrl.searchParams.set("radius", "100");
    streetViewUrl.searchParams.set("key", apiKey);

    const response = await fetch(streetViewUrl.toString());
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Simple fetch failed. Status: ${response.status}. Error: ${errorText}`);
        throw new Error(`Simple fetch failed: ${errorText}`);
    }
    
    const imageBuffer = await response.arrayBuffer();
    console.log("Successfully fetched the image!");

    c.header('Content-Type', 'image/jpeg');
    return c.body(imageBuffer);

  } catch (error) {
    console.error("Video generation error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to generate video" },
      500
    );
  }
});

export default app;