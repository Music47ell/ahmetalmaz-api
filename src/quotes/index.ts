import { readFileSync } from "node:fs";

interface Quote {
	quote: string;
	source: string;
	link: string;
	date: string;
}

export const getRandomQuote = (): Quote => {
	const filePath = process.env.QUOTES_FILE_PATH;
	const quotes: Quote[] = JSON.parse(readFileSync(filePath, "utf-8"));
	return quotes[Math.floor(Math.random() * quotes.length)];
};
