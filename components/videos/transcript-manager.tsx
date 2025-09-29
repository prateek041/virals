"use client";

import { useState, useTransition } from "react";
import { updateVideoTranscript } from "@/app/actions/videos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  type Video,
  type DeepgramTranscript,
  type TranscriptStatus,
  videoStatusValues,
} from "@/lib/types/video";
import {
  FileText,
  Save,
  X,
  Copy,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Upload,
  RefreshCw,
  Eye,
  Edit3,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface TranscriptManagerProps {
  video: Video;
  onUpdate?: () => void;
  onCancel?: () => void;
}

export function TranscriptManager({
  video,
  onUpdate,
  onCancel,
}: TranscriptManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [status, setStatus] = useState<TranscriptStatus>(video.status);
  const [transcript, setTranscript] = useState(video.transcript);
  const [transcriptText, setTranscriptText] = useState(() => {
    return getTranscriptText(video.transcript);
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  function getTranscriptText(transcriptData: any): string {
    if (!transcriptData) return "";

    try {
      // Handle Deepgram format
      if (
        transcriptData.results?.channels?.[0]?.alternatives?.[0]?.transcript
      ) {
        return transcriptData.results.channels[0].alternatives[0].transcript;
      }

      // Handle simple text format
      if (typeof transcriptData === "string") {
        return transcriptData;
      }

      // Handle other possible formats
      if (transcriptData.transcript) {
        return transcriptData.transcript;
      }

      return JSON.stringify(transcriptData, null, 2);
    } catch (error) {
      return "Error parsing transcript";
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "uploaded":
        return <Upload className="h-4 w-4" />;
      case "transcribing":
        return <Clock className="h-4 w-4" />;
      case "transcribed":
        return <CheckCircle className="h-4 w-4" />;
      case "error":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Upload className="h-4 w-4" />;
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

  const handleSave = () => {
    setErrors({});

    startTransition(async () => {
      try {
        let processedTranscript = null;

        if (transcriptText.trim()) {
          try {
            // Try to parse as JSON first
            processedTranscript = JSON.parse(transcriptText);
          } catch {
            // If not JSON, store as plain text
            processedTranscript = transcriptText.trim();
          }
        }

        const result = await updateVideoTranscript({
          id: video.id,
          transcript: processedTranscript,
          status: status,
        });

        if (result.success) {
          setTranscript(processedTranscript);
          setMode("view");
          onUpdate?.();
        } else {
          setErrors({ submit: result.error || "Failed to update transcript" });
        }
      } catch (error) {
        setErrors({ submit: "An unexpected error occurred" });
      }
    });
  };

  const handleCancel = () => {
    setTranscriptText(getTranscriptText(video.transcript));
    setStatus(video.status);
    setMode("view");
    setErrors({});
  };

  const copyTranscript = async () => {
    const text = getTranscriptText(transcript);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  const downloadTranscript = () => {
    const text = getTranscriptText(transcript);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video_${video.id}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getTranscriptMetadata = () => {
    if (!transcript?.metadata) return null;

    const metadata = transcript.metadata;
    return {
      duration: metadata.duration,
      channels: metadata.channels,
      models: metadata.models?.join(", "),
      created: metadata.created
        ? new Date(metadata.created).toLocaleString()
        : null,
      requestId: metadata.request_id,
    };
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

  const hasChanges = () => {
    return (
      status !== video.status ||
      getTranscriptText(transcript) !== transcriptText
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transcript Manager
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={getStatusVariant(status) as any}
              className="capitalize"
            >
              {getStatusIcon(status)}
              <span className="ml-1">{status}</span>
            </Badge>
            {mode === "view" ? (
              <div className="flex gap-2">
                {transcript && (
                  <>
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
                      disabled={isPending}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </>
                )}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setMode("edit")}
                  disabled={isPending}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={isPending || !hasChanges()}
                >
                  {isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Editor (only in edit mode) */}
        {mode === "edit" && (
          <div className="space-y-3">
            <Label>Transcript Status</Label>
            <div className="flex flex-wrap gap-2">
              {videoStatusValues.map((statusOption) => (
                <button
                  key={statusOption}
                  type="button"
                  onClick={() => setStatus(statusOption)}
                  className={`px-3 py-1 rounded-md text-sm capitalize transition-colors ${
                    status === statusOption
                      ? "bg-primary text-primary-foreground border-2 border-primary"
                      : "bg-muted text-muted-foreground border-2 border-transparent hover:bg-muted/80"
                  }`}
                >
                  {statusOption}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Transcript Metadata */}
        {(() => {
          const metadata = getTranscriptMetadata();
          return (
            metadata && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-3">
                  Transcript Metadata
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {metadata.duration && (
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                      <div className="font-medium">
                        {formatDuration(metadata.duration)}
                      </div>
                    </div>
                  )}
                  {metadata.channels && (
                    <div>
                      <span className="text-muted-foreground">Channels:</span>
                      <div className="font-medium">{metadata.channels}</div>
                    </div>
                  )}
                  {metadata.models && (
                    <div>
                      <span className="text-muted-foreground">Models:</span>
                      <div className="font-medium">{metadata.models}</div>
                    </div>
                  )}
                  {metadata.created && (
                    <div>
                      <span className="text-muted-foreground">Generated:</span>
                      <div className="font-medium">{metadata.created}</div>
                    </div>
                  )}
                  {metadata.requestId && (
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground">Request ID:</span>
                      <div className="font-mono text-xs">
                        {metadata.requestId}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          );
        })()}

        {/* Transcript Content */}
        <div className="space-y-3">
          <Label>
            {mode === "edit" ? "Edit Transcript" : "Transcript Content"}
          </Label>

          {!transcript && mode === "view" ? (
            <div className="text-center py-12 text-muted-foreground">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode("edit")}
                className="mt-4"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Add Transcript
              </Button>
            </div>
          ) : mode === "edit" ? (
            <div className="space-y-2">
              <textarea
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder="Paste transcript JSON or plain text here..."
                className="w-full min-h-[300px] px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-vertical font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                You can paste JSON transcript data from Deepgram or plain text.
                The content will be automatically processed and formatted.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-white min-h-[300px]">
              <div className="prose max-w-none">
                <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {getTranscriptText(transcript)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Change Indicator */}
        {mode === "edit" && hasChanges() && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
            <p className="text-sm text-foreground">
              You have unsaved changes. Remember to save your modifications.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
