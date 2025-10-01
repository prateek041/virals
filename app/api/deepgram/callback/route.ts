import { updateTranscript } from "@/app/actions/videos";

export const runtime = "edge";

/**
 * Handle POST requests from Deepgram webhook
 * @param request Request object from Deepgram webhook
 * @returns Response indicating success or failure
 */
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const requestId = data?.metadata.request_id;
    const transcriptText = data?.results.channels[0].alternatives[0].transcript;
    const transcriptData = data?.results.channels[0].alternatives[0].words;

    await updateTranscript(requestId, transcriptText, transcriptData);

    return new Response("ok", { status: 200 });
  } catch (error) {
    return new Response("error", { status: 500 });
  }
}
