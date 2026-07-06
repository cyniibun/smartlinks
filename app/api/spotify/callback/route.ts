export async function GET() {
  return new Response("Spotify OAuth callback placeholder. Client Credentials search does not use this route.", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
