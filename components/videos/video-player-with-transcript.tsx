"use client";

import { useState, useEffect, useRef } from "react";
import {
  InteractiveVideoPlayer,
  type VideoPlayerRef,
} from "./interactive-video-player";
import { InteractiveTranscript } from "./interactive-transcript";
import { getVideoPublicUrl } from "@/app/actions/videos";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, Video as VideoIcon } from "lucide-react";
import { type Video } from "@/lib/types/video";

interface VideoPlayerWithTranscriptProps {
  video: Video & {
    projects?: {
      project_title: string;
      user_id: string;
    };
  };
  className?: string;
}

export function VideoPlayerWithTranscript({
  video,
  className,
}: VideoPlayerWithTranscriptProps) {
  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(true);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Fetch video public URL
  useEffect(() => {
    const fetchVideoUrl = async () => {
      setIsLoadingUrl(true);
      setUrlError(null);

      try {
        const result = await getVideoPublicUrl(video.storage_path);

        if (result.success && result.data) {
          setPublicUrl(result.data.publicUrl);
        } else {
          setUrlError(result.error || "Failed to get video URL");
        }
      } catch (error) {
        setUrlError("Error fetching video URL");
        console.error("Error fetching video URL:", error);
      } finally {
        setIsLoadingUrl(false);
      }
    };

    fetchVideoUrl();
  }, [video.storage_path]);

  const handleTimeUpdate = (newTime: number) => {
    setCurrentTime(newTime);
  };

  const handleWordClick = (startTime: number) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(startTime);
    }
  };

  const handleVideoSeek = (time: number) => {
    setCurrentTime(time);
  };

  // Show loading state while fetching URL
  if (isLoadingUrl) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Loader2 className="h-12 w-12 animate-spin" />
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Loading Video</h3>
                <p className="text-sm">Getting video URL...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state if URL fetch failed
  if (urlError || !publicUrl) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex items-center gap-3 p-4 border border-red-200 bg-red-50 rounded-lg text-red-700">
                <AlertCircle className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold">Unable to Load Video</h3>
                  <p className="text-sm mt-1">
                    {urlError || "Video URL not available"}
                  </p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Possible reasons:</p>
                <ul className="mt-2 text-left list-disc list-inside space-y-1">
                  <li>Video file may not exist in storage</li>
                  <li>You may not have permission to access this video</li>
                  <li>Network connectivity issues</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if video has transcript data for interactive features
  const hasInteractiveTranscript =
    Array.isArray(video.transcript_data_full) &&
    video.transcript_data_full.length > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Video Player */}
      <InteractiveVideoPlayer
        ref={videoPlayerRef}
        video={video}
        publicUrl={publicUrl}
        onTimeUpdate={handleTimeUpdate}
        onSeek={handleVideoSeek}
      />

      {/* Transcript Section */}
      {hasInteractiveTranscript ? (
        <InteractiveTranscript
          transcriptData={video.transcript_data_full}
          currentTime={currentTime}
          onWordClick={handleWordClick}
          highlightCurrentWord={true}
        />
      ) : (
        /* Fallback for videos without word-level timestamps */
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <VideoIcon className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Transcript</h3>
              </div>

              {video.transcript_text ? (
                <div className="space-y-4">
                  <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground">
                    <p>
                      This video has a transcript but not word-level timestamps.
                      Interactive features are not available.
                    </p>
                  </div>

                  <div className="prose max-w-none">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {typeof video.transcript_text === "string"
                        ? video.transcript_text
                        : video.transcript_text?.results?.channels?.[0]
                            ?.alternatives?.[0]?.transcript ||
                          JSON.stringify(video.transcript_text, null, 2)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <VideoIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="mb-2">No transcript available</p>
                  <p className="text-sm">
                    {video.status === "uploaded" &&
                      "Video needs to be transcribed"}
                    {video.status === "transcribing" &&
                      "Transcript is being generated..."}
                    {video.status === "error" &&
                      "An error occurred during transcription"}
                    {video.status === "transcribed" &&
                      "Transcript data may be corrupted"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
