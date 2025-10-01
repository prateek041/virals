import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getVideoById } from "@/app/actions/videos";
import { VideoPlayerWithTranscript } from "@/components/videos/video-player-with-transcript";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface VideoPageProps {
  params: {
    id: string;
  };
}

export default async function VideoPage({ params }: VideoPageProps) {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<VideoPageSkeleton />}>
          <VideoContent videoId={params.id} />
        </Suspense>
      </div>
    </div>
  );
}

async function VideoContent({ videoId }: { videoId: string }) {
  const result = await getVideoById(videoId);

  if (!result.success) {
    if (
      result.error?.includes("not found") ||
      result.error?.includes("access denied")
    ) {
      notFound();
    }

    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/videos">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Videos
            </Link>
          </Button>
        </div>

        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Error Loading Video</h3>
                <p className="text-sm text-red-600/80">
                  {result.error || "Failed to load video"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/videos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Videos
          </Link>
        </Button>
      </div>

      <VideoPlayerWithTranscript video={result.data!} />
    </div>
  );
}

function VideoPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center py-12">
        <Video className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Loading video...
        </h3>
        <p className="text-gray-600">
          Please wait while we fetch the video details.
        </p>
      </div>
    </div>
  );
}
