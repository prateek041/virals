"use client";

import { useState, useTransition } from "react";
import { deleteProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Project } from "@/lib/types/project";
import { Calendar, ExternalLink, Trash2, Edit, Globe } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ProjectCardProps {
  project: Project;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProject(project.id);
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
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">
            {project.project_title || "Untitled Project"}
          </CardTitle>
          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/projects/${project.id}`)}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteConfirm(true)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Created {formatDate(project.created_at)}
        </div>

        {project.internal_link_sources &&
          project.internal_link_sources.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Globe className="h-4 w-4" />
                Link Sources ({project.internal_link_sources.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {project.internal_link_sources
                  .slice(0, 3)
                  .map((link, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:underline max-w-32 truncate"
                      >
                        {new URL(link).hostname}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Badge>
                  ))}
                {project.internal_link_sources.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{project.internal_link_sources.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

        <div className="pt-2">
          <Link href={`/projects/${project.id}`}>
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
        </div>

        {showDeleteConfirm && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this project? This action cannot
              be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? "Deleting..." : "Delete"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
