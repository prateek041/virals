"use client";

import { useState, useTransition } from "react";
import { createProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X } from "lucide-react";

interface ProjectFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProjectForm({ onSuccess, onCancel }: ProjectFormProps) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [linkSources, setLinkSources] = useState<string[]>([""]);
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

    startTransition(async () => {
      const result = await createProject({
        project_title: title,
        internal_link_sources: validLinks.length > 0 ? validLinks : undefined,
      });

      if (result.success) {
        setTitle("");
        setLinkSources([""]);
        onSuccess?.();
      } else {
        setError(result.error || "Failed to create project");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Project</CardTitle>
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
            <Label>Internal Link Sources (Optional)</Label>
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
              {isPending ? "Creating..." : "Create Project"}
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
