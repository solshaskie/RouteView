import { RoutePoint } from "@/shared/types";

interface RouteInfoProps {
  pointA: RoutePoint | null;
  pointB: RoutePoint | null;
  route: google.maps.DirectionsResult | null;
}

export default function RouteInfo({ pointA, pointB, route }: RouteInfoProps) {
  if (!pointA || !pointB || !route) return null;

  const leg = route.routes[0]?.legs[0];
  if (!leg) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Route Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="font-medium text-gray-700">Point A (Start)</span>
          </div>
          <p className="text-sm text-gray-600 ml-6">
            {leg.start_address || `${pointA.lat.toFixed(6)}, ${pointA.lng.toFixed(6)}`}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="font-medium text-gray-700">Point B (End)</span>
          </div>
          <p className="text-sm text-gray-600 ml-6">
            {leg.end_address || `${pointB.lat.toFixed(6)}, ${pointB.lng.toFixed(6)}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{leg.distance?.text}</div>
          <div className="text-sm text-gray-500">Distance</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{leg.duration?.text}</div>
          <div className="text-sm text-gray-500">Duration</div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h4 className="font-medium text-gray-700 mb-2">Street View Video</h4>
        <p className="text-sm text-gray-600">
          Use the Video Generator below to create a street view driving video along this route. The system will capture street view images at regular intervals and stitch them into a smooth driving experience.
        </p>
      </div>
    </div>
  );
}
