import { memo, useState, useEffect, useCallback } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (props: { index: number; style: React.CSSProperties; data: T[] }) => JSX.Element;
  className?: string;
  overscan?: number;
}

function VirtualizedList<T>({ 
  items, 
  height, 
  itemHeight, 
  renderItem, 
  className,
  overscan = 5
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-muted-foreground">No items to display</p>
      </div>
    );
  }

  // Only use virtualization for large lists (>50 items)
  if (items.length <= 50) {
    return (
      <div className={className} style={{ height, overflow: 'auto' }}>
        {items.map((_, index) => (
          <div key={index} style={{ height: itemHeight }}>
            {renderItem({ index, style: { height: itemHeight }, data: items })}
          </div>
        ))}
      </div>
    );
  }

  const totalHeight = items.length * itemHeight;
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(height / itemHeight),
    items.length - 1
  );

  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length - 1, visibleEnd + overscan);

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          top: i * itemHeight,
          height: itemHeight,
          width: '100%'
        }}
      >
        {renderItem({ 
          index: i, 
          style: { height: itemHeight }, 
          data: items 
        })}
      </div>
    );
  }

  return (
    <div 
      className={className} 
      style={{ height, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}

export default memo(VirtualizedList);