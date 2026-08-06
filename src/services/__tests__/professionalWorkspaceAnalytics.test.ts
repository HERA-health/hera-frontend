import * as analyticsService from '../analyticsService';
import {
  trackProfessionalWorkspaceEvent,
  type ProfessionalWorkspaceEvent,
} from '../professionalWorkspaceAnalytics';

jest.mock('../analyticsService', () => ({ track: jest.fn() }));

const mockedTrack = jest.mocked(analyticsService.track);

describe('professionalWorkspaceAnalytics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('forwards only a valid closed event contract', () => {
    expect(trackProfessionalWorkspaceEvent({
      event: 'professional_agenda_view_changed',
      properties: { view: 'month' },
    })).toBe(true);
    expect(mockedTrack).toHaveBeenCalledWith(
      'professional_agenda_view_changed',
      { view: 'month' },
    );
  });

  it.each(['query', 'name', 'patientId', 'sessionId', 'clientId'])(
    'rejects identifying property %s without capturing it',
    (forbiddenProperty) => {
      expect(trackProfessionalWorkspaceEvent({
        event: 'professional_quick_search_result_selected',
        properties: {
          category: 'patient',
          [forbiddenProperty]: 'sensitive-value',
        },
      } as unknown as ProfessionalWorkspaceEvent)).toBe(false);
      expect(mockedTrack).not.toHaveBeenCalled();
    },
  );

  it('rejects unknown events and enum values silently', () => {
    expect(trackProfessionalWorkspaceEvent({
      event: 'professional_unknown',
      properties: {},
    } as unknown as ProfessionalWorkspaceEvent)).toBe(false);
    expect(trackProfessionalWorkspaceEvent({
      event: 'professional_agenda_view_changed',
      properties: { view: 'year' },
    } as unknown as ProfessionalWorkspaceEvent)).toBe(false);
    expect(mockedTrack).not.toHaveBeenCalled();
  });
});
