// Simple initial loader to show before React hydrates
export const showInitialLoader = () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;

  rootElement.innerHTML = `
    <div style="
      position: fixed;
      inset: 0;
      background: linear-gradient(135deg, #1A2942 0%, #3E5C89 50%, #10B981 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    ">
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rem;
      ">
        <!-- Logo -->
        <div style="
          width: 80px;
          height: 80px;
          border: 4px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          animation: pulse 2s infinite;
        ">
          <div style="
            width: 32px;
            height: 32px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
        </div>
        
        <!-- Title -->
        <div style="text-align: center;">
          <h1 style="
            font-size: 2.5rem;
            font-weight: bold;
            color: white;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          ">Fortress</h1>
          <p style="
            font-size: 1.25rem;
            color: rgba(255, 255, 255, 0.8);
            margin: 0.5rem 0 0 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          ">Financial Modeler</p>
        </div>
        
        <!-- Loading text -->
        <p style="
          color: rgba(255, 255, 255, 0.9);
          font-size: 1.125rem;
          margin: 0;
          animation: pulse 2s infinite;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        ">Initializing...</p>
      </div>
    </div>
    
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
    </style>
  `;
};

export const hideInitialLoader = () => {
  // This will be replaced by React anyway, but good practice
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = '';
  }
};