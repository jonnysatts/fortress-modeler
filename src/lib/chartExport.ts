import { toPng } from 'html-to-image';

/**
 * Exports a chart as a high-resolution PNG image.
 * @param chartRef React ref to the chart container (div or svg parent)
 * @param fileName Optional file name for download (not required for PDF embedding)
 * @returns Promise<string> - PNG data URL
 */
export async function exportChartAsImage(chartRef: React.RefObject<HTMLElement>, fileName: string = 'chart.png') {
  if (!chartRef.current) throw new Error('Chart ref not set');
  const dataUrl = await toPng(chartRef.current, { cacheBust: true, pixelRatio: 3 });
  return dataUrl;
}
