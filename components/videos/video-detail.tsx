"use client";

import { useState, useTransition } from "react";
import { updateVideoTranscript } from "@/app/actions/videos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Video, type DeepgramTranscript } from "@/lib/types/video";
import {
  Calendar,
  Download,
  Edit,
  FileText,
  Play,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  Upload,
  ExternalLink,
  Folder,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface VideoDetailProps {
  video: Video & {
    projects?: {
      project_title: string;
      user_id: string;
    };
  };
  onUpdate?: () => void;
}

export function VideoDetail({ video, onUpdate }: VideoDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "uploaded":
        return <Upload className="h-5 w-5" />;
      case "transcribing":
        return <Clock className="h-5 w-5" />;
      case "transcribed":
        return <CheckCircle className="h-5 w-5" />;
      case "error":
        return <XCircle className="h-5 w-5" />;
      default:
        return <Upload className="h-5 w-5" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "uploaded":
        return "default";
      case "transcribing":
        return "secondary";
      case "transcribed":
        return "outline";
      case "error":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getFileName = (storagePath: string) => {
    return storagePath.split("/").pop() || storagePath;
  };

  const getTranscriptText = (): string => {
    if (!video.transcript_text) return "";

    try {
      // Handle Deepgram format
      if (
        video.transcript_text.results?.channels?.[0]?.alternatives?.[0]
          ?.transcript
      ) {
        return video.transcript_text.results.channels[0].alternatives[0]
          .transcript;
      }

      // Handle simple text format
      if (typeof video.transcript_text === "string") {
        return video.transcript_text;
      }

      // Handle other possible formats
      if (video.transcript_text.transcript) {
        return video.transcript_text.transcript;
      }

      return JSON.stringify(video.transcript_text, null, 2);
    } catch (error) {
      return "Error parsing transcript";
    }
  };

  const copyTranscript = async () => {
    const text = getTranscriptText();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  const downloadTranscript = () => {
    const text = getTranscriptText();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${getFileName(video.storage_path)}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds: number): string => {
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

  const getTranscriptMetadata = () => {
    if (!video.transcript_text) return null;

    const metadata = video.transcript_text;
    return {
      duration: metadata.duration ? formatDuration(metadata.duration) : null,
      channels: metadata.channels,
      models: metadata.models?.join(", "),
      created: metadata.created
        ? new Date(metadata.created).toLocaleString()
        : null,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold mb-2">
            {getFileName(video.storage_path)}
          </h1>
          {video.projects && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Folder className="h-4 w-4" />
              <Link
                href={`/projects/${video.project_id}`}
                className="text-primary hover:underline"
              >
                {video.projects.project_title || "Untitled Project"}
              </Link>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/videos/${video.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Video Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Video Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Status:</span>
            <Badge
              variant={getStatusVariant(video.status) as any}
              className="capitalize"
            >
              {getStatusIcon(video.status)}
              <span className="ml-2">{video.status}</span>
            </Badge>
          </div>

          {/* Storage Path */}
          <div className="flex items-start gap-3">
            <span className="text-sm font-medium">Storage Path:</span>
            <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
              {video.storage_path}
            </code>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Created:</span>
            <span className="text-sm text-muted-foreground">
              {formatDate(video.created_at)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Transcript Card */}
      <Card id="transcript">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transcript
            </CardTitle>
            {video.transcript_text && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyTranscript}
                  disabled={isPending}
                >
                  {copiedTranscript ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copiedTranscript ? "Copied!" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTranscript}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!video.transcript_text ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="mb-2">No transcript available</p>
              <p className="text-sm">
                {video.status === "uploaded" &&
                  "Upload a video to generate a transcript"}
                {video.status === "transcribing" &&
                  "Transcript is being generated..."}
                {video.status === "error" &&
                  "An error occurred during transcription"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Transcript Metadata */}
              {(() => {
                const metadata = getTranscriptMetadata();
                return (
                  metadata && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">
                        Transcript Details
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {metadata.duration && (
                          <div>
                            <span className="text-muted-foreground">
                              Duration:
                            </span>
                            <div className="font-medium">
                              {metadata.duration}
                            </div>
                          </div>
                        )}
                        {metadata.channels && (
                          <div>
                            <span className="text-muted-foreground">
                              Channels:
                            </span>
                            <div className="font-medium">
                              {metadata.channels}
                            </div>
                          </div>
                        )}
                        {metadata.models && (
                          <div>
                            <span className="text-muted-foreground">
                              Model:
                            </span>
                            <div className="font-medium">{metadata.models}</div>
                          </div>
                        )}
                        {metadata.created && (
                          <div>
                            <span className="text-muted-foreground">
                              Generated:
                            </span>
                            <div className="font-medium">
                              {metadata.created}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                );
              })()}

              {/* Transcript Text */}
              <div className="border rounded-lg p-4">
                <div className="prose max-w-none">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {showFullTranscript
                      ? getTranscriptText()
                      : getTranscriptText().slice(0, 500) +
                        (getTranscriptText().length > 500 ? "..." : "")}
                  </p>
                </div>
                {getTranscriptText().length > 500 && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowFullTranscript(!showFullTranscript)}
                    className="mt-2 p-0 h-auto"
                  >
                    {showFullTranscript ? "Show Less" : "Show More"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
