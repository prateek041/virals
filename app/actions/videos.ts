"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createVideoSchema,
  updateVideoSchema,
  videoIdSchema,
  updateTranscriptSchema,
  videosByProjectSchema,
  type CreateVideoData,
  type UpdateVideoData,
  type UpdateTranscriptData,
  type VideosByProjectData,
  type Video,
} from "@/lib/types/video";

// Result type for server actions
export type ActionResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type WordTimeStamps = {
  word: string;
  start: number;
  end: number;
  confidence: number;
};

export async function updateTranscript(
  requestId: string,
  transcriptText: string,
  transcriptData: WordTimeStamps[]
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("videos")
      .update({
        transcript_text: transcriptText,
        transcript_data_full: transcriptData,
        status: "transcribed",
      })
      .eq("deepgram_request_id", requestId);

    if (error) {
      console.error("Error updating transcript:", error);
      return { success: false, error: "Failed to update transcript" };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error as string };
  }
}

export async function transcribeVideo(uniqueId: string): Promise<void> {
  try {
    const supabase = await createClient();

    console.log("getting this video", uniqueId);

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      console.error("Authentication required for transcribing video");
      return;
    }

    // Fetch the video to ensure it exists
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("storage_path", uniqueId)
      .single();

    if (videoError || !video) {
      console.log("Video not found or access denied", videoError);
      // return { success: false, error: "Video not found or access denied" };
    }

    const publicUrlResponse = await getVideoPublicUrl(uniqueId);
    const callbackUrl =
      "https://9f3bb8823277.ngrok-free.app/api/deepgram/callback";
    const url = "https://api.deepgram.com/v1/listen?callback=" + callbackUrl;
    const apiKey = process.env.DEEPGRAM_API_KEY;

    console.log("the url is", url);
    console.log("publicUrlResponse", publicUrlResponse.data?.publicUrl);

    // Define the request data object
    const data = {
      url: publicUrlResponse.data?.publicUrl,
    };

    // Define the request headers object
    const headers = {
      Accept: "application/json",
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    };

    // Get the timestamped transcript of the video clip, to be saved
    // in the database later on.
    // TODO: Handle errors and loading states

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    });
    const responseData = await response.json();
    const requestId = responseData.request_id;

    const { error } = await supabase
      .from("videos")
      .update({
        deepgram_request_id: requestId,
        status: "transcribing",
      })
      .eq("storage_path", uniqueId);

    if (error) {
      console.error("Error updating video status:", error);
      // return { success: false, error: "Failed to update video status" };
    }
  } catch (error) {
    console.error("Error in transcribeVideo:", error);
  }
}

/**
 * Get public URL for a video file from Supabase Storage
 */
export async function getVideoPublicUrl(
  storagePath: string
): Promise<ActionResult<{ publicUrl: string }>> {
  console.log("getting public url for", storagePath);
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Authentication required" };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("videos").getPublicUrl(storagePath);

    return {
      success: true,
      data: { publicUrl },
    };
  } catch (error) {
    console.error("Error in getVideoPublicUrl:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadVideoFile(
  formData: FormData
): Promise<ActionResult<{ storagePath: string; publicUrl: string }>> {
  try {
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;

    if (!file) {
      return { success: false, error: "No file provided" };
    }

    if (!projectId) {
      return { success: false, error: "Project ID is required" };
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > maxSize) {
      return { success: false, error: "File size must be less than 100MB" };
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
      return {
        success: false,
        error: "File type not supported. Please use MP4, MOV, AVI, or WebM",
      };
    }

    const supabase = await createClient();

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Authentication required" };
    }

    // Verify the project belongs to the user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", userData.user.id)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found or access denied" };
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;
    const storagePath = `videos/${projectId}/${fileName}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("videos")
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        duplex: "half",
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return { success: false, error: "Failed to upload file" };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("videos").getPublicUrl(storagePath);

    return {
      success: true,
      data: {
        storagePath,
        publicUrl,
      },
    };
  } catch (error) {
    console.error("Error in uploadVideoFile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a new video with optional file upload
 */
export async function createVideoWithFile(
  formData: FormData
): Promise<ActionResult<Video>> {
  try {
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string;
    const status = formData.get("status") as string;
    const storagePath = formData.get("storagePath") as string;

    let finalStoragePath = storagePath;

    // If a file is provided, upload it first
    if (file && file.size > 0) {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("projectId", projectId);

      const uploadResult = await uploadVideoFile(uploadFormData);
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      finalStoragePath = uploadResult.data!.storagePath;
    }

    // Create video record
    const videoData: CreateVideoData = {
      project_id: projectId,
      storage_path: finalStoragePath,
      status: (status as any) || "uploaded",
      transcript: null,
    };

    return await createVideo(videoData);
  } catch (error) {
    console.error("Error in createVideoWithFile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a new video
 */
export async function createVideo(
  data: CreateVideoData
): Promise<ActionResult<Video>> {
  try {
    // Validate input
    const validatedData = createVideoSchema.parse(data);

    const supabase = await createClient();

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Authentication required" };
    }

    // Verify the project belongs to the user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", validatedData.project_id)
      .eq("user_id", userData.user.id)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found or access denied" };
    }

    // Insert video
    const { data: video, error } = await supabase
      .from("videos")
      .insert({
        project_id: validatedData.project_id,
        storage_path: validatedData.storage_path,
        status: validatedData.status || "uploaded",
        transcript: validatedData.transcript || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating video:", error);
      return { success: false, error: "Failed to create video" };
    }

    revalidatePath(`/projects/${validatedData.project_id}`);
    revalidatePath("/videos");

    return { success: true, data: video };
  } catch (error) {
    console.error("Error in createVideo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all videos for a specific project
 */
export async function getVideosByProject(
  data: VideosByProjectData
): Promise<ActionResult<Video[]>> {
  try {
    // Validate input
    const validatedData = videosByProjectSchema.parse(data);

    const supabase = await createClient();

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Authentication required" };
    }

    // Verify the project belongs to the user and get videos
    const { data: videos, error } = await supabase
      .from("videos")
      .select(
        `
        *,
        projects!inner(user_id)
      `
      )
      .eq("project_id", validatedData.project_id)
      .eq("projects.user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching videos:", error);
      return { success: false, error: "Failed to fetch videos" };
    }

    // Remove the projects field from the response
    const cleanVideos = videos.map(({ projects, ...video }) => video);

    return { success: true, data: cleanVideos };
  } catch (error) {
    console.error("Error in getVideosByProject:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all videos for the current user
 */
export async function getAllVideos(): Promise<ActionResult<Video[]>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Authentication required" };
    }

    // Get all videos for projects owned by the user
    const { data: videos, error } = await supabase
      .from("videos")
      .select(
        `
        *,
        projects!inner(user_id, project_title)
      `
      )
      .eq("projects.user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching videos:", error);
      return { success: false, error: "Failed to fetch videos" };
    }

    return { success: true, data: videos };
  } catch (error) {
    console.error("Error in getAllVideos:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get a video by ID
 */
export async function getVideoById(id: string): Promise<ActionResult<Video>> {
  try {
    // Validate input
    const validatedId = videoIdSchema.parse(id);

    const supabase = await createClient();

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Authentication required" };
    }

    // Get video with project verification
    const { data: video, error } = await supabase
      .from("videos")
      .select(
        `
        *,
        projects!inner(user_id, project_title)
      `
      )
      .eq("id", validatedId)
      .eq("projects.user_id", userData.user.id)
      .single();

    if (error) {
      console.error("Error fetching video:", error);
      return { success: false, error: "Video not found or access denied" };
    }

    return { success: true, data: video };
  } catch (error) {
    console.error("Error in getVideoById:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update a video
 */
export async function updateVideo(
  data: UpdateVideoData
): Promise<ActionResult<Video>> {
  try {
    // Validate input
    const validatedData = updateVideoSchema.parse(data);

    const supabase = await createClient();

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Authentication required" };
    }

    // Verify video exists and belongs to user
    const { data: existingVideo, error: fetchError } = await supabase
      .from("videos")
      .select(
        `
        *,
        projects!inner(user_id)
      `
      )
      .eq("id", validatedData.id)
      .eq("projects.user_id", userData.user.id)
      .single();

    if (fetchError || !existingVideo) {
      return { success: false, error: "Video not found or access denied" };
    }

    // If project_id is being updated, verify new project belongs to user
    if (
      validatedData.project_id &&
      validatedData.project_id !== existingVideo.project_id
    ) {
      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", validatedData.project_id)
        .eq("user_id", userData.user.id)
        .single();

      if (projectError || !newProject) {
        return {
          success: false,
          error: "Target project not found or access denied",
        };
      }
    }

    // Prepare update data (remove id and undefined values)
    const { id, ...updateData } = validatedData;
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    // Update video
    const { data: updatedVideo, error } = await supabase
      .from("videos")
      .update(cleanUpdateData)
      .eq("id", validatedData.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating video:", error);
      return { success: false, error: "Failed to update video" };
    }

    revalidatePath(`/videos/${validatedData.id}`);
    revalidatePath(`/projects/${updatedVideo.project_id}`);
    revalidatePath("/videos");

    return { success: true, data: updatedVideo };
  } catch (error) {
    console.error("Error in updateVideo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update video transcript specifically
 */
export async function updateVideoTranscript(
  data: UpdateTranscriptData
): Promise<ActionResult<Video>> {
  try {
    // Validate input
    const validatedData = updateTranscriptSchema.parse(data);

    const supabase = await createClient();

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Authentication required" };
    }

    // Verify video exists and belongs to user
    const { data: existingVideo, error: fetchError } = await supabase
      .from("videos")
      .select(
        `
        *,
        projects!inner(user_id)
      `
      )
      .eq("id", validatedData.id)
      .eq("projects.user_id", userData.user.id)
      .single();

    if (fetchError || !existingVideo) {
      return { success: false, error: "Video not found or access denied" };
    }

    // Prepare update data
    const updateData: any = {
      transcript: validatedData.transcript,
    };

    // Update status if provided
    if (validatedData.status) {
      updateData.status = validatedData.status;
    }

    // Update video
    const { data: updatedVideo, error } = await supabase
      .from("videos")
      .update(updateData)
      .eq("id", validatedData.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating video transcript:", error);
      return { success: false, error: "Failed to update transcript" };
    }

    revalidatePath(`/videos/${validatedData.id}`);
    revalidatePath(`/projects/${updatedVideo.project_id}`);
    revalidatePath("/videos");

    return { success: true, data: updatedVideo };
  } catch (error) {
    console.error("Error in updateVideoTranscript:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a video file from Supabase Storage
 */
export async function deleteVideoFile(
  storagePath: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Authentication required" };
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from("videos")
      .remove([storagePath]);

    if (deleteError) {
      console.error("Error deleting file from storage:", deleteError);
      // Don't fail the entire operation if file deletion fails
      // (file might not exist or be already deleted)
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteVideoFile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a video
 */
export async function deleteVideo(id: string): Promise<ActionResult<void>> {
  try {
    // Validate input
    const validatedId = videoIdSchema.parse(id);

    const supabase = await createClient();

    // Check authentication
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Authentication required" };
    }

    // Verify video exists and belongs to user, and get storage info for cleanup
    const { data: existingVideo, error: fetchError } = await supabase
      .from("videos")
      .select(
        `
        project_id,
        storage_path,
        projects!inner(user_id)
      `
      )
      .eq("id", validatedId)
      .eq("projects.user_id", userData.user.id)
      .single();

    if (fetchError || !existingVideo) {
      return { success: false, error: "Video not found or access denied" };
    }

    // Delete video record first
    const { error } = await supabase
      .from("videos")
      .delete()
      .eq("id", validatedId);

    if (error) {
      console.error("Error deleting video:", error);
      return { success: false, error: "Failed to delete video" };
    }

    // Try to delete the file from storage (if it exists)
    if (existingVideo.storage_path) {
      await deleteVideoFile(existingVideo.storage_path);
      // Don't fail if file deletion fails - the database record is already deleted
    }

    revalidatePath(`/projects/${existingVideo.project_id}`);
    revalidatePath("/videos");

    return { success: true };
  } catch (error) {
    console.error("Error in deleteVideo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
