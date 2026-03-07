import { getWebDAVFileBuffer } from '../utils/webdav.js'

const WEBDAV_URL = process.env.WEBDAV_URL

export const getResume = async (): Promise<ArrayBuffer> => {
	if (!WEBDAV_URL) throw new Error('WEBDAV_URL not configured')
	const file = await getWebDAVFileBuffer(WEBDAV_URL, '/resume/ahmetalmaz-resume.pdf')
	if (!file) throw new Error('Failed to fetch resume')
	return file
}