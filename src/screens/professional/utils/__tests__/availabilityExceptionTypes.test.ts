import { AVAILABILITY_ABSENCE_REASONS } from '../../../../services/availabilityContracts';
import { AVAILABILITY_EXCEPTION_TYPES } from '../availabilityExceptionTypes';

describe('availabilityExceptionTypes', () => {
  it('defines visual metadata for every official absence reason', () => {
    expect(AVAILABILITY_EXCEPTION_TYPES.map((type) => type.label)).toEqual(
      [...AVAILABILITY_ABSENCE_REASONS]
    );
  });
});
