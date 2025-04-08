// A simpler approach to pdfmake that uses CDN fonts
import pdfMake from 'pdfmake/build/pdfmake';

// Define default styles
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
    fontSize: 10
  },
  styles: defaultStyles
};

// Function to create a PDF
const createPdf = (docDefinition: any) => {
  // Merge with default document definition
  const mergedDocDefinition = {
    ...defaultDocDefinition,
    ...docDefinition,
    styles: {
      ...defaultDocDefinition.styles,
      ...(docDefinition.styles || {})
    }
  };
  
  return pdfMake.createPdf(mergedDocDefinition);
};

export { createPdf, defaultDocDefinition, defaultStyles };
