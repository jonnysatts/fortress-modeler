// PDF Configuration for pdfmake
// Import as a namespace to avoid issues with the module structure
import * as pdfMakeModule from 'pdfmake/build/pdfmake';
import * as pdfFontsModule from 'pdfmake/build/vfs_fonts';

// Get the actual pdfMake instance
const pdfMake = pdfMakeModule.default || pdfMakeModule;

// Configure pdfMake with the virtual file system for fonts
// Handle different module structures
try {
  if (pdfFontsModule.pdfMake && pdfFontsModule.pdfMake.vfs) {
    pdfMake.vfs = pdfFontsModule.pdfMake.vfs;
    console.log('VFS loaded from pdfFontsModule.pdfMake.vfs');
  } else if (pdfFontsModule.default && pdfFontsModule.default.pdfMake && pdfFontsModule.default.pdfMake.vfs) {
    pdfMake.vfs = pdfFontsModule.default.pdfMake.vfs;
    console.log('VFS loaded from pdfFontsModule.default.pdfMake.vfs');
  } else {
    // Fallback to an empty VFS if none is available
    console.warn('No VFS found in pdfFontsModule, using fallback');
    pdfMake.vfs = pdfMake.vfs || {};

    // Set up default fonts
    pdfMake.fonts = {
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      }
    };
  }
} catch (error) {
  console.error('Error configuring pdfMake fonts:', error);
  // Ensure pdfMake has at least an empty VFS to prevent errors
  pdfMake.vfs = pdfMake.vfs || {};
}

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
