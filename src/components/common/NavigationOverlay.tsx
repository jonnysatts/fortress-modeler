/**
 * Navigation Overlay
 * 
 * This component creates a full-screen overlay during navigation to prevent flickering.
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const NavigationOverlay: React.FC = () => {
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);

  // Activate the overlay on any navigation change
  useEffect(() => {
    setIsActive(true);
    
    // Hide the overlay after a very short delay
    const timer = setTimeout(() => {
      setIsActive(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (!isActive) {
    return null;
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 9999,
        opacity: 1,
      }}
    />
  );
};

export default NavigationOverlay;
