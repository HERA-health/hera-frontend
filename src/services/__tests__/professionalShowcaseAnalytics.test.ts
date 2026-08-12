import * as analyticsService from '../analyticsService';
import {
  trackProfessionalShowcaseEvent,
  type ProfessionalShowcaseEvent,
} from '../professionalShowcaseAnalytics';

jest.mock('../analyticsService', () => ({ track: jest.fn() }));

const mockedTrack = jest.mocked(analyticsService.track);

describe('professionalShowcaseAnalytics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('forwards a valid showcase interaction without personal data', () => {
    expect(trackProfessionalShowcaseEvent({
      event: 'professional_showcase_step_viewed',
      properties: { step: 'agenda', position: 3 },
    })).toBe(true);

    expect(mockedTrack).toHaveBeenCalledWith(
      'professional_showcase_step_viewed',
      { step: 'agenda', position: 3 },
    );
  });

  it.each(['name', 'email', 'patientId', 'specialistId']) (
    'rejects identifying property %s',
    (forbiddenProperty) => {
      expect(trackProfessionalShowcaseEvent({
        event: 'professional_showcase_step_viewed',
        properties: {
          step: 'patients',
          position: 2,
          [forbiddenProperty]: 'sensitive-value',
        },
      } as unknown as ProfessionalShowcaseEvent)).toBe(false);
      expect(mockedTrack).not.toHaveBeenCalled();
    },
  );

  it('rejects unknown steps and positions outside the showcase', () => {
    expect(trackProfessionalShowcaseEvent({
      event: 'professional_showcase_step_viewed',
      properties: { step: 'clinical-notes', position: 7 },
    } as unknown as ProfessionalShowcaseEvent)).toBe(false);
    expect(mockedTrack).not.toHaveBeenCalled();
  });
});
