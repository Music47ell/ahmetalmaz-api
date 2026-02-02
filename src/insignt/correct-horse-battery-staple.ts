// handleAnalytics.ts

import { updateAnalytics } from '../turso'
import { getFlagEmoji } from '../utils/helpers'

export async function handleAnalytics(request: Request) {
  const body = await request.json()
  const { title, slug, referrer } = body

  // Access the geo-location data from the Cloudflare injected headers
  const country = request.headers.get('country')
  const city = request.headers.get('city')
  const latitude = request.headers.get('latitude')
  const longitude = request.headers.get('longitude')

  // Validate all required data
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

  // Construct the data object to send to your analytics service
  const data = {
    title,
    slug,
    referrer,
    country,
    city,
    latitude,
    longitude,
    flag: getFlagEmoji(country), // Assuming this function returns a flag emoji
  }

  // Send the data to your analytics service
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
