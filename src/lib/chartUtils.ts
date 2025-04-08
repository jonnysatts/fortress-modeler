/**
 * Utility functions for working with charts in PDFs
 */

/**
 * Converts an HTML element to a base64 image
 * @param element The HTML element to convert
 * @returns A Promise that resolves to a base64 string
 */
export async function elementToBase64(element: HTMLElement): Promise<string> {
  try {
    // Import html-to-image dynamically to reduce bundle size
    const htmlToImage = await import('html-to-image');

    // Convert the element to a data URL with higher quality settings
    const dataUrl = await htmlToImage.toPng(element, {
      quality: 1.0,
      pixelRatio: 2, // Higher pixel ratio for better quality
      backgroundColor: 'white',
      width: element.offsetWidth * 2, // Double the width for better resolution
      height: element.offsetHeight * 2 // Double the height for better resolution
    });

    return dataUrl;
  } catch (error) {
    console.error('Error converting element to base64:', error);
    return '';
  }
}

/**
 * Creates a simple chart image as base64
 * This is a fallback when actual chart elements are not available
 * @param data The data to visualize
 * @param options Chart options
 * @returns A base64 string of the chart image
 */
export async function createSimpleChartImage(
  data: { name: string; value: number }[],
  options: {
    title: string;
    width?: number;
    height?: number;
    colors?: string[];
  }
): Promise<string> {
  try {
    // Create a canvas element with higher resolution
    const canvas = document.createElement('canvas');
    const scaleFactor = 2; // For higher resolution
    canvas.width = (options.width || 600) * scaleFactor;
    canvas.height = (options.height || 300) * scaleFactor;

    // Get the 2D context
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Scale all drawing operations
    ctx.scale(scaleFactor, scaleFactor);

    // Fill background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width / scaleFactor, canvas.height / scaleFactor);

    // Add a subtle border
    ctx.strokeStyle = '#EEEEEE';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, (canvas.width / scaleFactor) - 20, (canvas.height / scaleFactor) - 20);

    // Draw title with better font
    ctx.fillStyle = '#1A2942';
    ctx.font = 'bold 18px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.title, (canvas.width / scaleFactor) / 2, 30);

    // Calculate bar width and spacing
    const barCount = data.length;
    const chartWidth = (canvas.width / scaleFactor) - 100;
    const barWidth = (chartWidth) / barCount - 10;
    const barSpacing = 10;
    const maxValue = Math.max(...data.map(item => item.value));
    const barHeightMultiplier = ((canvas.height / scaleFactor) - 100) / maxValue;

    // Default colors with gradient support
    const colors = options.colors || [
      '#1A2942', // Fortress Blue
      '#10B981', // Green
      '#FBBF24', // Yellow
      '#EF4444', // Red
      '#6366F1'  // Purple
    ];

    // Draw grid lines
    ctx.strokeStyle = '#EEEEEE';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = ((canvas.height / scaleFactor) - 50) - (i * ((canvas.height / scaleFactor) - 100) / gridLines);
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo((canvas.width / scaleFactor) - 50, y);
      ctx.stroke();

      // Draw value labels on y-axis
      const value = Math.round(maxValue * i / gridLines);
      ctx.fillStyle = '#666666';
      ctx.font = '10px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(value.toString(), 45, y + 3);
    }

    // Draw bars with gradients
    data.forEach((item, index) => {
      const x = 50 + index * (barWidth + barSpacing);
      const barHeight = Math.max(item.value * barHeightMultiplier, 2); // Minimum height of 2px
      const y = (canvas.height / scaleFactor) - 50 - barHeight;

      // Create gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      const color = colors[index % colors.length];
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, adjustColor(color, -20)); // Darker at bottom

      // Draw bar with gradient
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 3); // Rounded corners
      ctx.fill();

      // Add 3D effect with shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fill();
      ctx.shadowColor = 'transparent'; // Reset shadow

      // Draw value above bar
      ctx.fillStyle = '#1A2942';
      ctx.font = 'bold 12px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.value.toLocaleString(), x + barWidth / 2, y - 8);

      // Draw label below bar
      ctx.fillStyle = '#666666';
      ctx.font = '11px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.name, x + barWidth / 2, (canvas.height / scaleFactor) - 25);
    });

    // Convert canvas to base64 with high quality
    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Error creating simple chart image:', error);
    return '';
  }
}

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  // Remove # if present
  color = color.replace('#', '');

  // Parse the color
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Adjust each component
  const adjustR = Math.max(0, Math.min(255, r + amount));
  const adjustG = Math.max(0, Math.min(255, g + amount));
  const adjustB = Math.max(0, Math.min(255, b + amount));

  // Convert back to hex
  return `#${adjustR.toString(16).padStart(2, '0')}${adjustG.toString(16).padStart(2, '0')}${adjustB.toString(16).padStart(2, '0')}`;
}

/**
 * Creates a sample chart for demonstration purposes
 * @returns A base64 string of the chart image
 */
export async function createSampleChart(): Promise<string> {
  const data = [
    { name: 'Facebook', value: 2800 },
    { name: 'Google', value: 3500 },
    { name: 'Email', value: 2200 }
  ];

  return createSimpleChartImage(data, {
    title: 'Marketing Channel Performance',
    width: 600,
    height: 300
  });
}

/**
 * Creates a sample performance chart
 * @returns A base64 string of the chart image
 */
export async function createSamplePerformanceChart(): Promise<string> {
  const data = [
    { name: 'Week 1', value: 2200 },
    { name: 'Week 2', value: 2100 },
    { name: 'Week 3', value: 2300 },
    { name: 'Week 4', value: 1900 }
  ];

  return createSimpleChartImage(data, {
    title: 'Weekly Performance',
    width: 600,
    height: 300,
    colors: ['#10B981', '#FBBF24', '#10B981', '#EF4444']
  });
}
