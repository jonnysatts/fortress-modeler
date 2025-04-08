// Test PDF Export Function - Version 2
// Copy and paste this entire script into the browser console and press Enter

(function() {
  try {
    console.log("Testing PDF export...");
    
    // Function to load a script
    function loadScript(url) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    // Load pdfmake and fonts
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js')
      .then(() => loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js'))
      .then(() => {
        console.log("Scripts loaded, pdfMake available:", !!window.pdfMake);
        
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
        window.pdfMake.createPdf(docDefinition).download('test_pdf.pdf');
        console.log("PDF download triggered.");
      })
      .catch(error => {
        console.error("Error loading scripts:", error);
      });
    
  } catch (error) {
    console.error("Error in test script:", error);
  }
})();
