"use client";

import { useState } from "react";
import { VideoCard } from "./video-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  type Video,
  type TranscriptStatus,
  videoStatusValues,
} from "@/lib/types/video";
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Video as VideoIcon,
  Plus,
} from "lucide-react";
import Link from "next/link";

interface VideosListProps {
  videos: Array<
    Video & {
      projects?: {
        project_title: string;
        user_id: string;
      };
    }
  >;
  showProject?: boolean;
  showAddButton?: boolean;
  projectId?: string;
  onRefresh?: () => void;
}

type SortField = "created_at" | "status" | "storage_path";
type SortOrder = "asc" | "desc";

export function VideosList({
  videos,
  showProject = false,
  showAddButton = false,
  projectId,
  onRefresh,
}: VideosListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TranscriptStatus | "all">(
    "all"
  );
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Filter videos based on search term and status
  const filteredVideos = videos.filter((video) => {
    const matchesSearch =
      searchTerm === "" ||
      video.storage_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.projects?.project_title
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || video.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort videos
  const sortedVideos = [...filteredVideos].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case "created_at":
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "storage_path":
        aValue = a.storage_path.toLowerCase();
        bValue = b.storage_path.toLowerCase();
        break;
      default:
        aValue = a.created_at;
        bValue = b.created_at;
    }

    if (sortOrder === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const getStatusCount = (status: TranscriptStatus) => {
    return videos.filter((video) => video.status === status).length;
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <Button
      variant={sortField === field ? "default" : "outline"}
      size="sm"
      onClick={() => toggleSort(field)}
      className="text-sm"
    >
      {children}
      {sortField === field &&
        (sortOrder === "asc" ? (
          <SortAsc className="h-4 w-4 ml-1" />
        ) : (
          <SortDesc className="h-4 w-4 ml-1" />
        ))}
    </Button>
  );

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <VideoIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
        <p className="text-muted-foreground mb-6">
          {projectId
            ? "Upload your first video to this project to get started."
            : "Create a project and upload videos to get started."}
        </p>
        {showAddButton && projectId && (
          <Button asChild>
            <Link href={`/projects/${projectId}/upload`}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Video
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Videos</h2>
          <p className="text-muted-foreground">
            {filteredVideos.length} of {videos.length} videos
          </p>
        </div>
        {showAddButton && projectId && (
          <Button asChild>
            <Link href={`/projects/${projectId}/upload`}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Video
            </Link>
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos by name or project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All ({videos.length})
          </Button>
          {videoStatusValues.map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status} ({getStatusCount(status)})
            </Button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium">Sort by:</span>
          <SortButton field="created_at">Date</SortButton>
          <SortButton field="status">Status</SortButton>
          <SortButton field="storage_path">Name</SortButton>
        </div>
      </div>

      {/* Videos Grid */}
      {sortedVideos.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No videos match your current filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
            }}
            className="mt-2"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              showProject={showProject}
              onDelete={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
