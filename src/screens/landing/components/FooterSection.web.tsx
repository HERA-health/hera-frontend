import React, { useContext, useMemo } from 'react';
import { Asset } from 'expo-asset';
import { useNavigation } from '@react-navigation/native';
import { PrivacyControlsContext } from '../../../components/common/PrivacyPreferences';
import { isLandingSectionAnchor } from '../../../constants/landingNavigation';
import { professionalHeaderLinks } from '../../../constants/professionalNavigation';
import type { AppNavigationProp } from '../../../constants/types';
import { publicFooterCss, publicFooterHtml } from '../../../seo/publicFooter';
import type { FooterSectionProps } from '../types';

const brand = { '--hera-public-logo': `url("${Asset.fromModule(require('../../../../assets/main-logo.webp')).uri}")` } satisfies Record<string, string>;

export function FooterSection(props: FooterSectionProps) {
  const navigation = useNavigation<AppNavigationProp>();
  const openPrivacy = useContext(PrivacyControlsContext);
  const showSections = Boolean(props.onScrollToSection);
  const markup = useMemo(() => ({ __html: publicFooterHtml({
    professionalLabel: props.professionalActionLabel,
    professionalHref: props.professionalActionHref,
    accessHref: props.professionalLoginHref,
    showSections, privacyControl: Boolean(openPrivacy),
  }) }), [props.professionalActionLabel, props.professionalActionHref, props.professionalLoginHref, showSections, openPrivacy]);

  function activate(event: React.MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
        !(event.target instanceof Element)) return;
    const item = event.target.closest<HTMLElement>('a,button');
    if (!item) return;
    const { action, section } = item.dataset;
    const href = item.getAttribute('href');
    const destination = professionalHeaderLinks.find(link => link.href === href);
    const handlers: Record<string, (() => void) | null | undefined> = {
      directory: props.onFindSpecialist, professional: props.onProfessionalAction,
      access: props.onProfessionalLogin, privacy: openPrivacy, plans: props.onViewPlans,
    };
    const callback = action && handlers[action];
    if (callback) { event.preventDefault(); callback(); }
    else if (isLandingSectionAnchor(section) && props.onScrollToSection) {
      event.preventDefault();
      props.onScrollToSection(section);
    } else if (destination && navigation.getState().routeNames.includes(destination.route)) {
      event.preventDefault();
      navigation.navigate(destination.route);
    } else if (href === '/' && navigation.getState().routeNames.includes('Landing')) {
      event.preventDefault();
      navigation.navigate('Landing');
      document.getElementById('landing-scroll-view')?.scrollTo(0, 0);
    }
  }
  return <div style={brand as React.CSSProperties} onClick={activate}>
    <style>{publicFooterCss}</style>
    <div dangerouslySetInnerHTML={markup} />
  </div>;
}
