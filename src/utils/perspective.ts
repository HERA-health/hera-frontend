export interface PerspectiveDraft { religionCode: string; religionOtherText: string; publish: boolean; noticeVersion: string | null; hasDeclaration: boolean; needsReconfirmation: boolean }
export const emptyPerspective = (): PerspectiveDraft => ({religionCode: '', religionOtherText: '', publish: false, noticeVersion: null, hasDeclaration: false, needsReconfirmation: false});
