import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { psychologyPages } from '../../seo/publicContent';
import { psychologyBodyHtml } from '../../seo/publicHtml';
import { psychologyPageCss, psychologyThemeStyle } from '../../seo/psychologyPresentation';
import { usePublicDirectory } from '../specialists/usePublicDirectory';
import { useWebPageMetadata } from '../../hooks/useWebPageMetadata';
import { usePublicHtmlReady } from '../../seo/usePublicHtmlReady';
import { LandingHeader } from '../landing/components/LandingHeader';
import { FooterSection } from '../landing/components/FooterSection';
import type { LandingSectionAnchor } from '../landing/types';

export function PsychologyPageScreen() {
  const route = useRoute<AppRouteProp<'PsychologyTopic' | 'PsychologyOnline'>>();
  const navigation = useNavigation<AppNavigationProp>();
  const { theme } = useTheme();
  const { isAuthenticated, user, verificationSubmitted } = useAuth();
  const bodyRef = useRef<HTMLDivElement>(null);
  const topic = route.name === 'PsychologyOnline' ? 'online' : route.params?.topic;
  const page = psychologyPages[topic === 'ansiedad' || topic === 'autoestima' || topic === 'barcelona' || topic === 'cataluna' ? topic : 'online'];
  const { data, loading, error, retry } = usePublicDirectory(page.filters);
  const html = useMemo(() => psychologyBodyHtml(page, data ?? undefined, loading), [page, data, loading]);
  // Keep the DOM (open FAQs, scroll position and carousel controls) across theme
  // or context updates when the actual public content has not changed.
  const markup = useMemo(() => ({ __html: html }), [html]);
  const canVisitLanding = navigation.getState().routeNames.includes('Landing');
  useWebPageMetadata({ title: page.title, description: page.description, canonicalPath: page.path });
  usePublicHtmlReady(!loading);

  // Enhance the same readable HTML served initially. Without JS, the carousel
  // still scrolls and every profile, FAQ and navigation link remains usable.
  useEffect(() => {
    const body = bodyRef.current;
    const carousel = body?.querySelector<HTMLElement>('.psychology-carousel');
    if (!body || !carousel) return;
    const buttons = Array.from(body.querySelectorAll<HTMLButtonElement>('[data-carousel-step]'));
    const update = () => {
      const max = carousel.scrollWidth - carousel.clientWidth;
      buttons.forEach(button => {
        button.hidden = max < 2;
        button.disabled = Number(button.dataset.carouselStep) < 0 ? carousel.scrollLeft < 2 : carousel.scrollLeft >= max - 2;
      });
    };
    const move = (event: Event) => {
      if (!(event.currentTarget instanceof HTMLButtonElement)) return;
      const card = carousel.querySelector<HTMLElement>('.psychology-card');
      const step = (card?.getBoundingClientRect().width ?? 232) + parseFloat(getComputedStyle(carousel).columnGap);
      carousel.scrollBy({ left: Number(event.currentTarget.dataset.carouselStep) * step, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    buttons.forEach(button => button.addEventListener('click', move));
    const hideFailedPhoto = (event: Event) => {
      if (event.target instanceof HTMLImageElement) event.target.hidden = true;
    };
    carousel.addEventListener('error', hideFailedPhoto, true);
    carousel.querySelectorAll('img').forEach(photo => {
      if (photo.complete && photo.naturalWidth === 0) photo.hidden = true;
    });
    carousel.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(carousel);
    update();
    return () => {
      buttons.forEach(button => button.removeEventListener('click', move));
      carousel.removeEventListener('error', hideFailedPhoto, true);
      carousel.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [html]);

  const handleAccess = () => {
    if (!isAuthenticated || !user) { navigation.navigate('Welcome'); return; }
    const workspace = user.type === 'professional'
      ? (verificationSubmitted === false ? 'ProfessionalVerification' : 'ProfessionalHome')
      : user.type === 'clinic' ? 'ClinicDashboard' : 'Home';
    navigation.navigate(navigation.getState().routeNames.includes('RequiredLegalAcceptance') ? 'RequiredLegalAcceptance' : workspace);
  };
  const handleSection = (section: LandingSectionAnchor) => navigation.navigate('Landing', { section });

  return <View style={{ flex: 1, backgroundColor: theme.landingCanvas }}>
    <LandingHeader context="psychology" isScrolled
      accessLabel={isAuthenticated ? 'Mi espacio' : 'Acceder'} onAccess={handleAccess}
      onLogoPress={canVisitLanding ? () => navigation.navigate('Landing') : handleAccess}
      onFindSpecialist={() => navigation.navigate('PublicSpecialists')}
      onExploreProfessionals={canVisitLanding ? () => handleSection('forSpecialists') : () => navigation.navigate('PublicSpecialists')}
      onScrollToSection={canVisitLanding ? handleSection : undefined}
      onViewPlans={() => navigation.navigate('Pricing')} />
    <div className="psychology-page" style={{ ...psychologyThemeStyle(theme), flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <style>{psychologyPageCss}</style>
      <div ref={bodyRef} dangerouslySetInnerHTML={markup} onClick={event => {
        if (event.target instanceof Element && event.target.closest('[data-retry]')) void retry();
      }} />
      {error && data ? <div role="status" style={{ padding: '0 32px 24px', textAlign: 'center' }}>
        No hemos podido actualizar los perfiles. <button type="button" onClick={retry}>Volver a intentar</button>
      </div> : null}
      <FooterSection onFindSpecialist={() => navigation.navigate('PublicSpecialists')}
        professionalActionLabel={canVisitLanding ? 'Conocer las herramientas' : 'Mi espacio'}
        onProfessionalAction={canVisitLanding ? () => navigation.navigate('ProfessionalShowcase') : handleAccess}
        onProfessionalLogin={handleAccess} onScrollToSection={canVisitLanding ? handleSection : undefined}
        onViewPlans={() => navigation.navigate('Pricing')} />
    </div>
  </View>;
}
