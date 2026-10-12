import {choiceKeyboardProps} from '../../utils/choiceKeyboard';
import {useDiscoveryRevalidation} from '../../hooks/useDiscoveryRevalidation';
import React, {useState, useEffect, useCallback} from 'react';
import {Image, Pressable, Text, TextInput, View} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {useTheme} from '../../contexts/ThemeContext';
import {useProfileOptions} from '../../hooks/useProfileOptions';
import {PROFESSIONAL_SPECIALTY_OPTIONS, PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS, customChoiceError, type ProfessionalMatchingOption} from '../../constants/professionalMatchingOptions';
import type {PerspectiveDraft} from '../../services/profileDiscoveryService';
import {ProfileDiscoveryEditor} from './ProfileDiscoveryEditor';
import {PracticeTags} from '../common/PracticeTags';
import {optionLabel} from '../../utils/profileOptions';
import {renderLanguageIcon} from '../common/LanguageIcon';

interface Props {
  name: string; title: string; avatar: string | null;
  specialties: string[]; approaches: string[]; customSpecialties: string[]; customApproaches: string[];
  languages: string[]; profileVisible: boolean; matchingNeedsReview: boolean; busy?: boolean;
  perspective: PerspectiveDraft; onPerspectiveChange: (value: PerspectiveDraft) => void;
  onToggle: (field: 'specialties' | 'therapeuticApproaches', value: string) => void;
  onCustomSpecialtiesChange: (values: string[]) => void; onCustomApproachesChange: (values: string[]) => void;
  onLanguagesChange: (values: string[]) => void;
}
function ChoiceGroup({title, description, options, selected, custom, onToggle, onCustomChange, max, required, busy}: {
  title: string; description: string; options: readonly ProfessionalMatchingOption[]; selected: string[]; custom: string[];
  onToggle: (value: string) => void; onCustomChange: (values: string[]) => void; max: number; required?: boolean; busy?: boolean;
}) {
  const {theme} = useTheme();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const count = selected.length + custom.length;
  const selectionError = custom.map((value, index) => customChoiceError(value, custom.slice(0, index), options)).find(Boolean);
  const text = {fontFamily: theme.fontSans, color: theme.textPrimary, fontSize: 14, lineHeight: 20};
  const add = () => {
    const message = customChoiceError(draft, custom, options);
    if (message) {setError(message); return;}
    if (count >= max) return;
    onCustomChange([...custom, draft.trim()]); setDraft(''); setError(''); setAdding(false);
  };
  return <View style={{gap: 12}}>
    <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, alignItems: 'center'}}>
      <Text style={[text, {fontFamily: theme.fontSansSemiBold, fontSize: 18}]}>{title}</Text>
      <Text accessibilityLiveRegion="polite" style={[text, {color: theme.primary, fontSize: 12}]}>{required ? count + '/5 seleccionadas' : count + ' seleccionados'}</Text>
    </View>
    <Text style={[text, {color: theme.textSecondary}]}>{description}</Text>
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
      {options.map(option => {
        const checked = selected.includes(option.value);
        const disabled = Boolean(busy || (!checked && count >= max));
        return <Pressable key={option.value} {...choiceKeyboardProps(() => onToggle(option.value), disabled)} accessibilityRole="checkbox" aria-checked={checked} aria-disabled={disabled} accessibilityLabel={option.label} accessibilityState={{checked, disabled}} disabled={disabled} onPress={() => onToggle(option.value)} style={{maxWidth: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: checked ? theme.primary : theme.borderLight, backgroundColor: checked ? theme.primaryAlpha12 : theme.bgCard, opacity: disabled ? 0.48 : 1}}>
          <Text style={[text, {flexShrink: 1, fontFamily: checked ? theme.fontSansSemiBold : theme.fontSans}]}>{option.label}</Text>
          {checked ? <Ionicons name="checkmark" color={theme.primary} size={15} /> : null}
        </Pressable>;
      })}
      {custom.map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={'Quitar ' + value} disabled={busy} onPress={() => onCustomChange(custom.filter(item => item !== value))} style={{maxWidth: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.primaryAlpha12, borderWidth: 1, borderColor: theme.primary}}>
        <Text style={[text, {flexShrink: 1}]}>{value}</Text><Ionicons name="close" size={16} color={theme.primary} />
      </Pressable>)}
      <Pressable disabled={busy || count >= max} accessibilityRole="button" accessibilityState={{disabled: busy || count >= max, expanded: adding}} onPress={() => setAdding(!adding)} style={{minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, opacity: count >= max ? 0.45 : 1}}>
        <Text style={[text, {color: theme.primary}]}>{required ? '+ Añadir otra' : '+ Añadir otro'}</Text>
      </Pressable>
    </View>
    {adding ? <View style={{gap: 6}}>
      <View style={{flexDirection: 'row', gap: 8}}>
        <TextInput autoFocus editable={!busy && count < max} accessibilityLabel={required ? 'Otra especialidad' : 'Otro enfoque'} maxLength={40} value={draft} onChangeText={value => {setDraft(value); setError('');}} onSubmitEditing={add} placeholder={required ? 'Escribe tu especialidad' : 'Escribe tu enfoque'} placeholderTextColor={theme.textMuted} style={[text, {flex: 1, minWidth: 0, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12}]} />
        <Pressable disabled={busy || count >= max} accessibilityRole="button" onPress={add} style={{justifyContent: 'center', paddingHorizontal: 16, minHeight: 44, borderRadius: 10, backgroundColor: theme.primary}}><Text style={[text, {color: theme.actionPrimaryText}]}>Añadir</Text></Pressable>
      </View>
      <Text accessibilityLiveRegion="polite" style={[text, {fontSize: 12, color: theme.textSecondary}]}>{error || draft.length + '/40 caracteres'}</Text>
    </View> : null}
    {selectionError ? <Text accessibilityLiveRegion="polite" style={[text, {color: theme.textSecondary, fontSize: 12}]}>Revisa las opciones propias: {selectionError}</Text> : null}
    {required && count === 0 ? <Text style={[text, {color: theme.textSecondary, fontSize: 12}]}>Selecciona al menos una especialidad para guardar.</Text> : null}
    {count >= max ? <Text accessibilityLiveRegion="polite" style={[text, {color: theme.textSecondary, fontSize: 12}]}>{required ? 'Máximo 5. Desmarca una para elegir otra.' : 'Has alcanzado el límite de 30 enfoques.'}</Text> : null}
  </View>;
}
export function ProfessionalMatchingEditor(props: Props) {
  const {theme} = useTheme();
  const {options, error, retry} = useProfileOptions();
  const [wide, setWide] = useState(false);
  useDiscoveryRevalidation(useCallback(() => retry(), [retry]));
  useEffect(() => {
    if (props.perspective.publish && props.perspective.noticeVersion && options && props.perspective.noticeVersion !== options.religionNoticeVersion) {
      props.onPerspectiveChange({...props.perspective, publish: false, noticeVersion: null});
    }
  }, [options?.religionNoticeVersion, props.perspective, props.onPerspectiveChange]);
  const perspectiveLabel = props.perspective.religionCode === 'other' ? props.perspective.religionOtherText : optionLabel(options?.religions ?? [], props.perspective.religionCode);
  return <View testID="professional-practice-editor" onLayout={event => setWide(event.nativeEvent.layout.width >= 900)} style={{flexDirection: wide ? 'row' : 'column', gap: 24, alignItems: 'flex-start'}}>
    <View style={{flex: wide ? 1 : undefined, width: wide ? undefined : '100%', minWidth: 0, gap: 26, padding: wide ? 24 : 16, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 20, backgroundColor: theme.bgCard}}>
      {props.matchingNeedsReview ? <Text style={{color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 21}}>Hemos actualizado las opciones. Revisa tus especialidades y enfoques; hemos conservado como propias las selecciones sin equivalente.</Text> : null}
      <ChoiceGroup title="Especialidades" description="Elige de una a cinco áreas que representan tu práctica." options={PROFESSIONAL_SPECIALTY_OPTIONS} selected={props.specialties} custom={props.customSpecialties} onCustomChange={props.onCustomSpecialtiesChange} max={5} required busy={props.busy} onToggle={value => props.onToggle('specialties', value)} />
      <View style={{height: 1, backgroundColor: theme.borderLight}} />
      <ChoiceGroup title="Enfoques terapéuticos" description="Selecciona los enfoques con los que trabajas." options={PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS} selected={props.approaches} custom={props.customApproaches} onCustomChange={props.onCustomApproachesChange} max={30} busy={props.busy} onToggle={value => props.onToggle('therapeuticApproaches', value)} />
      <View style={{height: 1, backgroundColor: theme.borderLight}} />
      <ProfileDiscoveryEditor languages={props.languages} onLanguagesChange={props.onLanguagesChange} perspective={props.perspective} onPerspectiveChange={props.onPerspectiveChange} options={options} error={error} retry={retry} busy={props.busy} />
    </View>
    <View testID="professional-practice-preview" style={{width: wide ? 300 : '100%', minWidth: 0, borderRadius: 20, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgCard, overflow: 'hidden'}}>
      <View style={{padding: 18, backgroundColor: theme.primaryAlpha12, gap: 4}}>
        <Text style={{fontFamily: theme.fontSansSemiBold, color: theme.textPrimary, fontSize: 15}}>Así te verán los pacientes</Text>
        <Text style={{fontFamily: theme.fontSans, color: theme.textSecondary, fontSize: 12}}>Vista previa · cambios sin guardar</Text>
      </View>
      <View style={{padding: 20, gap: 20}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
          {props.avatar ? <Image source={{uri: props.avatar}} accessibilityLabel={'Foto de ' + props.name} style={{width: 48, height: 48, borderRadius: 24}} /> : <View style={{width: 48, height: 48, borderRadius: 24, backgroundColor: theme.primaryAlpha12, alignItems: 'center', justifyContent: 'center'}}><Ionicons name="person-outline" size={24} color={theme.primary} /></View>}
          <View style={{flex: 1, gap: 4}}><Text style={{fontFamily: theme.fontSansSemiBold, color: theme.textPrimary, fontSize: 17}}>{props.name || 'Tu nombre'}</Text><Text style={{fontFamily: theme.fontSans, color: theme.textSecondary, fontSize: 13}}>{props.title || 'Profesional de HERA'}</Text></View>
        </View>
        <PracticeTags title="Especialidades" kind="specialties" values={[...props.specialties, ...props.customSpecialties]} />
        <PracticeTags title="Enfoques terapéuticos" kind="approaches" values={[...props.approaches, ...props.customApproaches]} />
        {props.languages.length ? <View style={{gap: 8}}><Text style={{fontFamily: theme.fontSansSemiBold, color: theme.textSecondary, fontSize: 12}}>Idiomas</Text><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10}}>{props.languages.map(value => <View key={value} style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>{renderLanguageIcon(value)}<Text style={{fontFamily: theme.fontSans, color: theme.textPrimary, fontSize: 13}}>{optionLabel(options?.languages ?? [], value)}</Text></View>)}</View></View> : null}
        {options?.religionEnabled && props.perspective.publish && perspectiveLabel ? <PracticeTags title="Perspectiva espiritual o religiosa" values={[perspectiveLabel]} /> : null}
      </View>
    </View>
  </View>;
}
