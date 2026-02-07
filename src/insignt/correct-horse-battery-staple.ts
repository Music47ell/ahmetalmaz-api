import { updateAnalytics } from '../turso'
import { getFlagEmoji } from '../utils/helpers'

export async function handleAnalytics(request: Request) {
  const body = await request.json()
  const { title, slug, referrer } = body

  const country = request.headers.get('country')
  const city = request.headers.get('city')
  const latitude = request.headers.get('latitude')
  const longitude = request.headers.get('longitude')

  if (
    !title ||
    !slug ||
    !referrer ||
    !country ||
    !city ||
    !latitude ||
    !longitude
  ) {
    return new Response('Missing data', { status: 400 })
  }

  const data = {
    title,
    slug,
    referrer,
    country,
    city,
    latitude,
    longitude,
    flag: getFlagEmoji(country),
  }

  await updateAnalytics(data)

  return new Response(
    JSON.stringify({ message: 'A Ok!' }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}
