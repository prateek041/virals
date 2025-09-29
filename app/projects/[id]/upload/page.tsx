import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VideoUploadForm } from "@/components/videos/video-upload-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

interface ProjectUploadPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectUploadPage({
  params,
}: ProjectUploadPageProps) {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<UploadPageSkeleton />}>
          <UploadContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function UploadContent({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) {
    redirect("/auth/login");
  }

  // Verify project exists and belongs to user
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, project_title")
    .eq("id", projectId)
    .eq("user_id", userData.user.id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project
            </Link>
          </Button>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Upload Video</h1>
          <p className="text-muted-foreground">
            Add a new video to{" "}
            <strong>{project.project_title || "Untitled Project"}</strong>
          </p>
        </div>
      </div>

      {/* Upload Form */}
      <VideoUploadForm user={userData.user} projectId={projectId} />

      {/* Help Section */}
      <Card className="mt-8 max-w-2xl mx-auto">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Upload Methods
          </h3>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium">Storage Path Method</h4>
              <p className="text-muted-foreground">
                Use this if you already have a video file uploaded to your
                Supabase Storage. Simply provide the storage path (e.g.,
                "videos/project1/my-video.mp4").
              </p>
            </div>
            <div>
              <h4 className="font-medium">File Upload Method</h4>
              <p className="text-muted-foreground">
                Select a video file from your device. In this demo, it will
                generate a storage path. In a production environment, this would
                actually upload the file to Supabase Storage.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UploadPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center py-12">
        <Upload className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4 animate-pulse" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Loading upload form...
        </h3>
        <p className="text-muted-foreground">
          Please wait while we prepare the upload interface.
        </p>
      </div>
    </div>
  );
}
