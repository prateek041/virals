import { z } from "zod";

// TypeScript interface for the projects table
export interface Project {
  id: string;
  user_id: string;
  project_title: string | null;
  created_at: string;
  internal_link_sources: string[] | null;
}

// Type for creating a new project (without id and created_at)
export type CreateProject = Omit<Project, "id" | "created_at">;

// Type for updating a project (all fields optional except id)
export type UpdateProject = Partial<Omit<Project, "id">> & { id: string };

// Zod schemas for validation
export const createProjectSchema = z.object({
  project_title: z
    .string()
    .min(1, "Project title is required")
    .max(255, "Project title too long"),
  internal_link_sources: z.array(z.string().url("Invalid URL")).optional(),
});

export const updateProjectSchema = z.object({
  id: z.uuid("Invalid project ID"),
  project_title: z
    .string()
    .min(1, "Project title is required")
    .max(255, "Project title too long")
    .optional(),
  internal_link_sources: z.array(z.url("Invalid URL")).optional(),
});

// Schema for project ID validation
export const projectIdSchema = z.uuid("Invalid project ID");

// Type inference from Zod schemas
export type CreateProjectData = z.infer<typeof createProjectSchema>;
export type UpdateProjectData = z.infer<typeof updateProjectSchema>;
