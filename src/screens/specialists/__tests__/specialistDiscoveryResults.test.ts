import type { Specialist } from '../../../constants/types';
import { combineSpecialistResults } from '../specialistDiscoveryResults';
const specialist = (id: string, overrides: Partial<Specialist> = {}): Specialist => ({
  id, name:id, initial:id, specialization:'Psicología', rating:5, reviewCount:10, description:'', tags:[], pricePerSession:60, verified:true,
  matchingProfile:{therapeuticApproach:[],specialties:[],sessionStyle:'',personality:[],ageGroups:[],experienceYears:0,language:['spanish'],availability:'',format:[]}, ...overrides,
});
test('directory filters cannot restore excluded professionals or a recommendation for a different option', () => {
  const available = [specialist('included', {pricePerSession:80}),specialist('unmatched')];
  const matched = [specialist('excluded',{matchOrder:0}),specialist('included',{matchOrder:1,matchedOptionId:'old',tags:['Trabaja ansiedad']})];
  const result = combineSpecialistResults(available,matched,true);
  expect(result.map(s=>s.id)).toEqual(['included','unmatched']);
  expect(result[0].tags).toEqual([]); expect(result[0].pricePerSession).toBe(80);
});
test('unfiltered directory keeps backend ordering and avoids duplicates', () => {
  expect(combineSpecialistResults([specialist('first'),specialist('third')],[specialist('second'),specialist('first')],false).map(s=>s.id)).toEqual(['second','first','third']);
});
