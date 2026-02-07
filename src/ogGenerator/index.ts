import { createCanvas } from 'canvas';

export async function generateOg(title: string, description: string, pubdate: string, domain: string): Promise<Buffer> {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#282A36');
  gradient.addColorStop(1, '#44475A');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#F8F8F2';
  ctx.font = 'bold 72px "Helvetica Neue", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;

  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    const words = text.split(' ');
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  const padding = 30;
  const descriptionMarginBottom = 60;

  const titleLines = wrapText(title, width - padding * 2);

  titleLines.forEach((line, index) => {
    ctx.fillText(line, padding, padding + index * 80);
  });

  const horizontalLineY = height - 100;
  ctx.strokeStyle = '#F8F8F2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, horizontalLineY);
  ctx.lineTo(width, horizontalLineY);
  ctx.stroke();

  ctx.font = '28px "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#6272A4';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  const descriptionLines = wrapText(description, width - padding * 2);

  const descriptionStartY = horizontalLineY - descriptionMarginBottom;
  descriptionLines.reverse().forEach((line, index) => {
    ctx.fillText(line, padding, descriptionStartY - index * 40);
  });

  ctx.font = '24px "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#F1FA8C';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  const dateHeight = 24;
  const dateY = (height - horizontalLineY - dateHeight) / 2 + horizontalLineY;

  const dateX = padding;
  ctx.fillText(pubdate, dateX, dateY);

  ctx.font = '24px "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#FF5555';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  const domainX = width - padding - ctx.measureText(domain).width;
  ctx.fillText(domain, domainX, dateY);

  return canvas.toBuffer('image/png');
}
