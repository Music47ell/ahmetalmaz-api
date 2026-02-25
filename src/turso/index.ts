import { createClient } from '@libsql/client/web'
import { drizzle } from 'drizzle-orm/libsql'
import { sql, eq } from 'drizzle-orm'
import { integer, numeric, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { getFlagEmoji, decodeCfHeader, getCountryName } from '../utils/helpers'
import { detectBot } from '../utils/botFilter'

const connection = () => {
	return createClient({
		url: process.env.DATABASE_URL || '',
		authToken: process.env.DATABASE_AUTH_TOKEN || '',
	})
}

export const db = drizzle(connection())

const analyticsTable = sqliteTable('analytics', {
  id: integer("id").primaryKey(),
  timestamp: numeric("timestamp").notNull().default(sql`(strftime('%s','now') * 1000)`),

  visitorId: text("visitorId").notNull(),
  sessionId: text("sessionId").notNull(),
  eventType: text("eventType").notNull(),
  eventName: text("eventName").notNull().default(''),

  title: text("title").notNull().default(''),
  slug: text("slug").notNull().default(''),
  referrer: text("referrer").notNull().default(''),
  statusCode: integer("statusCode").notNull().default(0),

  os: text("os").notNull().default('Unknown'),
  osVersion: text("osVersion").notNull().default('Unknown'),
  browser: text("browser").notNull().default('Unknown'),
  browserVersion: text("browserVersion").notNull().default('Unknown'),
  engine: text("engine").notNull().default('Unknown'),
  engineVersion: text("engineVersion").notNull().default('Unknown'),
  deviceType: text("deviceType").notNull().default('Unknown'),
  deviceVendor: text("deviceVendor").notNull().default('Unknown'),
  deviceModel: text("deviceModel").notNull().default('Unknown'),

  flag: text("flag").notNull().default(''),
  country: text("country").notNull().default('Unknown'),
  countryCode: text("countryCode").notNull().default('Unknown'),
  city: text("city").notNull().default('Unknown'),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  timezone: text("timezone").notNull().default('Unknown'),
  continent: text("continent").notNull().default('Unknown'),
  region: text("region").notNull().default('Unknown'),
  regionCode: text("regionCode").notNull().default('Unknown'),
  language: text('language').notNull().default('Unknown'),

  userAgent: text("userAgent").notNull().default(''),
  screenResolution: text("screenResolution").notNull().default(''),
  isBot: integer("isBot").notNull().default(0),
});


const getBlogViews = async () => {
	const db = drizzle(connection())
	const result = await db.select().from(analyticsTable).all()
	if (result.length === 0) {
		return 0
	}
	return result.length
}

const getBlogViewsBySlug = async (slug: string) => {
	const db = drizzle(connection())
	const result = await db
		.select()
		.from(analyticsTable)
		.where(eq(analyticsTable.slug, decodeURI(`/blog/${slug}`)))
		.all()
	if (result.length === 0) {
		return 0
	}
	return result.length
}

const getAnalytics = async () => {
	const db = drizzle(connection())
	const countries = async () => {
		const topTenCountriesStatement = sql`select flag, country, count(country) as total from analytics where isBot = 0 group by flag, country order by total desc limit 10`
		const topTenCountriesRes = await db.all(topTenCountriesStatement)
		const topTenCountries2 = (
			topTenCountriesRes as {
				flag: string | null
				country: string | null
				total: number
			}[]
		).map((item) => ({
			flag: item.flag || '🌍',
			country: item.country || 'Unknown',
			total: item.total || 0,
		}))
		return topTenCountries2
	}
	const cities = async () => {
		const topTenCitiesStatement = sql`select flag, city, count(city) as total from analytics where isBot = 0 group by flag, city order by total desc limit 10`
		const topTenCitiesRes = await db.all(topTenCitiesStatement)
		const topTenCities2 = (
			topTenCitiesRes as {
				flag: string | null
				city: string | null
				total: number
			}[]
		).map((item) => ({
			flag: item.flag || '🌍',
			city: item.city || 'Unknown',
			total: item.total || 0,
		}))
		return topTenCities2
	}
	const referrers = async () => {
		const topTenReferrersStatement = sql`select referrer, count(referrer) as total from analytics where referrer not like '%.ahmetalmaz.com%' and statusCode = 200 and isBot = 0 group by referrer order by count(referrer) desc limit 10`
		const topTenReferrersRes = await db.all(topTenReferrersStatement)
		const topTenReferrers2 = (
			topTenReferrersRes as { referrer: string | null; total: number }[]
		).map((item) => ({
			referrer: item.referrer || 'Unknown',
			total: item.total,
		}))
		return topTenReferrers2
	}
	const slugs = async () => {
		const topTenSlugsStatement = sql`select slug, title, count(slug) as total from analytics where title not like '%ahmetalmaz%' and statusCode = 200 and isBot = 0 group by slug order by total desc limit 10`
		const topTenSlugsRes = await db.all(topTenSlugsStatement)
		const topTenSlugs2 = (
			topTenSlugsRes as {
				slug: string | null
				title: string | null
				total: number
			}[]
		).map((item) => ({
			slug: item.slug || 'Unknown',
			title: item.title || 'Unknown',
			total: item.total,
		}))
		return topTenSlugs2
	}

	const browsers = async () => {
		const topTenBrowsersStatement = sql`select browser, count(browser) as total from analytics where isBot = 0 group by browser order by total desc limit 10`
		const topTenBrowsersRes = await db.all(topTenBrowsersStatement)
		const topTenBrowsers2 = (
			topTenBrowsersRes as {
				browser: string | null
				total: number
			}[]
		).map((item) => ({
			browser: item.browser || 'Unknown',
			total: item.total,
		}))
		return topTenBrowsers2
	}

	const operatingSystems = async () => {
		const topTenOperatingSystemsStatement = sql`select os, count(os) as total from analytics where isBot = 0 group by os order by total desc limit 10`
		const topTenOperatingSystemsRes = await db.all(topTenOperatingSystemsStatement)
		const topTenOperatingSystems2 = (
			topTenOperatingSystemsRes as {
				os: string | null
				total: number
			}[]
		).map((item) => ({
			os: item.os || 'Unknown',
			total: item.total,
		}))
		return topTenOperatingSystems2
	}
	const deviceTypes = async () => {
		const topTenDevicesStatement = sql`select deviceType, count(deviceType) as total from analytics where isBot = 0 group by deviceType order by total desc limit 10`
		const topTenDevicesRes = await db.all(topTenDevicesStatement)
		const topTenDevices2 = (
			topTenDevicesRes as {
				deviceType: string | null
				total: number
			}[]
		).map((item) => ({
			type: item.deviceType || 'Unknown',
			total: item.total,
		}))
		return topTenDevices2
	}

	const pageViewsStats = async () => {
		const pageViewsStatement = sql`
			select count(*) as total
			from analytics
			where eventType = 'pageview'
			and timestamp > (strftime('%s','now','-30 days') * 1000)
			and isBot = 0
		`
		const pageViewsRes = (await db.all(pageViewsStatement)) as {
			total: number
		}[]
		const totalCount = pageViewsRes[0]?.total || 0
		return totalCount
	}

	const visitsStats = async () => {
		const visitsStatement = sql`
			select count(distinct sessionId) as total
			from analytics
			where eventType = 'pageview'
			and timestamp > (strftime('%s','now','-30 days') * 1000)
			and isBot = 0
		`
		const visitsRes = (await db.all(visitsStatement)) as {
			total: number
		}[]
		const totalCount = visitsRes[0]?.total || 0
		return totalCount
	}

	const visitorsStats = async () => {
		const visitorsStatement = sql`
			select count(distinct visitorId) as total
			from analytics
			where eventType = 'pageview'
			and timestamp > (strftime('%s','now','-30 days') * 1000)
			and isBot = 0
		`
		const visitorsRes = (await db.all(visitorsStatement)) as {
			total: number
		}[]
		const totalCount = visitorsRes[0]?.total || 0
		return totalCount
	}

	const visitDurationStats = async () => {
		const visitDurationStatement = sql`
			select avg(sessionDuration) as total from (
				select (max(timestamp) - min(timestamp)) as sessionDuration
				from analytics
				where eventType = 'pageview'
				and timestamp > (strftime('%s','now','-30 days') * 1000)
				and isBot = 0
				group by sessionId
			)
		`
		const visitDurationRes = (await db.all(visitDurationStatement)) as {
			total: number
		}[]
		const totalCount = visitDurationRes[0]?.total || 0
		return totalCount
	}

	const bounceRateStats = async () => {
		const bounceRateStatement = sql`
			select (
				select count(*) from (
					select sessionId
					from analytics
					where eventType = 'pageview'
					and timestamp > (strftime('%s','now','-30 days') * 1000)
					and isBot = 0
					group by sessionId
					having count(*) = 1
				)
			) * 100.0 /
			(select count(distinct sessionId) from analytics where eventType = 'pageview' and timestamp > (strftime('%s','now','-30 days') * 1000) and isBot = 0)
			as total
		`
		const bounceRateRes = (await db.all(bounceRateStatement)) as {
			total: number
		}[]
		const totalCount = bounceRateRes[0]?.total || 0
		return totalCount
	}

	const entryPagesStats = async () => {
		const entryPagesStatement = sql`
			select slug, count(*) as total from (
				select slug
				from analytics a
				where eventType = 'pageview'
				and timestamp > (strftime('%s','now','-30 days') * 1000)
				and isBot = 0
				and timestamp = (
					select min(timestamp)
					from analytics
					where sessionId = a.sessionId
					and eventType = 'pageview'
				)
			)
			group by slug
			order by total desc
		`
		const entryPagesRes = await db.all(entryPagesStatement)
		return entryPagesRes
	}

	const exitPagesStats = async () => {
		const exitPagesStatement = sql`
			select slug, count(*) as total from (
				select slug
				from analytics a
				where eventType = 'pageview'
				and timestamp > (strftime('%s','now','-30 days') * 1000)
				and isBot = 0
				and timestamp = (
					select max(timestamp)
					from analytics
					where sessionId = a.sessionId
					and eventType = 'pageview'
				)
			)
			group by slug
			order by total desc
		`
		const exitPagesRes = await db.all(exitPagesStatement)
		return exitPagesRes
	}

	const languageStats = async () => {
		const stmt = sql`
		  SELECT language, COUNT(*) AS total
		  FROM analytics
		  WHERE timestamp > (strftime('%s','now','-30 days') * 1000)
		  AND isBot = 0
		  GROUP BY language
		  ORDER BY total DESC
		`
		const res = await db.all(stmt)
		return res
	}

	const monthlyCountries = await countries()
	const monthlyCities = await cities()
	const monthlyReferrers = await referrers()
	const monthlySlugs = await slugs()
	const monthlyBrowsers = await browsers()
	const monthlyOperatingSystems = await operatingSystems()
	const monthlyDeviceTypes = await deviceTypes()
    const monthlyPageViewsStats = await pageViewsStats()
    const monthlyVisitsStats = await visitsStats()
    const monthlyVisitorsStats = await visitorsStats()
    const monthlyVisitDurationStats = await visitDurationStats()
    const monthlyBounceRateStats = await bounceRateStats()
    const monthlyEntryPagesStats = await entryPagesStats()
    const monthlyExitPagesStats = await exitPagesStats()
    const monthlyLanguageStats = await languageStats()
	return {
		monthlyPageViewsStats,
		monthlyVisitsStats,
		monthlyVisitorsStats,
		monthlyVisitDurationStats,
		monthlyBounceRateStats,
		monthlyEntryPagesStats,
		monthlyExitPagesStats,
		monthlyLanguageStats,
		monthlyCountries,
		monthlyCities,
		monthlyReferrers,
		monthlySlugs,
		monthlyBrowsers,
		monthlyOperatingSystems,
		monthlyDeviceTypes,
	}
}

const updateAnalytics = async (data: {
	visitorId: string;
	sessionId: string;
	eventType: string;
	eventName?: string;
	title: string;
	slug: string;
	referrer: string;
	countryCode: string;
	country: string;
	continent?: string;
	region?: string;
	regionCode?: string;
	city: string;
	latitude?: number;
	longitude?: number;
	timezone?: string;
	flag: string;
	browser?: string;
	browserVersion?: string;
	engine?: string;
	engineVersion?: string;
	deviceType?: string;
	deviceVendor?: string;
	deviceModel?: string;
	language?: string;
	os?: string;
	osVersion?: string;
	screenResolution?: string;
	userAgent?: string;
	statusCode: number;
}) => {
	const db = drizzle(connection());

	await db.insert(analyticsTable).values({
		visitorId: data.visitorId,
		sessionId: data.sessionId,
		eventType: data.eventType,
		eventName: data.eventName || '',
		title: data.title,
		slug: data.slug,
		referrer: data.referrer,
		flag: data.flag,
		countryCode: data.countryCode,
		country: data.country,
		continent: data.continent || 'Unknown',
		region: data.region || 'Unknown',
		regionCode: data.regionCode || 'Unknown',
		city: data.city,
		latitude: data.latitude ?? 0,
		longitude: data.longitude ?? 0,
		timezone: data.timezone || 'Unknown',
		browser: data.browser || 'Unknown',
		browserVersion: data.browserVersion || '',
		engine: data.engine || 'Unknown',
		engineVersion: data.engineVersion || '',
		deviceType: data.deviceType || 'Unknown',
		deviceVendor: data.deviceVendor || 'Unknown',
		deviceModel: data.deviceModel || 'Unknown',
		language: data.language || '',
		os: data.os || 'Unknown',
		osVersion: data.osVersion || '',
		screenResolution: data.screenResolution || '',
		userAgent: data.userAgent || 'Unknown',
		statusCode: data.statusCode,
		isBot: detectBot(data.userAgent ?? '', data.referrer) ? 1 : 0,
	});
};

const handleAnalytics = async (c: Context) => {
	try {
		const body = await c.req.json();
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
		} = body;

		const countryCode = c.req.header('cf-ipcountry') || 'Unknown';
		const country = getCountryName(countryCode);
		const continent = c.req.header('cf-ipcontinent') || 'Unknown';
		const cityRaw = c.req.header('cf-ipcity') || 'Unknown';
		const city = decodeCfHeader(cityRaw);
		const region = c.req.header('cf-region') || 'Unknown';
		const regionCode = c.req.header('cf-region-code') || 'Unknown';
		const latitude = parseFloat(c.req.header('cf-iplatitude') || '0');
		const longitude = parseFloat(c.req.header('cf-iplongitude') || '0');
		const timezone = c.req.header('cf-timezone') || 'Unknown';
		const flag = getFlagEmoji(countryCode);

		if (!visitorId || !sessionId || !eventType || !title || !slug || !referrer) {
			return new Response('Missing required body data', { status: 400 });
		}

		const data = {
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
		};

		await updateAnalytics(data);

		return new Response(
			JSON.stringify({ message: 'A Ok!' }),
			{ headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('Analytics error:', err);
		return new Response('Server Error', { status: 500 });
	}
};

export { getBlogViews, getBlogViewsBySlug, getAnalytics, updateAnalytics, handleAnalytics }