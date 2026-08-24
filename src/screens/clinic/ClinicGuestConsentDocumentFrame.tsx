import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  html: string;
  borderColor: string;
}

const MINIMUM_HEIGHT = 520;

export function ClinicGuestConsentDocumentFrame({
  html,
  borderColor,
}: Props): React.ReactElement {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const observedDocumentRef = useRef<Document | null>(null);
  const [height, setHeight] = useState(MINIMUM_HEIGHT);

  const measure = useCallback(() => {
    const frame = frameRef.current;
    const documentElement = frame?.contentDocument?.documentElement;
    const body = frame?.contentDocument?.body;
    if (!documentElement || !body) return;
    setHeight(Math.max(
      MINIMUM_HEIGHT,
      documentElement.scrollHeight,
      body.scrollHeight
    ));
  }, []);

  const preventDocumentNavigation = useCallback((event: Event): void => {
    event.preventDefault();
  }, []);

  const handleLoad = useCallback(() => {
    observerRef.current?.disconnect();
    observedDocumentRef.current?.removeEventListener('click', preventDocumentNavigation);
    measure();
    const frameDocument = frameRef.current?.contentDocument ?? null;
    frameDocument?.addEventListener('click', preventDocumentNavigation);
    observedDocumentRef.current = frameDocument;
    const body = frameRef.current?.contentDocument?.body;
    if (body && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(body);
      observerRef.current = observer;
    }
  }, [measure, preventDocumentNavigation]);

  useEffect(() => () => {
    observerRef.current?.disconnect();
    observedDocumentRef.current?.removeEventListener('click', preventDocumentNavigation);
  }, [preventDocumentNavigation]);

  return React.createElement('iframe', {
    ref: frameRef,
    title: 'Documento completo de consentimiento',
    srcDoc: html,
    sandbox: 'allow-same-origin',
    referrerPolicy: 'no-referrer',
    onLoad: handleLoad,
    style: {
      width: '100%',
      height,
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      background: '#ffffff',
      display: 'block',
    },
  });
}

export default ClinicGuestConsentDocumentFrame;
