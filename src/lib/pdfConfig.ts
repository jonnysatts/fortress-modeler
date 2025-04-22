// pdfConfig now uses the global pdfMake provided by the CDN
// No npm imports of pdfmake or vfs_fonts!

const pdfMake = (window as any).pdfMake;

if (!pdfMake) {
  console.error('[pdfMake] window.pdfMake is not available! Check CDN script in public/index.html');
} else {
  console.log('[pdfMake] window.pdfMake is available:', pdfMake);
}

// Optionally set up default fonts
pdfMake.fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

// Define default font styles
const defaultStyles = {
  header: {
    fontSize: 18,
    bold: true,
    color: '#1A2942', // Fortress Blue
    margin: [0, 0, 0, 10]
  },
  subheader: {
    fontSize: 14,
    bold: true,
    color: '#1A2942', // Fortress Blue
    margin: [0, 10, 0, 5]
  },
  tableHeader: {
    bold: true,
    fontSize: 12,
    color: '#1A2942' // Fortress Blue
  },
  positiveValue: {
    color: '#10B981' // Green
  },
  negativeValue: {
    color: '#EF4444' // Red
  }
};

// Default document definition
const defaultDocDefinition = {
  pageSize: 'A4',
  pageMargins: [40, 60, 40, 60],
  defaultStyle: {
    font: 'Roboto',
    fontSize: 10
  },
  styles: defaultStyles
};

export { pdfMake, defaultDocDefinition, defaultStyles };
export default pdfMake;
