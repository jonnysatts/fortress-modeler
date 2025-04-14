/**
 * Route Transition Component
 * 
 * This component provides a smooth transition between routes and prevents flickering.
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteTransitionProps {
  children: React.ReactNode;
}

const RouteTransition: React.FC<RouteTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('fadeOut');
      
      // After the fade out, update the location and fade in
      const timeout = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('fadeIn');
      }, 100); // Very short duration
      
      return () => clearTimeout(timeout);
    }
  }, [location, displayLocation]);

  return (
    <div
      className={`route-transition ${transitionStage}`}
      style={{
        transition: 'opacity 100ms ease-in-out',
        opacity: transitionStage === 'fadeIn' ? 1 : 0,
      }}
    >
      {children}
    </div>
  );
};

export default RouteTransition;
