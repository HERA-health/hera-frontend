import React, { useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';

/** Keep reservation and location together; a tall column must remain fully scrollable. */
export function ProfileBookingAside({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { height } = useWindowDimensions();
  const [summaryHeight, setSummaryHeight] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setSummaryHeight(element.getBoundingClientRect().height));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <aside style={{ width: 360, flexShrink: 0, alignSelf: 'stretch' }}>
    <div ref={ref} style={{ position: summaryHeight < height - 116 ? 'sticky' : 'relative', top: summaryHeight < height - 116 ? 96 : 0 }}>
      {children}
    </div>
  </aside>;
}
