import { sql } from 'drizzle-orm'

export const BOT_UA_PATTERNS = [
	'googlebot',
	'bingbot',
	'yandexbot',
	'baiduspider',
	'facebookexternalhit',
	'twitterbot',
	'linkedinbot',
	'slackbot',
	'applebot',
	'amazonbot',
	'ahrefsbot',
	'semrushbot',
	'dotbot',
	'mj12bot',
	'duckduckbot',
	'petalbot',
	'bytespider',
	'crawler',
	'spider',
	'scraper',
	'headlesschrome',
	'python-requests',
	'scrapy',
	'wget/',
	'curl/',
]

export const BOT_REFERRER_PATTERNS = [
	'semalt.com',
	'buttons-for-website.com',
]

export const getBotFilterSQLString = () => {
	const uaConditions = BOT_UA_PATTERNS
		.map(p => `lower(userAgent) NOT LIKE '%${p}%'`)
		.join(' AND ')
	const referrerConditions = BOT_REFERRER_PATTERNS
		.map(p => `lower(referrer) NOT LIKE '%${p}%'`)
		.join(' AND ')
	return `(${uaConditions} AND ${referrerConditions})`
}

export const getBotFilterSQL = () => sql.raw(getBotFilterSQLString())
