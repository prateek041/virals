import { z } from "zod";

// TypeScript interface for the videos table
export interface Video {
  id: string;
  project_id: string;
  storage_path: string;
  status: "uploaded" | "transcribing" | "transcribed" | "error";
  transcript_text: any | null; // JSONB field - can be any JSON structure
  transcript_data_full: any | null; // JSONB field - full transcript data
  created_at: string;
}

// Type for creating a new video (without id and created_at)
export type CreateVideo = Omit<Video, "id" | "created_at">;

// Type for updating a video (all fields optional except id)
export type UpdateVideo = Partial<Omit<Video, "id">> & { id: string };

// Status enum for validation
export const videoStatusValues = [
  "uploaded",
  "transcribing",
  "transcribed",
  "error",
] as const;

// Zod schemas for validation
export const createVideoSchema = z.object({
  project_id: z.uuid("Invalid project ID"),
  storage_path: z
    .string()
    .min(1, "Storage path is required")
    .max(500, "Storage path too long"),
  status: z.enum(videoStatusValues).default("uploaded"),
  transcript: z.any().nullable().optional(),
});

export const updateVideoSchema = z.object({
  id: z.uuid("Invalid video ID"),
  project_id: z.uuid("Invalid project ID").optional(),
  storage_path: z
    .string()
    .min(1, "Storage path is required")
    .max(500, "Storage path too long")
    .optional(),
  status: z.enum(videoStatusValues).optional(),
  transcript: z.any().nullable().optional(),
});

// Schema for video ID validation
export const videoIdSchema = z.uuid("Invalid video ID");

// Schema for updating transcript specifically
export const updateTranscriptSchema = z.object({
  id: z.uuid("Invalid video ID"),
  transcript: z.any().nullable(),
  status: z.enum(videoStatusValues).optional(),
});

// Schema for filtering videos by project
export const videosByProjectSchema = z.object({
  project_id: z.uuid("Invalid project ID"),
});

// Type inference from Zod schemas
export type CreateVideoData = z.infer<typeof createVideoSchema>;
export type UpdateVideoData = z.infer<typeof updateVideoSchema>;
export type UpdateTranscriptData = z.infer<typeof updateTranscriptSchema>;
export type VideosByProjectData = z.infer<typeof videosByProjectSchema>;

// Transcript-related types for better type safety
export interface DeepgramTranscript {
  metadata: {
    transaction_key: string;
    request_id: string;
    sha256: string;
    created: string;
    duration: number;
    channels: number;
    models?: string[];
  };
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        confidence: number;
        words?: Array<{
          word: string;
          start: number;
          end: number;
          confidence: number;
          punctuated_word?: string;
        }>;
      }>;
    }>;
  };
}

// Helper type for transcript status
export type TranscriptStatus =
  | "uploaded"
  | "transcribing"
  | "transcribed"
  | "error";
