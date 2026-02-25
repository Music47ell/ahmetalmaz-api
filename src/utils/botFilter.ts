/**
 * Known bot/crawler user-agent substrings (lowercased).
 * All values are hardcoded constants — never user-supplied input.
 * Comparisons use `String.prototype.includes()` after lowercasing both
 * sides, so matching is case-insensitive.
 *
 * To add a new pattern, simply append a lowercase string to this array.
 */
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
	'wget',
	'curl',
	// AI scrapers / LLM training bots
	'gptbot',
	'claudebot',
	'anthropic-ai',
	'cohere-ai',
	'perplexitybot',
	'youbot',
	// Archive bots
	'ia_archiver',
	'archive.org_bot',
]

/**
 * Known spam/bot referrer domain substrings (lowercased).
 * Patterns are matched as substrings, so 'semalt.com' will filter any
 * referrer URL that contains that string.  This is intentional for broad
 * coverage, but be aware that overly generic patterns could cause
 * false positives.
 */
export const BOT_REFERRER_PATTERNS = [
	'semalt.com',
	'buttons-for-website.com',
]

/**
 * Returns `true` when the given user-agent or referrer string matches any
 * known bot pattern.  Call this at insert time so that bot classification
 * is stored in the `isBot` column, avoiding repeated full-table scans
 * at query time.
 *
 * @param userAgent - The raw `User-Agent` header value (may be empty).
 * @param referrer  - The raw referrer URL (may be empty).
 */
export const detectBot = (userAgent: string, referrer: string): boolean => {
	const ua = userAgent.toLowerCase()
	const ref = referrer.toLowerCase()
	return BOT_UA_PATTERNS.some(p => ua.includes(p))
		|| BOT_REFERRER_PATTERNS.some(p => ref.includes(p))
}
