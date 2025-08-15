import { useState } from "react";
import { useStreetViewVideo } from "@/react-app/hooks/useStreetViewVideo";
import { 
  Camera, 
  Video, 
  Download, 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Play,
  RotateCcw
} from "lucide-react";
import { RoutePoint } from "@/shared/types";

interface VideoControlsProps {
  route: google.maps.DirectionsResult | null;
  pointA: RoutePoint | null;
  pointB: RoutePoint | null;
  disabled?: boolean;
}

export default function VideoControls({ route, pointA, pointB, disabled }: VideoControlsProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    frameRate: 20,
    intervalDistance: 20, // meters - smaller for smoother video
    imageWidth: 640,
    imageHeight: 640,
    smoothness: 4, // interpolation factor for smoother transitions
    motionBlur: true, // enable motion blur for cinematic feel
    crossfadeStrength: 0.3, // crossfade between frames for smoothness
    frameInterpolation: 2, // additional interpolated frames between captures
  });

  const {
    isGenerating,
    progress,
    error,
    videoUrl,
    totalFrames,
    currentFrame,
    images,
    generateVideo,
    reset,
  } = useStreetViewVideo();

  const handleGenerateImages = async () => {
    if (!route || !pointA || !pointB) return;

    try {
      await generateVideo(pointA, pointB, settings);
    } catch (err) {
      console.error("Video generation failed:", err);
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;

    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = "streetcruise-video.webm";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    reset();
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Video Generator</h3>
            <p className="text-sm text-gray-600">Create street view driving videos</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${
            showSettings 
              ? 'bg-purple-100 text-purple-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
          disabled={isGenerating}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 space-y-4 border border-gray-200">
          <h4 className="font-medium text-gray-700 text-sm flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Video Settings
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Frame Rate (fps)
              </label>
              <select
                value={settings.frameRate}
                onChange={(e) => setSettings(prev => ({ ...prev, frameRate: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isGenerating}
              >
                <option value="10">10 fps</option>
                <option value="15">15 fps</option>
                <option value="20">20 fps</option>
                <option value="30">30 fps</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Video Quality
              </label>
              <select
                value={settings.intervalDistance}
                onChange={(e) => setSettings(prev => ({ ...prev, intervalDistance: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isGenerating}
              >
                <option value="10">Cinematic (10m)</option>
                <option value="20">Ultra Smooth (20m)</option>
                <option value="30">Smooth (30m)</option>
                <option value="50">Standard (50m)</option>
                <option value="100">Fast (100m)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Image Width
              </label>
              <select
                value={settings.imageWidth}
                onChange={(e) => setSettings(prev => ({ ...prev, imageWidth: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isGenerating}
              >
                <option value="400">400px</option>
                <option value="640">640px</option>
                <option value="800">800px</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Camera Smoothness
              </label>
              <select
                value={settings.smoothness}
                onChange={(e) => setSettings(prev => ({ ...prev, smoothness: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isGenerating}
              >
                <option value="2">Standard</option>
                <option value="3">Smooth</option>
                <option value="4">Cinematic</option>
                <option value="5">Ultra Cinematic</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Motion Effects
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={settings.motionBlur}
                    onChange={(e) => setSettings(prev => ({ ...prev, motionBlur: e.target.checked }))}
                    disabled={isGenerating}
                    className="rounded"
                  />
                  Motion Blur
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Frame Interpolation
              </label>
              <select
                value={settings.frameInterpolation}
                onChange={(e) => setSettings(prev => ({ ...prev, frameInterpolation: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isGenerating}
              >
                <option value="1">None</option>
                <option value="2">2x Frames</option>
                <option value="3">3x Frames</option>
                <option value="4">4x Frames</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Transition Smoothness
              </label>
              <select
                value={Math.round(settings.crossfadeStrength * 10)}
                onChange={(e) => setSettings(prev => ({ ...prev, crossfadeStrength: parseInt(e.target.value) / 10 }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isGenerating}
              >
                <option value="0">Sharp</option>
                <option value="2">Subtle</option>
                <option value="3">Smooth</option>
                <option value="5">Very Smooth</option>
              </select>
            </div>
          </div>

          <div className="bg-white/50 rounded p-3 space-y-2">
            <p className="text-xs text-gray-700 font-medium">Cinematic Quality Tips:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Cinematic Mode:</strong> Movie-like quality with ultra-smooth transitions</li>
              <li>• <strong>Motion Blur:</strong> Realistic speed effects during transitions</li>
              <li>• <strong>Frame Interpolation:</strong> Creates additional frames for liquid-smooth motion</li>
              <li>• <strong>Ultra Cinematic:</strong> Professional-grade camera smoothing</li>
            </ul>
          </div>
        </div>
      )}

      {/* Main Controls */}
      <div className="space-y-4">
        {!isGenerating && !videoUrl && !error && (
          <div className="text-center space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-4 text-center">
                <Camera className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-blue-900">Street View Images</div>
                <div className="text-xs text-blue-600">Capture route imagery</div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-lg p-4 text-center">
                <Video className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-purple-900">Video Stitching</div>
                <div className="text-xs text-purple-600">Create smooth video</div>
              </div>
            </div>

            <button
              onClick={handleGenerateImages}
              disabled={disabled || !route}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              <Play className="w-5 h-5" />
              Generate Cinematic Drive
            </button>

            {disabled && (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 border border-amber-200">
                Please set both Point A and Point B on the map to begin cinematic video generation
              </p>
            )}
          </div>
        )}

        {isGenerating && (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Creating Cinematic Experience</h4>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-lg font-bold text-purple-600 mb-1">
                {progress}% complete
              </p>
              {totalFrames > 0 && (
                <p className="text-sm text-gray-600">
                  Processing frame {currentFrame} of {totalFrames}
                </p>
              )}
              {images.length > 0 && (
                <p className="text-sm text-green-600 font-medium">
                  ✓ {images.length} street view images captured
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Generation Failed</h4>
              <p className="text-sm text-gray-600 mb-4 bg-red-50 rounded-lg p-3 border border-red-200">{error}</p>
            </div>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {videoUrl && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Cinematic Drive Ready!</h4>
              <p className="text-sm text-gray-600 mb-4">
                Your ultra-smooth, movie-quality driving experience is ready to watch
              </p>
            </div>

            {/* Generated GIF */}
            <img src={videoUrl} alt="Generated street view drive" className="rounded-lg shadow-lg w-full" />

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Download className="w-4 h-4" />
                Download GIF
              </button>
              
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                New
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
