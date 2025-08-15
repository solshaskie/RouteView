import { useState, useEffect } from "react";
import { useGoogleMaps } from "@/react-app/hooks/useGoogleMaps";
import MapContainer from "@/react-app/components/MapContainer";
import MapLegend from "@/react-app/components/MapLegend";
import RouteInfo from "@/react-app/components/RouteInfo";
import VideoControls from "@/react-app/components/VideoControls";
import { RoutePoint } from "@/shared/types";
import { MapPin, Loader2, AlertCircle } from "lucide-react";

export default function Home() {
  const { isLoaded, error } = useGoogleMaps();
  const [pointA, setPointA] = useState<RoutePoint | null>(null);
  const [pointB, setPointB] = useState<RoutePoint | null>(null);
  const [route, setRoute] = useState<google.maps.DirectionsResult | null>(null);
  const [isSettingPointA, setIsSettingPointA] = useState(true);

  const handlePointASet = (point: RoutePoint) => {
    console.log('Point A set:', point);
    setPointA(point);
    setIsSettingPointA(false);
  };

  const handlePointBSet = (point: RoutePoint) => {
    console.log('Point B set:', point);
    setPointB(point);
  };

  const handleResetPoints = () => {
    setPointA(null);
    setPointB(null);
    setRoute(null);
    setIsSettingPointA(true);
  };

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    document.body.style.fontFamily = "Poppins, system-ui, sans-serif";
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Configuration Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please ensure your Google Maps API key is properly configured with the required APIs enabled.
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Loading StreetCruise</h2>
          <p className="text-gray-600">Initializing Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  StreetCruise
                </h1>
                <p className="text-sm text-gray-600">Create driving videos from Street View</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Map Section */}
          <div className="xl:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Interactive Route Planner</h2>
                <p className="text-gray-600 text-sm">
                  Click on the map to set your starting point (A), then click again to set your destination (B).
                </p>
              </div>
              
              <div className="relative">
                <MapContainer
                  onPointASet={handlePointASet}
                  onPointBSet={handlePointBSet}
                  onRouteCalculated={setRoute}
                  pointA={pointA}
                  pointB={pointB}
                  isSettingPointA={isSettingPointA}
                />
                
                {/* Map Legend Overlay */}
                <div className="absolute top-4 left-4 z-10">
                  <MapLegend
                    pointA={pointA}
                    pointB={pointB}
                    isSettingPointA={isSettingPointA}
                    onResetPoints={handleResetPoints}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Route Information */}
            <RouteInfo pointA={pointA} pointB={pointB} route={route} />

            {/* Video Controls */}
            <VideoControls 
              route={route} 
              disabled={!pointA || !pointB || !route} 
            />

            {/* Instructions Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Use</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Set Starting Point</p>
                    <p className="text-xs text-gray-600">Click anywhere on the map to place Point A</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Set Destination</p>
                    <p className="text-xs text-gray-600">Click again to place Point B and see the route</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Generate Video</p>
                    <p className="text-xs text-gray-600">Create a street view driving video of your route</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Download & Share</p>
                    <p className="text-xs text-gray-600">Save your video or share it with others</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
