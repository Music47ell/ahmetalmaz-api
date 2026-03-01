import { createCanvas } from 'canvas'

export async function generateOg(
	title: string,
	description: string,
	pubdate: string,
	domain: string,
): Promise<Buffer> {
	const width = 1200
	const height = 630
	const canvas = createCanvas(width, height)
	const ctx = canvas.getContext('2d')

	const colors = {
		turkyie: '#E30A17',
		nosferatu: '#282a36',
		aro: '#44475a',
		cullen: '#f8f8f2',
		dracula: '#bd93f9',
		marcelin: '#ff5555',
		lincoln: '#f1fa8c',
	}

	const gradient = ctx.createLinearGradient(0, 0, width, height)
	gradient.addColorStop(0, colors.nosferatu)
	gradient.addColorStop(1, colors.aro)
	ctx.fillStyle = gradient
	ctx.fillRect(0, 0, width, height)

	ctx.fillStyle = colors.cullen
	ctx.font = 'bold 72px "Helvetica Neue", sans-serif'
	ctx.textAlign = 'left'
	ctx.textBaseline = 'top'
	ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
	ctx.shadowBlur = 10
	ctx.shadowOffsetX = 5
	ctx.shadowOffsetY = 5

	function wrapText(text: string, maxWidth: number): string[] {
		const lines: string[] = []
		const words = text.split(' ')
		let currentLine = ''

		words.forEach((word) => {
			const testLine = currentLine ? currentLine + ' ' + word : word
			if (ctx.measureText(testLine).width > maxWidth) {
				lines.push(currentLine)
				currentLine = word
			} else {
				currentLine = testLine
			}
		})

		if (currentLine) lines.push(currentLine)
		return lines
	}

	function drawColoredWord(
		ctx: CanvasRenderingContext2D,
		text: string,
		word: string,
		x: number,
		y: number,
		normalColor: string,
		highlightColor: string,
	) {
		const parts = text.split(new RegExp(`(${word})`, 'gi'))

		let currentX = x
		parts.forEach((part) => {
			ctx.fillStyle =
				part.toLowerCase() === word.toLowerCase() ? highlightColor : normalColor
			ctx.fillText(part, currentX, y)
			currentX += ctx.measureText(part).width
		})
	}

	const borderWidth = 2

	ctx.strokeStyle = colors.dracula
	ctx.lineWidth = borderWidth
	ctx.strokeRect(
		borderWidth / 2,
		borderWidth / 2,
		width - borderWidth,
		height - borderWidth,
	)

	const padding = 30
	const descriptionMarginBottom = 60

	const titleLines = wrapText(title, width - padding * 2)
	titleLines.forEach((line, index) => {
		ctx.fillText(line, padding, padding + index * 80)
	})

	const horizontalLineY = height - 100
	ctx.strokeStyle = colors.dracula
	ctx.lineWidth = 2
	ctx.beginPath()
	ctx.moveTo(0, horizontalLineY)
	ctx.lineTo(width, horizontalLineY)
	ctx.stroke()

	ctx.font = '28px "Helvetica Neue", sans-serif'
	ctx.fillStyle = colors.cullen
	ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
	ctx.shadowBlur = 5
	ctx.shadowOffsetX = 3
	ctx.shadowOffsetY = 3

	const descriptionLines = wrapText(description, width - padding * 2)
	const descriptionStartY = horizontalLineY - descriptionMarginBottom
	descriptionLines.reverse().forEach((line, index) => {
		const lineY = descriptionStartY - index * 40
		drawColoredWord(
			ctx,
			line,
			'Türkiye',
			padding,
			lineY,
			colors.cullen,
			colors.turkyie,
		)
	})

	ctx.font = '24px "Helvetica Neue", sans-serif'
	ctx.fillStyle = colors.lincoln
	ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
	ctx.shadowBlur = 5
	ctx.shadowOffsetX = 2
	ctx.shadowOffsetY = 2

	const dateHeight = 24
	const dateY = (height - horizontalLineY - dateHeight) / 2 + horizontalLineY
	ctx.fillText(pubdate, padding, dateY)

	ctx.font = '24px "Helvetica Neue", sans-serif'
	ctx.fillStyle = colors.marcelin
	ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
	ctx.shadowBlur = 5
	ctx.shadowOffsetX = 2
	ctx.shadowOffsetY = 2

	const domainX = width - padding - ctx.measureText(domain).width
	ctx.fillText(domain, domainX, dateY)

	return canvas.toBuffer('image/png')
}
