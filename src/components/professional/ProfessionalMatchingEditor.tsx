import { ProfileEditorSection } from './ProfileEditorSection';
import { ProfileEditorSheet } from './ProfileEditorSheet';
import { Button } from '../common/Button';
import { SearchableProfileSelect } from '../common/SearchableProfileSelect';
import {choiceKeyboardProps} from '../../utils/choiceKeyboard';
import {useDiscoveryRevalidation} from '../../hooks/useDiscoveryRevalidation';
import React, {useState, useEffect, useCallback} from 'react';
import {Pressable, Text, TextInput, View} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {useTheme} from '../../contexts/ThemeContext';
import {useProfileOptions} from '../../hooks/useProfileOptions';
import {PROFESSIONAL_SPECIALTY_OPTIONS, PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS, customChoiceError, customChoiceGroupErrors, type ProfessionalMatchingOption} from '../../constants/professionalMatchingOptions';
import type {PerspectiveDraft} from '../../services/profileDiscoveryService';
import {ProfileDiscoveryEditor} from './ProfileDiscoveryEditor';

interface Props {
  declaredGender?: 'woman' | 'man' | 'nonbinary' | null;
  onGenderChange?: (value: 'woman' | 'man' | 'nonbinary' | null) => void;
  wide?: boolean;
  highlighted?: boolean;
  notice?: React.ReactNode;
  languageNotice?: React.ReactNode;
  languageRef?: React.Ref<View>;
  languageHighlighted?: boolean;
  reviewAction?: React.ReactNode;
  specialties: string[]; approaches: string[]; customSpecialties: string[]; customApproaches: string[];
  languages: string[]; matchingNeedsReview: boolean; busy?: boolean;
  perspective: PerspectiveDraft; onPerspectiveChange: (value: PerspectiveDraft) => void;
  onToggle: (field: 'specialties' | 'therapeuticApproaches', value: string) => void;
  onCustomSpecialtiesChange: (values: string[]) => void; onCustomApproachesChange: (values: string[]) => void;
  onLanguagesChange: (values: string[]) => void;
}
function ChoiceGroup({title, description, options, selected, custom, onToggle, onCustomChange, max, required, busy}: {
  title: string; description: string; options: readonly ProfessionalMatchingOption[]; selected: string[]; custom: string[];
  onToggle: (value: string) => void; onCustomChange: (values: string[]) => void; max?: number; required?: boolean; busy?: boolean;
}) {
  const {theme} = useTheme();
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const count = selected.length + custom.length;
  const atLimit = max !== undefined && count >= max;
  const selectionError = customChoiceGroupErrors(custom, options)[0];
  const text = {fontFamily: theme.fontSans, color: theme.textPrimary, fontSize: 14, lineHeight: 20};
  const add = () => {
    const message = customChoiceError(draft, custom, options);
    if (message) {setError(message); return;}
    if (atLimit) return;
    onCustomChange([...custom, draft.trim()]); setDraft(''); setError(''); setAdding(false);
  };
  const labels = [...selected.map(value => options.find(option => option.value === value)?.label ?? value), ...custom];
  return <View style={{gap: 5, flex: 1, minWidth: 0}}>
    <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6}}>
      <Text style={[text, {fontFamily: theme.fontSansSemiBold}]}>{title}</Text>
      <Text accessibilityLiveRegion="polite" style={[text, {color: theme.textSecondary, fontSize: 12}]}>{required ? count + (count === 1 ? ' seleccionada' : ' seleccionadas') : count + (count === 1 ? ' seleccionado' : ' seleccionados')}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={'Editar ' + title.toLowerCase()} accessibilityHint={description}
      disabled={busy} onPress={() => setEditing(true)}
      style={{minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderWidth: 1, borderColor: theme.borderStrong, borderRadius: 8}}>
      <View style={{flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 5}}>
        {labels.length ? labels.map(label => <Text key={label} style={[text, {backgroundColor: theme.navigationActive, borderRadius: 5, paddingHorizontal: 6}]}>{label}</Text>) :
          <Text style={[text, {color: theme.textSecondary}]}>Seleccionar</Text>}
      </View>
      <Ionicons name="chevron-down" color={theme.textPrimary} size={16} />
    </Pressable>
    {editing && <ProfileEditorSheet title={title} onClose={() => { setEditing(false); setSearch(''); }}>
      <Text style={text}>La selección se aplicará cuando guardes el perfil.</Text>
      <TextInput accessibilityLabel={'Buscar en ' + title.toLowerCase()} value={search} onChangeText={setSearch} placeholder="Buscar opciones"
        placeholderTextColor={theme.textSecondary} style={[text, { minHeight: 44, padding: 10, borderWidth: 1, borderRadius: 8, borderColor: theme.borderStrong }]} />
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
      {options.filter(option => (option.label + " " + option.value).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).map(option => {
        const checked = selected.includes(option.value);
        const disabled = Boolean(busy || (!checked && atLimit));
        return <Pressable key={option.value} {...choiceKeyboardProps(() => onToggle(option.value), disabled)} accessibilityRole="checkbox" aria-checked={checked} aria-disabled={disabled} accessibilityLabel={option.label} accessibilityState={{checked, disabled}} disabled={disabled} onPress={() => onToggle(option.value)} style={{maxWidth: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: checked ? theme.primary : theme.borderLight, backgroundColor: checked ? theme.primaryAlpha12 : theme.bgCard, opacity: disabled ? 0.48 : 1}}>
          <Text style={[text, {flexShrink: 1, fontFamily: checked ? theme.fontSansSemiBold : theme.fontSans}]}>{option.label}</Text>
          {checked ? <Ionicons name="checkmark" color={theme.primary} size={15} /> : null}
        </Pressable>;
      })}
      {custom.map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={'Quitar ' + value} disabled={busy} onPress={() => onCustomChange(custom.filter(item => item !== value))} style={{maxWidth: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.primaryAlpha12, borderWidth: 1, borderColor: theme.primary}}>
        <Text style={[text, {flexShrink: 1}]}>{value}</Text><Ionicons name="close" size={16} color={theme.primary} />
      </Pressable>)}
      <Pressable disabled={busy || atLimit} accessibilityRole="button" accessibilityState={{disabled: busy || atLimit, expanded: adding}} onPress={() => setAdding(!adding)} style={{minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, opacity: atLimit ? 0.45 : 1}}>
        <Text style={[text, {color: theme.primary}]}>{required ? '+ Añadir otra' : '+ Añadir otro'}</Text>
      </Pressable>
    </View>
    {adding ? <View style={{gap: 6}}>
      <View style={{flexDirection: 'row', gap: 8}}>
        <TextInput autoFocus editable={!busy && !atLimit} accessibilityLabel={required ? 'Otra especialidad' : 'Otro enfoque'} maxLength={40} value={draft} onChangeText={value => {setDraft(value); setError('');}} onSubmitEditing={add} placeholder={required ? 'Escribe tu especialidad' : 'Escribe tu enfoque'} placeholderTextColor={theme.textMuted} style={[text, {flex: 1, minWidth: 0, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12}]} />
        <Pressable disabled={busy || atLimit} accessibilityRole="button" onPress={add} style={{justifyContent: 'center', paddingHorizontal: 16, minHeight: 44, borderRadius: 10, backgroundColor: theme.primary}}><Text style={[text, {color: theme.actionPrimaryText}]}>Añadir</Text></Pressable>
      </View>
      <Text accessibilityLiveRegion="polite" style={[text, {fontSize: 12, color: theme.textSecondary}]}>{error || draft.length + '/40 caracteres'}</Text>
    </View> : null}
    {selectionError ? <Text accessibilityLiveRegion="polite" style={[text, {color: theme.textSecondary, fontSize: 12}]}>Revisa las opciones propias: {selectionError}</Text> : null}
    {required && count === 0 ? <Text style={[text, {color: theme.textSecondary, fontSize: 12}]}>Selecciona al menos una especialidad para guardar.</Text> : null}
    {atLimit ? <Text accessibilityLiveRegion="polite" style={[text, {color: theme.textSecondary, fontSize: 12}]}>Has alcanzado el límite de {max} enfoques.</Text> : null}
      <Button size="small" style={{ alignSelf: 'flex-start' }} onPress={() => { setEditing(false); setSearch(''); }}>Listo</Button>
    </ProfileEditorSheet>}
  </View>;
}
export function ProfessionalMatchingEditor(props: Props) {
  const {theme} = useTheme();
  const {options, error, retry} = useProfileOptions();

  useDiscoveryRevalidation(useCallback(() => retry(), [retry]));
  useEffect(() => {
    if (props.perspective.publish && props.perspective.noticeVersion && options && props.perspective.noticeVersion !== options.religionNoticeVersion) {
      props.onPerspectiveChange({...props.perspective, publish: false, noticeVersion: null});
    }
  }, [options?.religionNoticeVersion, props.perspective, props.onPerspectiveChange]);
  return <View testID="professional-practice-editor" style={{gap: 12}}>
    <ProfileEditorSection wide={Boolean(props.wide)} icon="layers-outline" title="Especialidades y enfoques"
      description="Las áreas que atiendes y los enfoques que utilizas." notice={props.notice} highlighted={props.highlighted}>
      {props.matchingNeedsReview ? <Text style={{color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 21}}>Hemos actualizado las opciones. Revisa tus especialidades y enfoques; hemos conservado como propias las selecciones sin equivalente.</Text> : null}
      <View style={{flexDirection: props.wide ? 'row' : 'column', gap: 14}}>
      <ChoiceGroup title="Especialidades" description="Elige las áreas en las que trabajas." options={PROFESSIONAL_SPECIALTY_OPTIONS} selected={props.specialties} custom={props.customSpecialties} onCustomChange={props.onCustomSpecialtiesChange} required busy={props.busy} onToggle={value => props.onToggle('specialties', value)} />
      <ChoiceGroup title="Enfoques terapéuticos" description="Selecciona los enfoques con los que trabajas." options={PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS} selected={props.approaches} custom={props.customApproaches} onCustomChange={props.onCustomApproachesChange} max={30} busy={props.busy} onToggle={value => props.onToggle('therapeuticApproaches', value)} />
      </View>
      {props.reviewAction}
    </ProfileEditorSection>
    <ProfileEditorSection wide={Boolean(props.wide)} icon="options-outline" title="Información complementaria" highlighted={props.languageHighlighted}
      description="Idiomas de las sesiones y datos opcionales de tu práctica.">
      {props.onGenderChange ? <View style={{gap: 12}}>
        <Text style={{fontFamily: theme.fontSans, color: theme.textSecondary}}>Si indicas tu género, podremos tenerlo en cuenta cuando un paciente exprese una preferencia. Puedes quitarlo y guardar el cambio cuando quieras.</Text>
        <SearchableProfileSelect label="Género declarado" optional values={props.declaredGender ? [props.declaredGender] : []} options={[
          {value:'woman',label:'Mujer',aliases:[]}, {value:'man',label:'Hombre',aliases:[]}, {value:'nonbinary',label:'No binario',aliases:[]},
        ]} onChange={values => { const value = values[0]; props.onGenderChange?.(value === 'woman' || value === 'man' || value === 'nonbinary' ? value : null); }} disabled={props.busy} />
      </View> : null}
      <ProfileDiscoveryEditor languages={props.languages} onLanguagesChange={props.onLanguagesChange} languageNotice={props.languageNotice} languageRef={props.languageRef}
        perspective={props.perspective} onPerspectiveChange={props.onPerspectiveChange} options={options} error={error} retry={retry} busy={props.busy} />
    </ProfileEditorSection>
  </View>;
}
