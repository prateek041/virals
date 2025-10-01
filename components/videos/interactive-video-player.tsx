"use client";

import {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, Play } from "lucide-react";
import { type Video } from "@/lib/types/video";

interface InteractiveVideoPlayerProps {
  video: Video;
  publicUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
  onSeek?: (time: number) => void;
  className?: string;
}

export interface VideoPlayerRef {
  seekTo: (time: number) => void;
  getCurrentTime: () => number;
  play: () => void;
  pause: () => void;
}

export const InteractiveVideoPlayer = forwardRef<
  VideoPlayerRef,
  InteractiveVideoPlayerProps
>(({ video, publicUrl, onTimeUpdate, onSeek, className }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Expose video control methods through ref
  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        onSeek?.(time);
      }
    },
    getCurrentTime: () => videoRef.current?.currentTime || 0,
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
  }));

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const newTime = videoRef.current.currentTime;
      setCurrentTime(newTime);
      onTimeUpdate?.(newTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
      setError(null);
    }
  };

  const handleError = () => {
    setIsLoading(false);
    setError(
      "Failed to load video. Please check if the video file exists and is accessible."
    );
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handleWaiting = () => {
    setIsLoading(true);
  };

  const handleCanPlayThrough = () => {
    setIsLoading(false);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      // Add event listeners
      videoElement.addEventListener("timeupdate", handleTimeUpdate);
      videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.addEventListener("error", handleError);
      videoElement.addEventListener("canplay", handleCanPlay);
      videoElement.addEventListener("waiting", handleWaiting);
      videoElement.addEventListener("canplaythrough", handleCanPlayThrough);

      // Add keyboard shortcuts
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target === videoElement) {
          switch (e.key) {
            case " ": // Spacebar for play/pause
              e.preventDefault();
              if (videoElement.paused) {
                videoElement.play();
              } else {
                videoElement.pause();
              }
              break;
            case "ArrowLeft": // Left arrow for -5 seconds
              e.preventDefault();
              videoElement.currentTime = Math.max(
                0,
                videoElement.currentTime - 5
              );
              break;
            case "ArrowRight": // Right arrow for +5 seconds
              e.preventDefault();
              videoElement.currentTime = Math.min(
                videoElement.duration,
                videoElement.currentTime + 5
              );
              break;
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);

      return () => {
        // Cleanup event listeners
        videoElement.removeEventListener("timeupdate", handleTimeUpdate);
        videoElement.removeEventListener(
          "loadedmetadata",
          handleLoadedMetadata
        );
        videoElement.removeEventListener("error", handleError);
        videoElement.removeEventListener("canplay", handleCanPlay);
        videoElement.removeEventListener("waiting", handleWaiting);
        videoElement.removeEventListener(
          "canplaythrough",
          handleCanPlayThrough
        );
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, []);

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 p-4 border border-red-200 bg-red-50 rounded-lg text-red-700">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-sm z-10">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading video...</p>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            src={publicUrl}
            controls
            className="w-full h-auto rounded-lg"
            preload="metadata"
            onError={handleError}
            style={{
              aspectRatio: "16/9",
              maxHeight: "500px",
              objectFit: "contain",
            }}
          >
            Your browser does not support the video tag.
          </video>

          {/* Video Info Overlay */}
          {duration > 0 && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          )}
        </div>

        {/* Video Metadata */}
        <div className="p-4 border-t">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Play className="h-4 w-4" />
                <span>Status: {video.status}</span>
              </div>
              {duration > 0 && <span>Duration: {formatTime(duration)}</span>}
            </div>
            <div>{video.storage_path.split("/").pop()}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

InteractiveVideoPlayer.displayName = "InteractiveVideoPlayer";
