import { Suspense } from "react";
import { getAllVideos } from "@/app/actions/videos";
import { VideosList } from "@/components/videos/videos-list";
import { Card, CardContent } from "@/components/ui/card";
import { Video, AlertCircle } from "lucide-react";

export default async function VideosPage() {
  return (
    <div className="h-full">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<VideosPageSkeleton />}>
          <VideosContent />
        </Suspense>
      </div>
    </div>
  );
}

async function VideosContent() {
  const result = await getAllVideos();

  if (!result.success) {
    return (
      <div className="max-w-4xl h-full mx-auto">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Error Loading Videos</h3>
                <p className="text-sm text-red-600/80">
                  {result.error || "Failed to load videos"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <VideosList videos={result.data || []} showProject={true} />
    </div>
  );
}

function VideosPageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center py-12">
        <Video className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Loading videos...
        </h3>
        <p className="text-gray-600">Please wait while we fetch your videos.</p>
      </div>
    </div>
  );
}
