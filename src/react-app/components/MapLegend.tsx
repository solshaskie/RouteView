import { RoutePoint } from "@/shared/types";
import { MapPin, Navigation } from "lucide-react";

interface MapLegendProps {
  pointA: RoutePoint | null;
  pointB: RoutePoint | null;
  isSettingPointA: boolean;
  onResetPoints: () => void;
}

export default function MapLegend({ pointA, pointB, isSettingPointA, onResetPoints }: MapLegendProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          Route Points
        </h3>
        <button
          onClick={onResetPoints}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-gray-600"
        >
          Reset
        </button>
      </div>

      {/* Point A */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            A
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-gray-700">Starting Point</div>
            {pointA ? (
              <div className="text-xs text-gray-500 truncate">
                {pointA.lat.toFixed(4)}, {pointA.lng.toFixed(4)}
              </div>
            ) : (
              <div className={`text-xs ${isSettingPointA ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                {isSettingPointA ? 'Click on map to set' : 'Not set'}
              </div>
            )}
          </div>
          {pointA && (
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          )}
        </div>

        {/* Point B */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            B
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-gray-700">Destination</div>
            {pointB ? (
              <div className="text-xs text-gray-500 truncate">
                {pointB.lat.toFixed(4)}, {pointB.lng.toFixed(4)}
              </div>
            ) : (
              <div className={`text-xs ${!isSettingPointA && pointA && !pointB ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                {!isSettingPointA && pointA && !pointB ? 'Click on map to set' : 'Not set'}
              </div>
            )}
          </div>
          {pointB && (
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          )}
        </div>
      </div>

      {/* Route Status */}
      {pointA && pointB && (
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-green-600">
            <Navigation className="w-3 h-3" />
            <span className="font-medium">Route calculated</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-500 pt-1 border-t border-gray-100">
        {!pointA ? (
          "Click anywhere on the map to set your starting point (A)"
        ) : !pointB ? (
          "Click on the map to set your destination (B)"
        ) : (
          "Route is ready for video generation"
        )}
      </div>
    </div>
  );
}
