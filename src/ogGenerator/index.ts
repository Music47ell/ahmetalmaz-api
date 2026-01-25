import { createCanvas } from 'canvas';

export async function generateOg(title: string, description: string, pubdate: string, domain: string): Promise<Buffer> {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Gradient Background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#282A36');  // Dark background color
  gradient.addColorStop(1, '#44475A');  // Slightly lighter for depth
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Title Text Style (Bold and aligned left)
  ctx.fillStyle = '#F8F8F2'; // Foreground (Light Text)
  ctx.font = 'bold 72px "Helvetica Neue", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';  // Soft shadow
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;

  // Function to wrap text into lines
  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    const words = text.split(' ');
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth) {
        lines.push(currentLine);
        currentLine = word; // Start a new line
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) lines.push(currentLine); // Add the last line
    return lines;
  }

  // Adjust padding to be smaller (30px instead of 50px)
  const padding = 30; // Unified padding for both title and description
  const descriptionMarginBottom = 60; // Additional margin between description and horizontal line

  // Wrap title if it exceeds canvas width
  const titleLines = wrapText(title, width - padding * 2); // Reduced padding

  // Draw Title with shadow for effect (multiple lines) starting from the top
  titleLines.forEach((line, index) => {
    ctx.fillText(line, padding, padding + index * 80); // 80px line spacing for title
  });

  // Horizontal Light Line (Edge-to-edge)
  const horizontalLineY = height - 100;
  ctx.strokeStyle = '#F8F8F2';  // Light line color
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, horizontalLineY); // Starting point of the line (left edge)
  ctx.lineTo(width, horizontalLineY); // Ending point of the line (right edge)
  ctx.stroke();

  // Description Text Style (Lighter color below the title)
  ctx.font = '28px "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#6272A4'; // Soft Blue
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  // Wrap description if it exceeds canvas width
  const descriptionLines = wrapText(description, width - padding * 2); // Reduced padding

  // Draw Description (multiple lines) starting from just above the horizontal line with margin
  const descriptionStartY = horizontalLineY - descriptionMarginBottom; // Start with margin from the horizontal line
  descriptionLines.reverse().forEach((line, index) => {
    ctx.fillText(line, padding, descriptionStartY - index * 40); // 40px line spacing for description
  });

  // Publication Date Text Style (Yellow)
  ctx.font = '24px "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#F1FA8C'; // Yellow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Calculate the vertical position of the date
  const dateHeight = 24;  // Approximate height of the date text
  const dateY = (height - horizontalLineY - dateHeight) / 2 + horizontalLineY; // Vertically centered between line and bottom

  // Draw Publication Date (left aligned and centered between the line and bottom)
  const dateX = padding; // Left-aligned
  ctx.fillText(pubdate, dateX, dateY);

  // Domain Text Style (Black)
  ctx.font = '24px "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#FF5555'; // Red color for domain
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Static domain text (right-aligned, opposite side of the publication date)
  const domainX = width - padding - ctx.measureText(domain).width; // Right-aligned
  ctx.fillText(domain, domainX, dateY); // Same Y position as pubdate

  // Return the generated image as a Buffer
  return canvas.toBuffer('image/png');
}
