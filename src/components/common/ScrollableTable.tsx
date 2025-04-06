import React from 'react';

interface ScrollableTableProps {
  children: React.ReactNode;
  minWidth?: string;
  className?: string;
}

const ScrollableTable: React.FC<ScrollableTableProps> = ({
  children,
  minWidth = '800px',
  className = '',
}) => {
  return (
    <div style={{ overflowX: 'auto', width: '100%', display: 'block' }}>
      <div style={{ minWidth: minWidth }}>
        {children}
      </div>
    </div>
  );
};

export default ScrollableTable;
