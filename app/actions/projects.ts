"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdSchema,
  type CreateProjectData,
  type UpdateProjectData,
  type Project,
} from "@/lib/types/project";

// Result type for server actions
export type ActionResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Create a new project
 */
export async function createProject(
  data: CreateProjectData
): Promise<ActionResult<Project>> {
  try {
    // Validate input
    const validatedData = createProjectSchema.parse(data);

    const supabase = await createClient();

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Authentication required" };
    }

    // Insert project
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        user_id: userData.user.id,
        project_title: validatedData.project_title,
        internal_link_sources: validatedData.internal_link_sources || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      return { success: false, error: "Failed to create project" };
    }

    revalidatePath("/projects");
    return { success: true, data: project };
  } catch (error) {
    console.error("Error in createProject:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get all projects for the current user
 */
export async function getProjects(): Promise<ActionResult<Project[]>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Authentication required" };
    }

    // Fetch projects
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error);
      return { success: false, error: "Failed to fetch projects" };
    }

    return { success: true, data: projects || [] };
  } catch (error) {
    console.error("Error in getProjects:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get a single project by ID
 */
export async function getProject(id: string): Promise<ActionResult<Project>> {
  try {
    // Validate input
    const validatedId = projectIdSchema.parse(id);

    const supabase = await createClient();

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Authentication required" };
    }

    // Fetch project
    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", validatedId)
      .eq("user_id", userData.user.id)
      .single();

    if (error) {
      console.error("Error fetching project:", error);
      return { success: false, error: "Project not found" };
    }

    return { success: true, data: project };
  } catch (error) {
    console.error("Error in getProject:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Update an existing project
 */
export async function updateProject(
  data: UpdateProjectData
): Promise<ActionResult<Project>> {
  try {
    // Validate input
    const validatedData = updateProjectSchema.parse(data);

    const supabase = await createClient();

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Authentication required" };
    }

    // Update project
    const updateFields: Partial<Project> = {};
    if (validatedData.project_title !== undefined) {
      updateFields.project_title = validatedData.project_title;
    }
    if (validatedData.internal_link_sources !== undefined) {
      updateFields.internal_link_sources = validatedData.internal_link_sources;
    }

    const { data: project, error } = await supabase
      .from("projects")
      .update(updateFields)
      .eq("id", validatedData.id)
      .eq("user_id", userData.user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating project:", error);
      return { success: false, error: "Failed to update project" };
    }

    revalidatePath("/projects");
    revalidatePath(`/projects/${validatedData.id}`);
    return { success: true, data: project };
  } catch (error) {
    console.error("Error in updateProject:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<ActionResult<void>> {
  try {
    // Validate input
    const validatedId = projectIdSchema.parse(id);

    const supabase = await createClient();

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Authentication required" };
    }

    // Delete project
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", validatedId)
      .eq("user_id", userData.user.id);

    if (error) {
      console.error("Error deleting project:", error);
      return { success: false, error: "Failed to delete project" };
    }

    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteProject:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}
