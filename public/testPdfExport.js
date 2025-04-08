// Test PDF Export Function
// Copy and paste this entire script into the browser console and press Enter

(async function() {
  try {
    console.log("Testing PDF export...");
    
    // Import pdfmake directly
    const pdfMake = await import('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js');
    console.log("pdfMake loaded:", pdfMake);
    
    // Create a simple document definition
    const docDefinition = {
      content: [
        {
          text: 'Fortress Modeler Test PDF',
          fontSize: 20,
          bold: true,
          margin: [0, 0, 0, 20]
        },
        {
          text: `Generated: ${new Date().toLocaleString()}`,
          fontSize: 12,
          margin: [0, 0, 0, 20]
        },
        {
          text: 'This is a test PDF to verify that pdfmake is working correctly.',
          fontSize: 14
        }
      ]
    };
    
    // Generate and download PDF
    console.log("Creating PDF...");
    pdfMake.default.createPdf(docDefinition).download('test_pdf.pdf');
    console.log("PDF download triggered.");
    
  } catch (error) {
    console.error("Error testing PDF export:", error);
  }
})();
