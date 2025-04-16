import React from "react";
import ErrorBoundary from "./ErrorBoundary";

// This wrapper allows for future global error handling features (logging, alerts, etc)
const GlobalErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <ErrorBoundary>{children}</ErrorBoundary>;
};

export default GlobalErrorBoundary;
