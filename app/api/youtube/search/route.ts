import { getSession } from '@/lib/session'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  if (!query) return Response.json({ error: 'Missing query' }, { status: 400 })

  try {
    // Fetch YouTube search results page
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }
    )
    const html = await res.text()

    // Extract video IDs from the YouTube search results HTML
    // YouTube embeds video data in a script tag as JSON
    const videoIds: string[] = []
    const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g
    let match
    while ((match = regex.exec(html)) !== null) {
      if (!videoIds.includes(match[1])) {
        videoIds.push(match[1])
      }
      if (videoIds.length >= 5) break
    }

    if (videoIds.length === 0) {
      return Response.json({ error: 'No videos found' }, { status: 404 })
    }

    const videos = videoIds.map((id) => ({
      id,
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
    }))

    return Response.json({ videos })
  } catch (err) {
    console.error('YouTube search error:', err)
    return Response.json({ error: 'Search failed' }, { status: 500 })
  }
}
