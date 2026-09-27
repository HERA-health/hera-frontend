export interface ProfileOption { value: string; label: string; aliases: string[]; parent?: string }
export const optionSearchKey = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const optionLabel = (options: ProfileOption[], value: string): string => {
  const key = optionSearchKey(value);
  return options.find(option => [option.value, option.label, ...option.aliases].some(alias => optionSearchKey(alias) === key))?.label ?? value;
};
