import React from 'react';
export function ResourcePdf({ url, title }: { url: string; title: string }) {
  return <iframe title={title} src={url} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', minHeight: 320, border: 0 }} />;
}
