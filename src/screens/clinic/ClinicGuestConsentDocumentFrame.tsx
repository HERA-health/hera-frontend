import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  html: string;
  borderColor: string;
  title?: string;
  fitContent?: boolean;
}

const MINIMUM_HEIGHT = 520;

export function ClinicGuestConsentDocumentFrame({
  html,
  borderColor,
  title = 'Documento completo de autorización',
  fitContent = false,
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
    if (fitContent) {
      setHeight(Math.max(MINIMUM_HEIGHT, Math.ceil(body.getBoundingClientRect().height) + 2));
      return;
    }
    setHeight(Math.max(
      MINIMUM_HEIGHT,
      documentElement.scrollHeight,
      body.scrollHeight
    ));
  }, [fitContent]);

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
    title,
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
