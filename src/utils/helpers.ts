export const API_URL = process.env.API_URL
export const USERNAME = process.env.USERNAME
export const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID

if (!API_URL) throw new Error('API_URL environment variable is not defined.')
if (!USERNAME) throw new Error('USERNAME environment variable is not defined.')
if (!TRAKT_CLIENT_ID) throw new Error('TRAKT_CLIENT_ID environment variable is not defined.')

export const normalize = (str: string) =>
  str
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // Remove parentheses
    .replace(/[^\w\s]/g, '') // Remove special chars
    .trim()

export const logError = (message: string, error?: unknown) => {
  console.error(message, error ?? '')
}

const LEVEL_FACTOR = 0.025

function get_level(xp: number) {
	return Math.floor(Math.sqrt(xp) * LEVEL_FACTOR)
}

function get_next_level_xp(level: number) {
	return Math.ceil((level + 1) / LEVEL_FACTOR) ** 2
}

function get_level_progress(xp: number) {
	const level = get_level(xp)
	const current_level_xp = get_next_level_xp(level - 1)
	const next_level_xp = get_next_level_xp(level)
	const have_xp = xp - current_level_xp
	const needed_xp = next_level_xp - current_level_xp

	return Math.round((have_xp / needed_xp) * 100)
}

export { get_level, get_level_progress, get_next_level_xp }
