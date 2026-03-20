import type { Context } from 'hono'
import { db } from '../db.js'
import { detectBot } from '../utils/botFilter.js'
import {
	decodeCfHeader,
	getCountryName,
	getFlagEmoji,
} from '../utils/helpers.js'

const getBlogViews = async () => {
	const result = await db.execute({
		sql: 'SELECT COUNT(*) as total FROM analytics WHERE isBot = 0 AND statusCode = 200',
	})
	return (result.rows[0]?.total as number) ?? 0
}

const getBlogViewsBySlug = async (slug: string) => {
	const result = await db.execute({
		sql: 'SELECT COUNT(*) as total FROM analytics WHERE slug = $slug AND isBot = 0 AND statusCode = 200',
		args: { $slug: `/blog/${slug}` },
	})
	return (result.rows[0]?.total as number) ?? 0
}

const getAnalytics = async () => {
	const countries = (
		await db.execute({
			sql: 'SELECT flag, country, COUNT(country) as total FROM analytics WHERE isBot = 0 GROUP BY flag, country ORDER BY total DESC LIMIT 10',
		})
	).rows.map((r) => ({
		flag: (r.flag as string) || '🌍',
		country: (r.country as string) || 'Unknown',
		total: r.total as number,
	}))

	const cities = (
		await db.execute({
			sql: 'SELECT flag, city, COUNT(city) as total FROM analytics WHERE isBot = 0 GROUP BY flag, city ORDER BY total DESC LIMIT 10',
		})
	).rows.map((r) => ({
		flag: (r.flag as string) || '🌍',
		city: (r.city as string) || 'Unknown',
		total: r.total as number,
	}))

	const referrers = (
		await db.execute({
			sql: "SELECT referrer, COUNT(referrer) as total FROM analytics WHERE referrer NOT LIKE '%.ahmetalmaz.com%' AND statusCode = 200 AND isBot = 0 GROUP BY referrer ORDER BY COUNT(referrer) DESC LIMIT 10",
		})
	).rows.map((r) => ({
		referrer: (r.referrer as string) || 'Unknown',
		total: r.total as number,
	}))

	const slugs = (
		await db.execute({
			sql: 'SELECT slug, title, COUNT(slug) as total FROM analytics WHERE statusCode = 200 AND isBot = 0 GROUP BY slug ORDER BY total DESC LIMIT 10',
		})
	).rows.map((r) => ({
		slug: (r.slug as string) || 'Unknown',
		title: (r.title as string) || 'Unknown',
		total: r.total as number,
	}))

	const browsers = (
		await db.execute({
			sql: 'SELECT browser, COUNT(browser) as total FROM analytics WHERE isBot = 0 GROUP BY browser ORDER BY total DESC LIMIT 10',
		})
	).rows.map((r) => ({
		browser: (r.browser as string) || 'Unknown',
		total: r.total as number,
	}))

	const operatingSystems = (
		await db.execute({
			sql: 'SELECT os, COUNT(os) as total FROM analytics WHERE isBot = 0 GROUP BY os ORDER BY total DESC LIMIT 10',
		})
	).rows.map((r) => ({
		os: (r.os as string) || 'Unknown',
		total: r.total as number,
	}))

	const deviceTypes = (
		await db.execute({
			sql: 'SELECT deviceType, COUNT(deviceType) as total FROM analytics WHERE isBot = 0 GROUP BY deviceType ORDER BY total DESC LIMIT 10',
		})
	).rows.map((r) => ({
		type: (r.deviceType as string) || 'Unknown',
		total: r.total as number,
	}))

	const monthlyBase =
		"eventType = 'pageview' AND timestamp > (strftime('%s','now','-30 days') * 1000) AND isBot = 0"

	const monthlyPageViewsStats =
		((
			await db.execute({
				sql: `SELECT COUNT(*) as total FROM analytics WHERE ${monthlyBase}`,
			})
		).rows[0]?.total as number) ?? 0

	const monthlyVisitsStats =
		((
			await db.execute({
				sql: `SELECT COUNT(DISTINCT sessionId) as total FROM analytics WHERE ${monthlyBase}`,
			})
		).rows[0]?.total as number) ?? 0

	const monthlyVisitorsStats =
		((
			await db.execute({
				sql: `SELECT COUNT(DISTINCT visitorId) as total FROM analytics WHERE ${monthlyBase}`,
			})
		).rows[0]?.total as number) ?? 0

	const monthlyVisitDurationStats =
		((
			await db.execute({
				sql: `SELECT AVG(sessionDuration) as total FROM (SELECT (MAX(timestamp) - MIN(timestamp)) as sessionDuration FROM analytics WHERE ${monthlyBase} GROUP BY sessionId)`,
			})
		).rows[0]?.total as number) ?? 0

	const monthlyBounceRateStats =
		((
			await db.execute({
				sql: `SELECT (SELECT COUNT(*) FROM (SELECT sessionId FROM analytics WHERE ${monthlyBase} GROUP BY sessionId HAVING COUNT(*) = 1)) * 100.0 / (SELECT COUNT(DISTINCT sessionId) FROM analytics WHERE ${monthlyBase}) as total`,
			})
		).rows[0]?.total as number) ?? 0

	const monthlyEntryPagesStats = (
		await db.execute({
			sql: `SELECT slug, COUNT(*) as total FROM (SELECT slug FROM analytics a WHERE ${monthlyBase} AND timestamp = (SELECT MIN(timestamp) FROM analytics WHERE sessionId = a.sessionId AND eventType = 'pageview')) GROUP BY slug ORDER BY total DESC`,
		})
	).rows.map((r) => ({
		slug: r.slug as string,
		total: r.total as number,
	}))

	const monthlyExitPagesStats = (
		await db.execute({
			sql: `SELECT slug, COUNT(*) as total FROM (SELECT slug FROM analytics a WHERE ${monthlyBase} AND timestamp = (SELECT MAX(timestamp) FROM analytics WHERE sessionId = a.sessionId AND eventType = 'pageview')) GROUP BY slug ORDER BY total DESC`,
		})
	).rows.map((r) => ({
		slug: r.slug as string,
		total: r.total as number,
	}))

	const monthlyLanguageStats = (
		await db.execute({
			sql: `SELECT language, COUNT(*) as total FROM analytics WHERE timestamp > (strftime('%s','now','-30 days') * 1000) AND isBot = 0 GROUP BY language ORDER BY total DESC`,
		})
	).rows.map((r) => ({
		language: r.language as string,
		total: r.total as number,
	}))

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

const updateAnalytics = async (data: {
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
	await db.execute({
		sql: `INSERT INTO analytics (
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
		args: {
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
		},
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

		await updateAnalytics({
			visitorId,
			sessionId,
			eventType,
			eventName,
			title,
			slug: slug.endsWith('/') ? slug.slice(0, -1) : slug,
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
	getAnalytics,
	getBlogViews,
	getBlogViewsBySlug,
	handleAnalytics,
	updateAnalytics,
}
