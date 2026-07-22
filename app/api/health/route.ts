export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json(
    {
      ok: true,
      service: 'hooptrack',
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
