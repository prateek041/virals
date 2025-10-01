"use client";

import { useState, useTransition } from "react";
import { deleteVideo } from "@/app/actions/videos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Video } from "@/lib/types/video";
import {
  Calendar,
  Trash2,
  Edit,
  Play,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface VideoCardProps {
  video: Video & {
    projects?: {
      project_title: string;
      user_id: string;
    };
  };
  showProject?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function VideoCard({
  video,
  showProject = false,
  onEdit,
  onDelete,
}: VideoCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteVideo(video.id);
      if (result.success) {
        onDelete?.();
      }
      setShowDeleteConfirm(false);
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  const getFileName = (storagePath: string) => {
    return storagePath.split("/").pop() || storagePath;
  };

  if (showDeleteConfirm) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="text-center">
            <Trash2 className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Delete Video</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this video? This action cannot be
              undone.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2 mb-2">
              {getFileName(video.storage_path)}
            </CardTitle>
            {showProject && video.projects && (
              <Link
                href={`/projects/${video.project_id}`}
                className="text-sm text-primary hover:underline"
              >
                {video.projects.project_title || "Untitled Project"}
              </Link>
            )}
          </div>
          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              disabled={isPending}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant={getStatusVariant(video.status) as any}
              className="capitalize"
            >
              {getStatusIcon(video.status)}
              <span className="ml-1">{video.status}</span>
            </Badge>
            {video.transcript_text && (
              <Badge variant="outline">
                <FileText className="h-3 w-3 mr-1" />
                Transcript Available
              </Badge>
            )}
          </div>

          {/* Storage Path */}
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Path:</span> {video.storage_path}
          </div>

          {/* Created Date */}
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            {formatDate(video.created_at)}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button asChild variant="default" size="sm" className="flex-1">
              <Link href={`/videos/${video.id}`}>
                <Play className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </Button>
            {video.transcript && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/videos/${video.id}#transcript`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Transcript
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
