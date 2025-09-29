import { Button } from "@/components/ui/button";
import { Video, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VideoNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center px-4">
        <Video className="h-24 w-24 text-gray-400 mx-auto mb-6" />

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Video Not Found
        </h1>

        <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
          The video you're looking for doesn't exist or you don't have
          permission to view it.
        </p>

        <div className="flex gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href="/videos">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Videos
            </Link>
          </Button>

          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
