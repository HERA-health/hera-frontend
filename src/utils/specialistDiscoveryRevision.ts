// In-memory revision: published changes invalidate reads without retaining sensitive values.
let revision = 0;
export const getSpecialistDiscoveryRevision = () => revision;
export const invalidateSpecialistDiscovery = () => { revision++; };
