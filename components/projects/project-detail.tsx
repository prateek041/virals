"use client";

import { useState, useEffect } from "react";
import { getProject } from "@/app/actions/projects";
import { ProjectEditForm } from "@/components/projects/project-edit-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Project } from "@/lib/types/project";
import {
  Calendar,
  ExternalLink,
  Edit,
  Globe,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ProjectDetailProps {
  projectId: string;
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const loadProject = async () => {
    setLoading(true);
    setError(null);

    const result = await getProject(projectId);

    if (result.success) {
      setProject(result.data || null);
    } else {
      setError(result.error || "Failed to load project");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const handleEditSuccess = () => {
    setIsEditing(false);
    loadProject();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error || "Project not found"}</p>
          <div className="space-x-2">
            <Button onClick={loadProject}>Try Again</Button>
            <Button variant="outline" onClick={() => router.push("/projects")}>
              Back to Projects
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/projects")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>

      {isEditing ? (
        <ProjectEditForm
          project={project}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">
                    {project.project_title || "Untitled Project"}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Created on {formatDate(project.created_at)}
                  </div>
                </div>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Internal Link Sources
                {project.internal_link_sources && (
                  <Badge variant="secondary">
                    {project.internal_link_sources.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.internal_link_sources &&
              project.internal_link_sources.length > 0 ? (
                <div className="space-y-3">
                  {project.internal_link_sources.map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {new URL(link).hostname}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {link}
                        </p>
                      </div>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 p-2 hover:bg-accent rounded-md transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No link sources added yet</p>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="mt-3"
                  >
                    Add Link Sources
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Project ID
                  </Label>
                  <p className="font-mono text-sm">{project.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    User ID
                  </Label>
                  <p className="font-mono text-sm">{project.user_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  );
}
