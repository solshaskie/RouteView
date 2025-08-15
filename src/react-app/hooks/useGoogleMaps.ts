import { useEffect, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

interface GoogleMapsConfig {
  apiKey: string;
}

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGoogleMaps() {
      try {
        // Fetch API key from backend
        const response = await fetch("/api/maps-config");
        if (!response.ok) {
          throw new Error("Failed to fetch maps configuration");
        }
        
        const config: GoogleMapsConfig = await response.json();
        
        if (!config.apiKey) {
          throw new Error("Google Maps API key not configured");
        }

        const loader = new Loader({
          apiKey: config.apiKey,
          version: "weekly",
          libraries: ["places", "geometry"],
        });

        await loader.load();
        
        if (isMounted) {
          setIsLoaded(true);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load Google Maps");
        }
      }
    }

    loadGoogleMaps();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isLoaded, error };
}
