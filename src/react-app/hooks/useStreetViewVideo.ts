import { useState } from "react";
import { RoutePoint } from "@/shared/types";

interface StreetViewVideoState {
  isGenerating: boolean;
  progress: number;
  error: string | null;
  videoUrl: string | null;
  totalFrames: number;
  currentFrame: number;
  images: string[];
}

interface VideoGenerationOptions {
  frameRate: number;
  intervalDistance: number;
  imageWidth: number;
  imageHeight: number;
  smoothness: number;
  motionBlur: boolean;
  crossfadeStrength: number;
  frameInterpolation: number;
}

export function useStreetViewVideo() {
  const [state, setState] = useState<StreetViewVideoState>({
    isGenerating: false,
    progress: 0,
    error: null,
    videoUrl: null,
    totalFrames: 0,
    currentFrame: 0,
    images: [],
  });

  const generateVideo = async (
    pointA: RoutePoint,
    pointB: RoutePoint,
    options: VideoGenerationOptions
  ) => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      progress: 0,
      error: null,
      videoUrl: null,
      images: [],
    }));

    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pointA: pointA,
          pointB: pointB,
          settings: options,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Video generation failed");
      }

      const videoBlob = await response.blob();
      const videoUrl = URL.createObjectURL(videoBlob);

      setState(prev => ({
        ...prev,
        isGenerating: false,
        progress: 100,
        videoUrl,
      }));

      return videoUrl;

    } catch (error) {
      console.error("Full error object:", error);
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }));
      throw error;
    }
  };

  const reset = () => {
    setState({
      isGenerating: false,
      progress: 0,
      error: null,
      videoUrl: null,
      totalFrames: 0,
      currentFrame: 0,
      images: [],
    });
  };

  return {
    ...state,
    generateVideo,
    reset,
  };
}