// Stub route for NextAuth debug endpoint to prevent 404 errors
export async function POST() {
  return Response.json({ success: true })
}

export async function GET() {
  return Response.json({ success: true })
}
