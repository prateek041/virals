"use client";

import { useState, useTransition } from "react";
import { updateVideo } from "@/app/actions/videos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type UpdateVideoData,
  type Video,
  videoStatusValues,
  type TranscriptStatus,
} from "@/lib/types/video";
import { Save, X, Edit } from "lucide-react";
import { useRouter } from "next/navigation";

interface VideoEditFormProps {
  video: Video;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function VideoEditForm({
  video,
  onSuccess,
  onCancel,
}: VideoEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<UpdateVideoData>({
    id: video.id,
    project_id: video.project_id,
    storage_path: video.storage_path,
    status: video.status,
    transcript: video.transcript,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};

    if (!formData.storage_path?.trim()) {
      newErrors.storage_path = "Storage path is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    startTransition(async () => {
      const result = await updateVideo(formData);

      if (result.success) {
        onSuccess?.();
        router.push(`/videos/${video.id}`);
      } else {
        setErrors({ submit: result.error || "Failed to update video" });
      }
    });
  };

  const updateFormData = (field: keyof UpdateVideoData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const hasChanges = () => {
    return (
      formData.storage_path !== video.storage_path ||
      formData.status !== video.status ||
      JSON.stringify(formData.transcript) !== JSON.stringify(video.transcript)
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Edit Video
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Storage Path */}
          <div className="space-y-2">
            <Label htmlFor="storage_path">
              Storage Path <span className="text-red-500">*</span>
            </Label>
            <Input
              id="storage_path"
              type="text"
              placeholder="e.g., /videos/project1/my-video.mp4"
              value={formData.storage_path || ""}
              onChange={(e) => updateFormData("storage_path", e.target.value)}
              className={errors.storage_path ? "border-red-500" : ""}
            />
            {errors.storage_path && (
              <p className="text-sm text-red-600">{errors.storage_path}</p>
            )}
            <p className="text-sm text-muted-foreground">
              The full path where the video file is stored in your Supabase
              storage.
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-2">
              {videoStatusValues.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => updateFormData("status", status)}
                  className={`px-3 py-1 rounded-md text-sm capitalize transition-colors ${
                    formData.status === status
                      ? "bg-blue-100 text-blue-800 border-2 border-blue-300"
                      : "bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Update the current status of the video processing.
            </p>
          </div>

          {/* Transcript */}
          <div className="space-y-2">
            <Label htmlFor="transcript">Transcript</Label>
            <textarea
              id="transcript"
              placeholder="Paste transcript JSON or text here..."
              value={
                formData.transcript
                  ? JSON.stringify(formData.transcript, null, 2)
                  : ""
              }
              onChange={(e) => {
                try {
                  const value = e.target.value.trim();
                  if (value === "") {
                    updateFormData("transcript", null);
                  } else {
                    // Try to parse as JSON, fall back to string
                    const parsed = JSON.parse(value);
                    updateFormData("transcript", parsed);
                  }
                } catch {
                  // If not valid JSON, store as string
                  updateFormData("transcript", e.target.value || null);
                }
              }}
              className="w-full min-h-[120px] px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-vertical"
            />
            <p className="text-sm text-muted-foreground">
              You can update the transcript with JSON from Deepgram or plain
              text. Clear this field to remove the transcript.
            </p>
          </div>

          {/* Current vs Original Info */}
          {hasChanges() && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                You have unsaved changes. Review your modifications before
                saving.
              </p>
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isPending}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isPending || !hasChanges()}
              className="flex-1"
            >
              {isPending ? (
                "Saving..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

          {/* Reset Button */}
          {hasChanges() && (
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() =>
                  setFormData({
                    id: video.id,
                    project_id: video.project_id,
                    storage_path: video.storage_path,
                    status: video.status,
                    transcript: video.transcript,
                  })
                }
                disabled={isPending}
              >
                Reset to Original Values
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
