"use client";

import { useState, useEffect } from "react";
import { getProjects } from "@/app/actions/projects";
import { ProjectCard } from "./project-card";
import { ProjectForm } from "./project-form";
import { Button } from "@/components/ui/button";
import { type Project } from "@/lib/types/project";
import { Plus, FolderOpen } from "lucide-react";

export function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);

    const result = await getProjects();

    if (result.success) {
      setProjects(result.data || []);
    } else {
      setError(result.error || "Failed to load projects");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleProjectCreated = () => {
    setShowForm(false);
    loadProjects();
  };

  const handleProjectDeleted = () => {
    loadProjects();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={loadProjects}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Projects</h1>
          <p className="text-muted-foreground">
            Manage your projects and link sources
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </div>

      {showForm && (
        <ProjectForm
          onSuccess={handleProjectCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first project to get started
          </p>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleProjectDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
