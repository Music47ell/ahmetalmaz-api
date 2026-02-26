import { XMLParser } from "fast-xml-parser";
import { withCache } from "../utils/cache.js";

export const getGoodreadsStats = async () =>
  withCache("goodreads:stats", 3600, async () => {
  if (!process.env.GOODREADS_READ_FEED) {
    throw new Error("GOODREADS_FEED environment variable is not set");
  }

  const res = await fetch(process.env.GOODREADS_READ_FEED);
  if (!res.ok) throw new Error(`Failed to fetch RSS: ${res.status}`);
  const xml = await res.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  });
  const json = parser.parse(xml);

  const channel = json.rss?.channel;
  if (!channel) throw new Error("No channel found in feed");

  const rawItems = Array.isArray(channel.item) ? channel.item : [channel.item];

  const sortedItems = rawItems
    .filter((item) => item.user_read_at)
    .sort(
      (a, b) =>
        new Date(a.user_read_at).getTime() -
        new Date(b.user_read_at).getTime()
    );

  const totalBooks = sortedItems.length;

  const firstReadAt = sortedItems[0]?.user_read_at
    ? new Date(sortedItems[0].user_read_at)
    : null;

  const now = new Date();

  const accountAgeDays = firstReadAt
    ? Math.floor(
        (now.getTime() - firstReadAt.getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  const accountAgeYears = Math.floor(accountAgeDays / 365);

  let totalPages = 0;
  const authorsSet = new Set<string>();

  sortedItems.forEach((item) => {
    const pages = Number(item.book?.num_pages || 0);
    totalPages += pages;
    if (item.author_name) authorsSet.add(item.author_name);
  });

  const totalWords = totalPages * 250;
  const totalDaysReading = Math.ceil(totalPages / 50);

  return {
    accountAgeYears,
    totalBooks,
    totalPages,
    totalWords,
    totalDaysReading,
    uniqueAuthors: authorsSet.size,
  };
});
