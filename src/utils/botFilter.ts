import { sql } from 'drizzle-orm'

/**
 * Known bot/crawler user-agent substrings (lowercased).
 * All values are hardcoded constants — never user-supplied input.
 * Comparisons use `lower(userAgent) NOT LIKE '%pattern%'` so matching
 * is case-insensitive.
 *
 * To add a new pattern simply append a lowercase string.  Avoid patterns
 * that contain SQL metacharacters (%, _, \, ') — use {@link escapeLikePattern}
 * to handle them safely if needed.
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
 * Escapes SQLite LIKE metacharacters in a pattern string so it is treated
 * as a literal substring rather than a wildcard expression.
 *
 * Escaped characters:
 * - `\`  → `\\`   (escape char itself, must come first)
 * - `%`  → `\%`   (wildcard — any sequence of characters)
 * - `_`  → `\_`   (wildcard — any single character)
 * - `'`  → `''`   (SQL string literal delimiter)
 *
 * The generated LIKE clause must include `ESCAPE '\\'` to activate the
 * custom escape character.
 */
const escapeLikePattern = (pattern: string): string => {
	return pattern
		.replace(/\\/g, '\\\\')
		.replace(/%/g, '\\%')
		.replace(/_/g, '\\_')
		.replace(/'/g, "''")
}

/**
 * Builds a raw SQL condition string that filters out known bots based on
 * the `userAgent` and `referrer` columns.
 *
 * - Patterns are all hardcoded constants, not user input.
 * - Each pattern is escaped via {@link escapeLikePattern} before
 *   interpolation to prevent accidental SQL syntax errors.
 * - Returns `'1=1'` for an empty pattern list so the SQL remains valid.
 *
 * Performance note: every `LIKE '%pattern%'` condition prevents index usage
 * and performs a full scan.  If the analytics table grows very large,
 * consider pre-computing an `isBot` column at insert time.
 */
export const getBotFilterSQLString = () => {
	const uaConditions =
		BOT_UA_PATTERNS.length > 0
			? BOT_UA_PATTERNS
					.map(p => {
						const escaped = escapeLikePattern(p.toLowerCase())
						return `lower(userAgent) NOT LIKE '%${escaped}%' ESCAPE '\\'`
					})
					.join(' AND ')
			: '1=1'

	const referrerConditions =
		BOT_REFERRER_PATTERNS.length > 0
			? BOT_REFERRER_PATTERNS
					.map(p => {
						const escaped = escapeLikePattern(p.toLowerCase())
						return `lower(referrer) NOT LIKE '%${escaped}%' ESCAPE '\\'`
					})
					.join(' AND ')
			: '1=1'

	return `(${uaConditions} AND ${referrerConditions})`
}

/**
 * Returns a drizzle-orm {@link sql.raw} fragment containing the full bot
 * filter condition.  Embed it in any `sql\`\`` template literal:
 *
 * ```ts
 * const stmt = sql`SELECT count(*) FROM analytics WHERE ${getBotFilterSQL()}`
 * ```
 */
export const getBotFilterSQL = () => sql.raw(getBotFilterSQLString())
