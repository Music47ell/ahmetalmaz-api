import { createClient } from '@libsql/client/web'
import { drizzle } from 'drizzle-orm/libsql'
import { sql, eq } from 'drizzle-orm'
import { integer, numeric, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { getFlagEmoji, decodeCfHeader, getCountryName } from '../utils/helpers'

const connection = () => {
	return createClient({
		url: process.env.DATABASE_URL || '',
		authToken: process.env.DATABASE_AUTH_TOKEN || '',
	})
}

export const db = drizzle(connection())

const analyticsTable = sqliteTable('analytics', {
  id: integer('id').primaryKey(),
  date: numeric('date').notNull(),

  title: text('title').notNull(),
  slug: text('slug').notNull(),
  referrer: text('referrer').notNull(),

  flag: text('flag').notNull(),
  countrycode: text('countrycode').notNull(),
  country: text('country').notNull(),
  city: text('city').notNull(),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  timezone: text('timezone').notNull(),
  continent: text('continent').notNull().default('Unknown'),
  region: text('region').notNull().default('Unknown'),
  regioncode: text('regioncode').notNull().default('Unknown'),

  os: text('os').notNull().default('Unknown'),
  osVersion: text('osVersion').notNull().default('Unknown'),

  browser: text('browser').notNull().default('Unknown'),
  browserVersion: text('browserVersion').notNull().default('Unknown'),

  deviceType: text('deviceType').notNull().default('Unknown'),
  deviceVendor: text('deviceVendor').notNull().default('Unknown'),
  deviceModel: text('deviceModel').notNull().default('Unknown'),

  userAgent: text('userAgent').notNull().default('Unknown'),
  screenResolution: text('screenResolution').notNull().default('Unknown'),

  statusCode: integer('statusCode').notNull().default(0),
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
		const topTenCountriesStatement = sql`select flag, country, count(country) as total from analytics group by flag, country order by total desc limit 10`
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
		const topTenCitiesStatement = sql`select flag, city, count(city) as total from analytics group by flag, city order by total desc limit 10`
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
		const topTenReferrersStatement = sql`select referrer, count(referrer) as total from analytics where referrer not like '%.ahmetalmaz.com%' and statusCode = 200 group by referrer order by count(referrer) desc limit 10`
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
		const topTenSlugsStatement = sql`select slug, title, count(slug) as total from analytics where title not like '%ahmetalmaz%' and statusCode = 200 group by slug order by total desc limit 10`
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
	const geoLocations = async () => {
		const topTenGeoLocationsStatement = sql`select country, latitude, longitude, count(latitude) as total from analytics where date > date('now', '-30 days') group by latitude, longitude order by total desc limit 10`
		const topTenGeoLocationsRes = await db.all(topTenGeoLocationsStatement)
		const topTenGeoLocations2 = (
			topTenGeoLocationsRes as {
				country: string | null
				latitude: string | null
				longitude: string | null
				total: number
			}[]
		).map((item) => ({
			country: item.country || 'Unknown',
			latitude: item.latitude || '0',
			longitude: item.longitude || '0',
			total: item.total,
		}))
		return topTenGeoLocations2
	}
	const dates = async () => {
		const topTenDatesStatement = sql`select date, count(date) as total from analytics where date > date('now', '-30 days') group by date order by total desc limit 10`
		const topTenDatesRes = await db.all(topTenDatesStatement)
		const topTenDates2 = (
			topTenDatesRes as { date: string | null; total: number }[]
		).map((item) => ({
			date: item.date || 'Unknown',
			total: item.total,
		}))
		return topTenDates2
	}
	const lastDayStats = async () => {
		const lastDayStatement = sql`select count(date) as total from analytics where date > date('now', '-1 days')`
		const lastDayRes = (await db.all(lastDayStatement)) as { total: number }[]

		const totalCount = lastDayRes[0]?.total || 0

		return totalCount
	}
	const lastWeekStats = async () => {
		const lastWeekStatement = sql`select count(date) as total from analytics where date > date('now', '-7 days')`
		const lastWeekRes = (await db.all(lastWeekStatement)) as { total: number }[]
		const totalCount = lastWeekRes[0]?.total || 0
		return totalCount
	}

	const lastMonthStats = async () => {
		const lastMonthStatement = sql`select count(date) as total from analytics where date > date('now', '-30 days')`
		const lastMonthRes = (await db.all(lastMonthStatement)) as {
			total: number
		}[]
		const totalCount = lastMonthRes[0]?.total || 0
		return totalCount
	}

	const lastYearStats = async () => {
		const lastYearStatement = sql`select count(date) as total from analytics where date > date('now', '-365 days')`
		const lastYearRes = (await db.all(lastYearStatement)) as { total: number }[]
		const totalCount = lastYearRes[0]?.total || 0
		return totalCount
	}
	const browsers = async () => {
		const topTenBrowsersStatement = sql`select browser, count(browser) as total from analytics group by browser order by total desc limit 10`
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
		const topTenOperatingSystemsStatement = sql`select os, count(os) as total from analytics group by os order by total desc limit 10`
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
			const topTenDevicesStatement = sql`select deviceType, count(deviceType) as total from analytics group by deviceType order by total desc limit 10`
			const topTenDevicesRes = await db.all(topTenDevicesStatement)
			const topTenDevices2 = (
				topTenDevicesRes as {
					deviceType: string | null
					total: number
				}[]
			).map((item) => ({
				device: item.deviceType || 'Unknown',
				total: item.total,
			}))
			return topTenDevices2
		}

	const deviceVendors = async () => {
			const topTenVendorsStatement = sql`select deviceVendor, count(deviceVendor) as total from analytics group by deviceVendor order by total desc limit 10`
			const topTenVendorsRes = await db.all(topTenVendorsStatement)
			const topTenVendors2 = (
				topTenVendorsRes as {
					deviceVendor: string | null
					total: number
				}[]
			).map((item) => ({
				device: item.deviceVendor || 'Unknown',
				total: item.total,
			}))
			return topTenVendors2
		}

	const deviceModels = async () => {
			const topTenModelsStatement = sql`select deviceModel, count(deviceModel) as total from analytics group by deviceModel order by total desc limit 10`
			const topTenModelsRes = await db.all(topTenModelsStatement)
			const topTenModels2 = (
				topTenModelsRes as {
					deviceModel: string | null
					total: number
				}[]
			).map((item) => ({
				device: item.deviceModel || 'Unknown',
				total: item.total,
			}))
			return topTenModels2
	    }


	const lastDay = await lastDayStats()
	const lastWeek = await lastWeekStats()
	const lastMonth = await lastMonthStats()
	const lastYear = await lastYearStats()
	const topTenCountries = await countries()
	const topTenCities = await cities()
	const topTenReferrers = await referrers()
	const topTenSlugs = await slugs()
	const topTenGeoLocations = await geoLocations()
	const topTenDates = await dates()
	const topTenBrowsers = await browsers()
	const topTenOperatingSystems = await operatingSystems()
	const topTenDeviceTypes = await deviceTypes()
    const topTenDeviceVendors = await deviceVendors() 
    const topTenDeviceModels = await deviceModels()
	return {
		lastDay,
		lastWeek,
		lastMonth,
		lastYear,
		topTenCountries,
		topTenCities,
		topTenReferrers,
		topTenSlugs,
		topTenGeoLocations,
		topTenDates,
		topTenBrowsers,
		topTenOperatingSystems,
		topTenDeviceTypes,
        topTenDeviceVendors,
        topTenDeviceModels,
	}
}

const updateAnalytics = async (data: {
  title: string;
  slug: string;
  referrer: string;
  countrycode: string;
  country: string;
  continent?: string;
  region?: string;
  regioncode?: string;
  city: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  flag: string;
  browser?: string;
  browserVersion?: string;
  deviceType?: string;
  language?: string;
  os?: string;
  osVersion?: string;
  platform?: string;
  screenResolution?: string;
  userAgent?: string;
  statusCode: number;
}) => {
  const db = drizzle(connection());
  const date = new Date().toISOString()

  await db.insert(analyticsTable).values({
    date,
    title: data.title,
    slug: data.slug,
    referrer: data.referrer,
    flag: data.flag,
    countrycode: data.countrycode,
    country: data.country,
    continent: data.continent || 'Unknown',
    region: data.region || 'Unknown',
    regioncode: data.regioncode || 'Unknown',
    city: data.city,
    latitude: data.latitude ?? 0,
    longitude: data.longitude ?? 0,
    timezone: data.timezone || 'Unknown',
    browser: data.browser || 'Unknown',
    browserVersion: data.browserVersion || '',
    deviceType: data.deviceType || '',
    language: data.language || '',
    os: data.os || 'Unknown',
    osVersion: data.osVersion || '',
    platform: data.platform || '',
    screenResolution: data.screenResolution || '',
    userAgent: data.userAgent || 'Unknown',
    statusCode: data.statusCode,
  });
};

const handleAnalytics = async (c: Context) => {
  try {
    const body = await c.req.json();
    const {
      title,
      slug,
      referrer,
      browser,
      browserVersion,
      deviceType,
      language,
      os,
      osVersion,
      platform,
      screenResolution,
      userAgent,
      statusCode,
    } = body;

    const countrycode = c.req.header('cf-ipcountry') || 'Unknown';
    const country = getCountryName(countrycode);
    const continent = c.req.header('cf-ipcontinent') || 'Unknown';
    const cityRaw = c.req.header('cf-ipcity') || 'Unknown';
    const city = decodeCfHeader(cityRaw);
    const region = c.req.header('cf-region') || 'Unknown';
    const regioncode = c.req.header('cf-region-code') || 'Unknown';
    const latitude = parseFloat(c.req.header('cf-iplatitude') || '0');
    const longitude = parseFloat(c.req.header('cf-iplongitude') || '0');
    const timezone = c.req.header('cf-timezone') || 'Unknown'

    if (!title || !slug || !referrer) {
      return new Response('Missing required body data', { status: 400 });
    }

    const data = {
      title,
      slug,
      referrer,
      browser: browser || 'Unknown',
      browserVersion: browserVersion || '',
      deviceType: deviceType || '',
      language: language || '',
      os: os || 'Unknown',
      osVersion: osVersion || '',
      platform: platform || '',
      screenResolution: screenResolution || '',
      userAgent: userAgent || 'Unknown',
      countrycode,
      country,
      continent,
      region,
      regioncode,
      city,
      latitude,
      longitude,
      timezone,
      flag: getFlagEmoji(countrycode),
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