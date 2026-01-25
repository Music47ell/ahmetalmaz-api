import { UMAMI_URL, UMAMI_SITE_ID, UMAMI_TOKEN } from '../utils/helpers'
import { UmamiMetric } from '../types.js'


export const getUmamiStats = async (slug: string): Promise<UmamiMetric[]> => {
  const response = await fetch(
  `${UMAMI_URL}/api/websites/${UMAMI_SITE_ID}/metrics` +
    `?startAt=1763975614375` +
    `&endAt=1769355953146` +
    `&unit=day` +
    `&timezone=Asia%2FQatar` +
    `&path=eq./blog/${slug}` +
    `&type=path`,
  {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${UMAMI_TOKEN}`
    }
  }
)

  if (!response.ok) {
    throw new Error('Failed to fetch Umami stats')
  }

  const data: UmamiMetric[] = await response.json()

  return data.map(({ x, y }) => ({ x, y }))
}
