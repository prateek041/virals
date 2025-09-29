"use client";

import { useState, useTransition } from "react";
import { updateProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Project, type UpdateProjectData } from "@/lib/types/project";
import { Plus, X, Save, Edit } from "lucide-react";

interface ProjectEditFormProps {
  project: Project;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProjectEditForm({
  project,
  onSuccess,
  onCancel,
}: ProjectEditFormProps) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(project.project_title || "");
  const [linkSources, setLinkSources] = useState<string[]>(
    project.internal_link_sources || [""]
  );
  const [error, setError] = useState<string | null>(null);

  const addLinkSource = () => {
    setLinkSources([...linkSources, ""]);
  };

  const removeLinkSource = (index: number) => {
    setLinkSources(linkSources.filter((_, i) => i !== index));
  };

  const updateLinkSource = (index: number, value: string) => {
    const updated = [...linkSources];
    updated[index] = value;
    setLinkSources(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validLinks = linkSources.filter((link) => link.trim() !== "");

    const updateData: UpdateProjectData = {
      id: project.id,
      project_title: title,
      internal_link_sources: validLinks.length > 0 ? validLinks : [],
    };

    startTransition(async () => {
      const result = await updateProject(updateData);

      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || "Failed to update project");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Edit Project
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter project title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Internal Link Sources</Label>
            {linkSources.map((link, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={link}
                  onChange={(e) => updateLinkSource(index, e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                />
                {linkSources.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeLinkSource(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addLinkSource}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Link Source
            </Button>
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending || !title.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
