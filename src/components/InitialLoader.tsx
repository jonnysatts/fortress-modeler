// Simple initial loader to show before React hydrates
export const showInitialLoader = () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;

  // Clear existing content safely
  rootElement.textContent = '';

  // Create loader container using DOM methods instead of innerHTML for security
  const loaderContainer = document.createElement('div');
  loaderContainer.style.cssText = `
    position: fixed;
    inset: 0;
    background: linear-gradient(135deg, #1A2942 0%, #3E5C89 50%, #10B981 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;

  const contentContainer = document.createElement('div');
  contentContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  `;

  // Logo container
  const logoContainer = document.createElement('div');
  logoContainer.style.cssText = `
    width: 80px;
    height: 80px;
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    animation: pulse 2s infinite;
  `;

  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 32px;
    height: 32px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  `;

  // Title container
  const titleContainer = document.createElement('div');
  titleContainer.style.textAlign = 'center';

  const title = document.createElement('h1');
  title.textContent = 'Fortress';
  title.style.cssText = `
    font-size: 2.5rem;
    font-weight: bold;
    color: white;
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Financial Modeler';
  subtitle.style.cssText = `
    font-size: 1.25rem;
    color: rgba(255, 255, 255, 0.8);
    margin: 0.5rem 0 0 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  // Loading text
  const loadingText = document.createElement('p');
  loadingText.textContent = 'Initializing...';
  loadingText.style.cssText = `
    color: rgba(255, 255, 255, 0.9);
    font-size: 1.125rem;
    margin: 0;
    animation: pulse 2s infinite;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `;

  // Assemble the DOM structure
  logoContainer.appendChild(spinner);
  titleContainer.appendChild(title);
  titleContainer.appendChild(subtitle);
  contentContainer.appendChild(logoContainer);
  contentContainer.appendChild(titleContainer);
  contentContainer.appendChild(loadingText);
  loaderContainer.appendChild(contentContainer);
  
  rootElement.appendChild(style);
  rootElement.appendChild(loaderContainer);
};

export const hideInitialLoader = () => {
  // This will be replaced by React anyway, but good practice
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.textContent = ''; // Use textContent instead of innerHTML for security
  }
};