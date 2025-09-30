export const runtime = "edge"; // optional: 'nodejs' or 'edge'

export async function POST(request: Request) {
  console.log("Webhook received");

  const data = await request.json();
  console.log(
    "transcript is",
    data?.results.channels[0].alternatives[0].transcript
  );

  console.log("words are", data?.results.channels[0].alternatives[0].words);
  console.log("metadata is", data?.metadata.request_id);

  return new Response("ok", { status: 200 });
}
