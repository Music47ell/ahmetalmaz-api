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
 * Known spam/bot referrer domains (lowercased).
 * Matching is done against the parsed hostname of the referrer URL, so
 * 'semalt.com' matches 'semalt.com' and 'sub.semalt.com' but NOT
 * 'notsemalt.com'.
 */
export const BOT_REFERRER_PATTERNS = ['semalt.com', 'buttons-for-website.com']

/**
 * Returns `true` when the referrer URL's hostname equals `domain` or is a
 * subdomain of `domain` (e.g. 'sub.semalt.com').
 */
const matchesReferrerDomain = (hostname: string, domain: string): boolean =>
	hostname === domain || hostname.endsWith(`.${domain}`)

/**
 * Returns `true` when the given user-agent or referrer string matches any
 * known bot pattern.  Call this at insert time so that bot classification
 * is stored in the `isBot` column, avoiding repeated full-table scans
 * at query time.
 *
 * Referrer matching uses parsed hostname comparison, so 'semalt.com' will
 * not cause false positives for domains like 'notsemalt.com'.
 *
 * @param userAgent - The raw `User-Agent` header value (may be empty).
 * @param referrer  - The raw referrer URL (may be empty).
 */
export const detectBot = (userAgent: string, referrer: string): boolean => {
	const ua = userAgent.toLowerCase()
	if (BOT_UA_PATTERNS.some((p) => ua.includes(p))) return true

	if (referrer) {
		try {
			const hostname = new URL(referrer).hostname.toLowerCase()
			if (BOT_REFERRER_PATTERNS.some((d) => matchesReferrerDomain(hostname, d)))
				return true
		} catch {
			// unparseable referrer — fall back to substring match
			const ref = referrer.toLowerCase()
			if (BOT_REFERRER_PATTERNS.some((d) => ref.includes(d))) return true
		}
	}

	return false
}
