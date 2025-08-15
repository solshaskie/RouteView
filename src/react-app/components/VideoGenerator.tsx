import { useState } from "react";
import { useStreetViewVideo } from "@/react-app/hooks/useStreetViewVideo";
import { Play, Download, Settings, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface VideoGeneratorProps {
  route: google.maps.DirectionsResult | null;
  disabled?: boolean;
}

export default function VideoGenerator({ route, disabled }: VideoGeneratorProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    frameRate: 10,
    intervalDistance: 50, // meters
    imageWidth: 640,
    imageHeight: 640,
    smoothness: 3,
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

  const handleGenerate = async () => {
    if (!route) return;

    try {
      await generateVideo(route, settings);
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
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Video Generator</h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          disabled={isGenerating}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <h4 className="font-medium text-gray-700 text-sm">Video Settings</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Frame Rate (fps)
              </label>
              <input
                type="number"
                min="5"
                max="30"
                value={settings.frameRate}
                onChange={(e) => setSettings(prev => ({ ...prev, frameRate: parseInt(e.target.value) }))}
                className="w-full px-2 py-1 text-sm border rounded"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Distance (m)
              </label>
              <input
                type="number"
                min="10"
                max="200"
                value={settings.intervalDistance}
                onChange={(e) => setSettings(prev => ({ ...prev, intervalDistance: parseInt(e.target.value) }))}
                className="w-full px-2 py-1 text-sm border rounded"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Image Width
              </label>
              <select
                value={settings.imageWidth}
                onChange={(e) => setSettings(prev => ({ ...prev, imageWidth: parseInt(e.target.value) }))}
                className="w-full px-2 py-1 text-sm border rounded"
                disabled={isGenerating}
              >
                <option value="400">400px</option>
                <option value="640">640px</option>
                <option value="800">800px</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Image Height
              </label>
              <select
                value={settings.imageHeight}
                onChange={(e) => setSettings(prev => ({ ...prev, imageHeight: parseInt(e.target.value) }))}
                className="w-full px-2 py-1 text-sm border rounded"
                disabled={isGenerating}
              >
                <option value="400">400px</option>
                <option value="640">640px</option>
                <option value="800">800px</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Lower distance values create smoother videos but take longer to generate.
            Higher frame rates create smoother playback but larger files.
          </p>
        </div>
      )}

      {/* Status Display */}
      <div className="space-y-4">
        {!isGenerating && !videoUrl && !error && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-gray-600 mb-4">
              Ready to generate your street view driving video
            </p>
            <button
              onClick={handleGenerate}
              disabled={disabled || !route}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              Generate Video
            </button>
            {disabled && (
              <p className="text-xs text-gray-500 mt-2">
                Please set both Point A and Point B to generate a video
              </p>
            )}
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Generating Video</h4>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {progress}% complete
            </p>
            {totalFrames > 0 && (
              <p className="text-xs text-gray-500">
                Processing frame {currentFrame} of {totalFrames}
              </p>
            )}
            {images.length > 0 && (
              <p className="text-xs text-gray-500">
                {images.length} street view images generated
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Generation Failed</h4>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {videoUrl && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Video Generated!</h4>
              <p className="text-sm text-gray-600 mb-4">
                Your street view driving video is ready
              </p>
            </div>

            {/* Video Player */}
            <div className="bg-black rounded-lg overflow-hidden">
              <video
                src={videoUrl}
                controls
                className="w-full max-h-64 object-contain"
                autoPlay
                loop
                muted
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Download className="w-4 h-4" />
                Download Video
              </button>
              
              <button
                onClick={handleReset}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Generate New
              </button>
            </div>

            {/* Video Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
              <div>
                <div className="font-medium text-gray-700">Frames</div>
                <div className="text-gray-600">{images.length}</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Frame Rate</div>
                <div className="text-gray-600">{settings.frameRate} fps</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Resolution</div>
                <div className="text-gray-600">{settings.imageWidth}x{settings.imageHeight}</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Duration</div>
                <div className="text-gray-600">
                  ~{Math.round(images.length / settings.frameRate)}s
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
