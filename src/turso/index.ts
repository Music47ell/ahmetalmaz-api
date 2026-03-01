import type { Context } from 'hono'
import { db } from '../db.js'
import { detectBot } from '../utils/botFilter.js'
import {
	decodeCfHeader,
	getCountryName,
	getFlagEmoji,
} from '../utils/helpers.js'

const getBlogViews = () => {
	const row = db
		.query<{ total: number }, []>('SELECT COUNT(*) as total FROM analytics')
		.get()
	return row?.total ?? 0
}

const getBlogViewsBySlug = (slug: string) => {
	const row = db
		.query<{ total: number }, [string]>(
			'SELECT COUNT(*) as total FROM analytics WHERE slug = ?',
		)
		.get(decodeURI(`/blog/${slug}`))
	return row?.total ?? 0
}

const getAnalytics = async () => {
	type Row = Record<string, unknown>

	const countries = db
		.query<{ flag: string; country: string; total: number }, []>(
			'SELECT flag, country, COUNT(country) as total FROM analytics WHERE isBot = 0 GROUP BY flag, country ORDER BY total DESC LIMIT 10',
		)
		.all()
		.map((r) => ({
			flag: r.flag || '🌍',
			country: r.country || 'Unknown',
			total: r.total,
		}))

	const cities = db
		.query<{ flag: string; city: string; total: number }, []>(
			'SELECT flag, city, COUNT(city) as total FROM analytics WHERE isBot = 0 GROUP BY flag, city ORDER BY total DESC LIMIT 10',
		)
		.all()
		.map((r) => ({
			flag: r.flag || '🌍',
			city: r.city || 'Unknown',
			total: r.total,
		}))

	const referrers = db
		.query<{ referrer: string; total: number }, []>(
			"SELECT referrer, COUNT(referrer) as total FROM analytics WHERE referrer NOT LIKE '%.ahmetalmaz.com%' AND statusCode = 200 AND isBot = 0 GROUP BY referrer ORDER BY COUNT(referrer) DESC LIMIT 10",
		)
		.all()
		.map((r) => ({ referrer: r.referrer || 'Unknown', total: r.total }))

	const slugs = db
		.query<{ slug: string; title: string; total: number }, []>(
			"SELECT slug, title, COUNT(slug) as total FROM analytics WHERE title NOT LIKE '%ahmetalmaz%' AND statusCode = 200 AND isBot = 0 GROUP BY slug ORDER BY total DESC LIMIT 10",
		)
		.all()
		.map((r) => ({
			slug: r.slug || 'Unknown',
			title: r.title || 'Unknown',
			total: r.total,
		}))

	const browsers = db
		.query<{ browser: string; total: number }, []>(
			'SELECT browser, COUNT(browser) as total FROM analytics WHERE isBot = 0 GROUP BY browser ORDER BY total DESC LIMIT 10',
		)
		.all()
		.map((r) => ({ browser: r.browser || 'Unknown', total: r.total }))

	const operatingSystems = db
		.query<{ os: string; total: number }, []>(
			'SELECT os, COUNT(os) as total FROM analytics WHERE isBot = 0 GROUP BY os ORDER BY total DESC LIMIT 10',
		)
		.all()
		.map((r) => ({ os: r.os || 'Unknown', total: r.total }))

	const deviceTypes = db
		.query<{ deviceType: string; total: number }, []>(
			'SELECT deviceType, COUNT(deviceType) as total FROM analytics WHERE isBot = 0 GROUP BY deviceType ORDER BY total DESC LIMIT 10',
		)
		.all()
		.map((r) => ({ type: r.deviceType || 'Unknown', total: r.total }))

	const monthlyBase =
		"eventType = 'pageview' AND timestamp > (strftime('%s','now','-30 days') * 1000) AND isBot = 0"

	const monthlyPageViewsStats =
		db
			.query<{ total: number }, []>(
				`SELECT COUNT(*) as total FROM analytics WHERE ${monthlyBase}`,
			)
			.get()?.total ?? 0

	const monthlyVisitsStats =
		db
			.query<{ total: number }, []>(
				`SELECT COUNT(DISTINCT sessionId) as total FROM analytics WHERE ${monthlyBase}`,
			)
			.get()?.total ?? 0

	const monthlyVisitorsStats =
		db
			.query<{ total: number }, []>(
				`SELECT COUNT(DISTINCT visitorId) as total FROM analytics WHERE ${monthlyBase}`,
			)
			.get()?.total ?? 0

	const monthlyVisitDurationStats =
		db
			.query<{ total: number }, []>(
				`SELECT AVG(sessionDuration) as total FROM (SELECT (MAX(timestamp) - MIN(timestamp)) as sessionDuration FROM analytics WHERE ${monthlyBase} GROUP BY sessionId)`,
			)
			.get()?.total ?? 0

	const monthlyBounceRateStats =
		db
			.query<{ total: number }, []>(
				`SELECT (SELECT COUNT(*) FROM (SELECT sessionId FROM analytics WHERE ${monthlyBase} GROUP BY sessionId HAVING COUNT(*) = 1)) * 100.0 / (SELECT COUNT(DISTINCT sessionId) FROM analytics WHERE ${monthlyBase}) as total`,
			)
			.get()?.total ?? 0

	const monthlyEntryPagesStats = db
		.query<Row, []>(
			`SELECT slug, COUNT(*) as total FROM (SELECT slug FROM analytics a WHERE ${monthlyBase} AND timestamp = (SELECT MIN(timestamp) FROM analytics WHERE sessionId = a.sessionId AND eventType = 'pageview')) GROUP BY slug ORDER BY total DESC`,
		)
		.all()

	const monthlyExitPagesStats = db
		.query<Row, []>(
			`SELECT slug, COUNT(*) as total FROM (SELECT slug FROM analytics a WHERE ${monthlyBase} AND timestamp = (SELECT MAX(timestamp) FROM analytics WHERE sessionId = a.sessionId AND eventType = 'pageview')) GROUP BY slug ORDER BY total DESC`,
		)
		.all()

	const monthlyLanguageStats = db
		.query<Row, []>(
			`SELECT language, COUNT(*) as total FROM analytics WHERE timestamp > (strftime('%s','now','-30 days') * 1000) AND isBot = 0 GROUP BY language ORDER BY total DESC`,
		)
		.all()

	return {
		monthlyPageViewsStats,
		monthlyVisitsStats,
		monthlyVisitorsStats,
		monthlyVisitDurationStats,
		monthlyBounceRateStats,
		monthlyEntryPagesStats,
		monthlyExitPagesStats,
		monthlyLanguageStats,
		monthlyCountries: countries,
		monthlyCities: cities,
		monthlyReferrers: referrers,
		monthlySlugs: slugs,
		monthlyBrowsers: browsers,
		monthlyOperatingSystems: operatingSystems,
		monthlyDeviceTypes: deviceTypes,
	}
}

const updateAnalytics = (data: {
	visitorId: string
	sessionId: string
	eventType: string
	eventName?: string
	title: string
	slug: string
	referrer: string
	countryCode: string
	country: string
	continent?: string
	region?: string
	regionCode?: string
	city: string
	latitude?: number
	longitude?: number
	timezone?: string
	flag: string
	browser?: string
	browserVersion?: string
	engine?: string
	engineVersion?: string
	deviceType?: string
	deviceVendor?: string
	deviceModel?: string
	language?: string
	os?: string
	osVersion?: string
	screenResolution?: string
	userAgent?: string
	statusCode: number
}) => {
	db.query(
		`INSERT INTO analytics (
visitorId, sessionId, eventType, eventName, title, slug, referrer,
flag, countryCode, country, continent, region, regionCode,
city, latitude, longitude, timezone,
browser, browserVersion, engine, engineVersion,
deviceType, deviceVendor, deviceModel,
language, os, osVersion, screenResolution, userAgent,
statusCode, isBot
) VALUES (
$visitorId, $sessionId, $eventType, $eventName, $title, $slug, $referrer,
$flag, $countryCode, $country, $continent, $region, $regionCode,
$city, $latitude, $longitude, $timezone,
$browser, $browserVersion, $engine, $engineVersion,
$deviceType, $deviceVendor, $deviceModel,
$language, $os, $osVersion, $screenResolution, $userAgent,
$statusCode, $isBot
)`,
	).run({
		$visitorId: data.visitorId,
		$sessionId: data.sessionId,
		$eventType: data.eventType,
		$eventName: data.eventName ?? '',
		$title: data.title,
		$slug: data.slug,
		$referrer: data.referrer,
		$flag: data.flag,
		$countryCode: data.countryCode,
		$country: data.country,
		$continent: data.continent ?? 'Unknown',
		$region: data.region ?? 'Unknown',
		$regionCode: data.regionCode ?? 'Unknown',
		$city: data.city,
		$latitude: data.latitude ?? 0,
		$longitude: data.longitude ?? 0,
		$timezone: data.timezone ?? 'Unknown',
		$browser: data.browser ?? 'Unknown',
		$browserVersion: data.browserVersion ?? '',
		$engine: data.engine ?? 'Unknown',
		$engineVersion: data.engineVersion ?? '',
		$deviceType: data.deviceType ?? 'Unknown',
		$deviceVendor: data.deviceVendor ?? 'Unknown',
		$deviceModel: data.deviceModel ?? 'Unknown',
		$language: data.language ?? '',
		$os: data.os ?? 'Unknown',
		$osVersion: data.osVersion ?? '',
		$screenResolution: data.screenResolution ?? '',
		$userAgent: data.userAgent ?? 'Unknown',
		$statusCode: data.statusCode,
		$isBot: detectBot(data.userAgent ?? '', data.referrer) ? 1 : 0,
	})
}

const handleAnalytics = async (c: Context) => {
	try {
		const body = await c.req.json()
		const {
			visitorId,
			sessionId,
			eventType,
			eventName,
			title,
			slug,
			referrer,
			browser,
			browserVersion,
			engine,
			engineVersion,
			deviceType,
			deviceVendor,
			deviceModel,
			language,
			os,
			osVersion,
			screenResolution,
			userAgent,
			statusCode,
		} = body

		const countryCode = c.req.header('cf-ipcountry') || 'Unknown'
		const country = getCountryName(countryCode)
		const continent = c.req.header('cf-ipcontinent') || 'Unknown'
		const cityRaw = c.req.header('cf-ipcity') || 'Unknown'
		const city = decodeCfHeader(cityRaw)
		const region = c.req.header('cf-region') || 'Unknown'
		const regionCode = c.req.header('cf-region-code') || 'Unknown'
		const latitude = parseFloat(c.req.header('cf-iplatitude') || '0')
		const longitude = parseFloat(c.req.header('cf-iplongitude') || '0')
		const timezone = c.req.header('cf-timezone') || 'Unknown'
		const flag = getFlagEmoji(countryCode)

		if (
			!visitorId ||
			!sessionId ||
			!eventType ||
			!title ||
			!slug ||
			!referrer
		) {
			return new Response('Missing required body data', { status: 400 })
		}

		updateAnalytics({
			visitorId,
			sessionId,
			eventType,
			eventName,
			title,
			slug,
			referrer,
			browser: browser || 'Unknown',
			browserVersion: browserVersion || '',
			engine: engine || 'Unknown',
			engineVersion: engineVersion || '',
			deviceType: deviceType || 'Unknown',
			deviceVendor: deviceVendor || 'Unknown',
			deviceModel: deviceModel || 'Unknown',
			language: language || '',
			os: os || 'Unknown',
			osVersion: osVersion || '',
			screenResolution: screenResolution || '',
			userAgent: userAgent || 'Unknown',
			countryCode,
			country,
			continent,
			region,
			regionCode,
			city,
			latitude,
			longitude,
			timezone,
			flag,
			statusCode,
		})

		return new Response(JSON.stringify({ message: 'A Ok!' }), {
			headers: { 'Content-Type': 'application/json' },
		})
	} catch (err) {
		console.error('Analytics error:', err)
		return new Response('Server Error', { status: 500 })
	}
}

export {
	getBlogViews,
	getBlogViewsBySlug,
	getAnalytics,
	updateAnalytics,
	handleAnalytics,
}
