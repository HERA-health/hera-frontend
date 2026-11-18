import type { LandingSectionAnchor } from '../../constants/landingNavigation';
export {
  LANDING_SECTION_ANCHORS,
  LANDING_SECTION_NATIVE_IDS,
  isLandingSectionAnchor,
} from '../../constants/landingNavigation';
export type { LandingSectionAnchor } from '../../constants/landingNavigation';

export const LANDING_SCROLL_CONTENT_TOP_PADDING = 70;

export interface FooterSectionProps {
  professionalActionHref?: string;
  professionalLoginHref?: string;
  onFindSpecialist: () => void;
  professionalActionLabel: string;
  onProfessionalAction: () => void;
  onProfessionalLogin: () => void;
  onClinicAccess?: () => void;
  onScrollToSection?: (section: LandingSectionAnchor) => void;
  onViewPlans?: () => void;
}
