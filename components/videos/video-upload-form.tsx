"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  createVideo,
  createVideoWithFile,
  transcribeVideo,
} from "@/app/actions/videos";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  type CreateVideoData,
  videoStatusValues,
  type TranscriptStatus,
} from "@/lib/types/video";
import {
  Upload,
  X,
  Check,
  File,
  AlertCircle,
  Cloud,
  FileVideo,
} from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

interface VideoUploadFormProps {
  user: User;
  projectId: string;
  onSuccess?: (videoId: string) => void;
  onCancel?: () => void;
}

export function VideoUploadForm({
  user,
  projectId,
  onSuccess,
  onCancel,
}: VideoUploadFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploadMethod, setUploadMethod] = useState<"file" | "storage">(
    "storage"
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<CreateVideoData>({
    project_id: projectId,
    storage_path: "",
    status: "uploaded" as TranscriptStatus,
    transcript: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchData = async () => {
    const response = await transcribeVideo(
      "videos/78d23882-a5f2-4687-92b9-a3d97fa7ac4a/1759225047588_kcubgnibzp9.MOV"
    );
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // Default behavior: go back to the project page
      router.push(`/projects/${projectId}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (100MB limit)
      const maxSize = 100 * 1024 * 1024; // 100MB in bytes
      if (file.size > maxSize) {
        setErrors({ file: "File size must be less than 100MB" });
        return;
      }

      // Validate file type
      const allowedTypes = [
        "video/mp4",
        "video/mov",
        "video/avi",
        "video/webm",
        "video/quicktime",
      ];
      if (!allowedTypes.includes(file.type)) {
        setErrors({
          file: "File type not supported. Please use MP4, MOV, AVI, or WebM",
        });
        return;
      }

      // Clear any previous errors
      setErrors({});

      setSelectedFile(file);
      // Generate a storage path based on the file name
      const fileName = file.name;
      const storagePath = `videos/${projectId}/${Date.now()}_${fileName}`;
      updateFormData("storage_path", storagePath);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    updateFormData("storage_path", "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};

    if (uploadMethod === "storage" && !formData.storage_path.trim()) {
      newErrors.storage_path = "Storage path is required";
    }

    if (uploadMethod === "file" && !selectedFile) {
      newErrors.file = "Please select a video file";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (uploadMethod === "file" && selectedFile) {
      // Handle client-side upload
      await handleFileUpload();
    } else {
      // Handle storage path method with server action
      startTransition(async () => {
        try {
          const result = await createVideo(formData);

          if (result.success && result.data) {
            onSuccess?.(result.data.id);
            router.push(`/videos/${result.data.id}`);
          } else {
            setErrors({ submit: result.error || "Failed to create video" });
          }
        } catch (error) {
          setErrors({ submit: "An unexpected error occurred" });
        }
      });
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log("uploading files", selectedFile.name);
      const supabase = createClient();

      // Generate unique filename
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const storagePath = `videos/${projectId}/${fileName}`;

      // Upload file directly to Supabase Storage from client
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("videos")
        .upload(storagePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setErrors({ submit: `Upload failed: ${uploadError.message}` });
        return;
      }

      setUploadProgress(100);

      // Create video record with the uploaded file path
      startTransition(async () => {
        try {
          const videoData: CreateVideoData = {
            project_id: projectId,
            storage_path: storagePath,
            status: formData.status,
            transcript: null,
          };

          const result = await createVideo(videoData);

          if (result.success && result.data) {
            onSuccess?.(result.data.id);
            router.push(`/videos/${result.data.id}`);
          } else {
            setErrors({
              submit: result.error || "Failed to create video record",
            });
          }

          // Start transcription after successful upload and record creation
          // TODO: In production, consider queuing this task instead.
          await transcribeVideo(uploadData.path);
        } catch (error) {
          setErrors({ submit: "An unexpected error occurred" });
        }
      });
    } catch (error) {
      setErrors({ submit: "Upload failed: " + (error as Error).message });
    } finally {
      setIsUploading(false);
    }
  };

  const updateFormData = (field: keyof CreateVideoData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Video
        </CardTitle>

        <Button
          onClick={fetchData}
          variant="ghost"
          size="sm"
          className="ml-auto"
        >
          Check
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Upload Method Selection */}
          <div className="space-y-3">
            <Label>Upload Method</Label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setUploadMethod("storage")}
                className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                  uploadMethod === "storage"
                    ? "border-foreground bg-muted"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <Cloud className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Storage Path</div>
                <div className="text-xs text-muted-foreground">
                  Specify path to existing file
                </div>
              </button>
              <button
                type="button"
                onClick={() => setUploadMethod("file")}
                className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                  uploadMethod === "file"
                    ? "border-foreground bg-muted"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <FileVideo className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Upload File</div>
                <div className="text-xs text-muted-foreground">
                  Select file from device
                </div>
              </button>
            </div>
          </div>

          {/* File Upload */}
          {uploadMethod === "file" && (
            <div className="space-y-3">
              <Label htmlFor="file">
                Video File <span className="text-red-500">*</span>
              </Label>

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    errors.file
                      ? "border-destructive"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <FileVideo className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <div className="text-sm font-medium text-foreground mb-1">
                    Click to select a video file
                  </div>
                  <div className="text-xs text-muted-foreground">
                    MP4, MOV, AVI, WebM (Max 100MB)
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <File className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {selectedFile.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(selectedFile.size)}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {errors.file && (
                <p className="text-sm text-red-600">{errors.file}</p>
              )}

              {/* Upload Progress */}
              {isUploading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Storage Path */}
          <div className="space-y-2">
            <Label htmlFor="storage_path">
              Storage Path <span className="text-red-500">*</span>
            </Label>
            <Input
              id="storage_path"
              type="text"
              placeholder="e.g., videos/project1/my-video.mp4"
              value={formData.storage_path}
              onChange={(e) => updateFormData("storage_path", e.target.value)}
              className={errors.storage_path ? "border-red-500" : ""}
              disabled={uploadMethod === "file" && !!selectedFile}
            />
            {errors.storage_path && (
              <p className="text-sm text-red-600">{errors.storage_path}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {uploadMethod === "file"
                ? "This will be generated automatically based on your file selection."
                : "Enter the full path where the video file is stored in your Supabase storage."}
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Initial Status</Label>
            <div className="flex flex-wrap gap-2">
              {videoStatusValues.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => updateFormData("status", status)}
                  className={`px-3 py-1 rounded-md text-sm capitalize transition-colors ${
                    formData.status === status
                      ? "bg-foreground text-background border-2 border-foreground"
                      : "bg-muted text-muted-foreground border-2 border-transparent hover:bg-muted/80"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Select the initial status for this video.
            </p>
          </div>

          {/* Upload Notice */}
          {uploadMethod === "file" && (
            <div className="p-4 bg-muted border border-border rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-foreground mb-1">
                    File Upload Info
                  </div>
                  <div className="text-muted-foreground">
                    Your video file will be uploaded directly to Supabase
                    Storage from your browser, then a video record will be
                    created. This approach supports large files without server
                    limitations.
                  </div>
                </div>
              </div>
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
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-pulse" />
                  {uploadProgress > 0
                    ? `Uploading ${uploadProgress}%`
                    : "Uploading..."}
                </>
              ) : isPending ? (
                uploadMethod === "file" ? (
                  "Creating..."
                ) : (
                  "Creating..."
                )
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {uploadMethod === "file" ? "Upload & Create" : "Create Video"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
