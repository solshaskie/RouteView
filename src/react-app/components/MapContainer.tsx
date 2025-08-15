import { useEffect, useRef, useState } from "react";
import { RoutePoint } from "@/shared/types";

interface MapContainerProps {
  onPointASet: (point: RoutePoint) => void;
  onPointBSet: (point: RoutePoint) => void;
  onRouteCalculated: (route: google.maps.DirectionsResult) => void;
  pointA: RoutePoint | null;
  pointB: RoutePoint | null;
  isSettingPointA: boolean;
}

export default function MapContainer({
  onPointASet,
  onPointBSet,
  onRouteCalculated,
  pointA,
  pointB,
  isSettingPointA: parentIsSettingPointA,
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerA, setMarkerA] = useState<google.maps.Marker | null>(null);
  const [markerB, setMarkerB] = useState<google.maps.Marker | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  

  

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const mapInstance = new google.maps.Map(mapRef.current, {
      zoom: 10,
      center: { lat: 37.7749, lng: -122.4194 }, // San Francisco default
      mapTypeId: google.maps.MapTypeId.ROADMAP,
    });

    const renderer = new google.maps.DirectionsRenderer({
      draggable: true,
      panel: undefined,
    });
    
    renderer.setMap(mapInstance);
    setDirectionsRenderer(renderer);
    setMap(mapInstance);

    return () => {
      if (markerA) markerA.setMap(null);
      if (markerB) markerB.setMap(null);
      if (renderer) renderer.setMap(null);
    };
  }, []); // Only run once on mount

  // Update click listener when parentIsSettingPointA changes
  useEffect(() => {
    if (!map) return;

    // Remove all existing click listeners
    google.maps.event.clearListeners(map, 'click');

    // Add click listener for placing markers
    const handleMapClick = (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;

      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      console.log('Map clicked, isSettingPointA:', parentIsSettingPointA);

      if (parentIsSettingPointA) {
        // Remove existing marker A
        if (markerA) {
          markerA.setMap(null);
        }

        // Create new marker A
        const newMarkerA = new google.maps.Marker({
          position: { lat, lng },
          map: map,
          title: "Point A (Start)",
          label: "A",
          icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
          },
        });

        setMarkerA(newMarkerA);
        onPointASet({ lat, lng });

        // Keep the map centered on Point A with a good zoom level
        map.setCenter({ lat, lng });
        map.setZoom(14);
      } else {
        // Remove existing marker B
        if (markerB) {
          markerB.setMap(null);
        }

        // Create new marker B
        const newMarkerB = new google.maps.Marker({
          position: { lat, lng },
          map: map,
          title: "Point B (End)",
          label: "B",
          icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
          },
        });

        setMarkerB(newMarkerB);
        onPointBSet({ lat, lng });
      }
    };

    map.addListener("click", handleMapClick);
  }, [map, parentIsSettingPointA, markerA, markerB, onPointASet, onPointBSet]);

  // Calculate route when both points are set
  useEffect(() => {
    if (!pointA || !pointB || !map || !directionsRenderer) return;

    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: new google.maps.LatLng(pointA.lat, pointA.lng),
        destination: new google.maps.LatLng(pointB.lat, pointB.lng),
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);
          onRouteCalculated(result);
        }
      }
    );
  }, [pointA, pointB, map, directionsRenderer, onRouteCalculated]);

  

  return (
    <div className="relative">
      <div ref={mapRef} className="w-full h-[600px] rounded-lg shadow-lg" />
    </div>
  );
}
