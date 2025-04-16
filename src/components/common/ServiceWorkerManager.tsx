import React, { useEffect } from 'react';

const ServiceWorkerManager: React.FC = () => {
  useEffect(() => {
    // Minimal implementation - does nothing
    console.log('ServiceWorkerManager mounted');
    return () => {
      console.log('ServiceWorkerManager unmounted');
    };
  }, []);

  return null; // This component doesn't render anything
};

export default ServiceWorkerManager;
