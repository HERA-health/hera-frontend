import {choiceKeyboardProps} from '../../utils/choiceKeyboard';
import React, {useState} from 'react';
import {Pressable, Switch, Text, TextInput, View} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';
import {SearchableProfileSelect} from '../common/SearchableProfileSelect';
import {renderLanguageIcon} from '../common/LanguageIcon';
import type {PerspectiveDraft, ProfileOptions} from '../../services/profileDiscoveryService';

interface Props {
  languages: string[]; onLanguagesChange: (values: string[]) => void;
  perspective: PerspectiveDraft; onPerspectiveChange: (value: PerspectiveDraft) => void;
  options: ProfileOptions | null; busy?: boolean; retry: () => void; error?: boolean;
}
export function ProfileDiscoveryEditor({languages, onLanguagesChange, perspective, onPerspectiveChange, options, busy, retry, error}: Props) {
  const {theme} = useTheme();
  const [details, setDetails] = useState(false);
  const text = {color: theme.textPrimary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 21};
  const heading = {...text, fontSize: 18, fontFamily: theme.fontSansSemiBold};
  const changeChoice = (religionCode: string) => onPerspectiveChange({...perspective, religionCode, religionOtherText: '', publish: false, noticeVersion: null});
  return <>
    <View style={{gap: 12}}>
      <SearchableProfileSelect compact label="Idiomas de las sesiones" renderIcon={renderLanguageIcon} options={options?.languages ?? []} values={languages} onChange={onLanguagesChange} multiple disabled={!options || busy} emptyLabel="+ Añadir idioma" />
      {!options ? <Pressable accessibilityRole="button" onPress={retry}><Text style={text}>{error ? 'No se pudieron cargar las opciones. Reintentar' : 'Cargando opciones…'}</Text></Pressable> : null}
    </View>
    <View style={{height: 1, backgroundColor: theme.borderLight}} />
    <View style={{gap: 12}}>
      <View style={{gap: 4}}><Text style={heading}>Perspectiva espiritual o religiosa</Text><Text style={[text, {color: theme.textMuted, fontSize: 12}]}>OPCIONAL</Text></View>
      <Text style={[text, {color: theme.textSecondary}]}>Si integras la fe o la espiritualidad en tu práctica, puedes indicarlo para que los pacientes que lo buscan te encuentren.</Text>
      {perspective.needsReconfirmation ? <Text accessibilityLiveRegion="polite" style={[text, {color: theme.textSecondary}]}>Tu declaración anterior requiere revisión. Selecciona la perspectiva que aplicas a la terapia y confirma su publicación; hasta entonces no se mostrará.</Text> : null}
      {options?.religionEnabled ? <>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
          {options.religions.map(option => {
            const checked = perspective.religionCode === option.value;
            return <Pressable key={option.value} {...choiceKeyboardProps(() => changeChoice(checked ? '' : option.value), busy)} accessibilityRole="radio" aria-checked={checked} aria-disabled={busy} accessibilityLabel={option.label} accessibilityState={{checked, disabled: busy}} disabled={busy} onPress={() => changeChoice(checked ? '' : option.value)} style={{maxWidth: '100%', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: checked ? theme.primary : theme.borderLight, backgroundColor: checked ? theme.primaryAlpha12 : theme.bgCard}}>
              <Text style={text}>{option.label}{checked ? ' ✓' : ''}</Text>
            </Pressable>;
          })}
        </View>
        {perspective.religionCode === 'other' ? <View style={{gap: 5}}>
          <TextInput accessibilityLabel="Otra perspectiva espiritual o religiosa" editable={!busy} value={perspective.religionOtherText} maxLength={40} placeholder="Describe tu perspectiva" placeholderTextColor={theme.textMuted} onChangeText={religionOtherText => onPerspectiveChange({...perspective, religionOtherText, publish: false, noticeVersion: null})} style={[text, {borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, minHeight: 44}]} />
          <Text style={[text, {fontSize: 12, color: theme.textMuted}]}>{perspective.religionOtherText.length}/40 caracteres</Text>
        </View> : null}
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: theme.primaryAlpha12}}>
          <Switch accessibilityLabel="Mostrar en mi perfil y en el directorio" value={perspective.publish} disabled={busy || !options.religions.some(option => option.value === perspective.religionCode) || (perspective.religionCode === 'other' && !perspective.religionOtherText.trim()) || !options.religionNoticeVersion} onValueChange={publish => onPerspectiveChange({...perspective, publish, noticeVersion: publish ? options.religionNoticeVersion : null})} trackColor={{false: theme.border, true: theme.primary}} />
          <Text style={[text, {flex: 1, fontFamily: theme.fontSansSemiBold}]}>Mostrar en mi perfil y en el directorio</Text>
        </View>
        <Text style={[text, {fontSize: 12, color: theme.textSecondary}]}>Al activar el interruptor y guardar los cambios, autorizas que esta información aparezca en tu perfil y se use en los filtros de búsqueda. Para retirarla, apágalo y pulsa «Guardar cambios».</Text>
        <Pressable accessibilityRole="button" accessibilityState={{expanded: details}} onPress={() => setDetails(!details)} style={{minHeight: 44, justifyContent: 'center'}}><Text style={[text, {color: theme.primary}]}>{details ? 'Ocultar información de privacidad' : 'Información de privacidad'}</Text></Pressable>
        {details ? <Text style={[text, {fontSize: 13, color: theme.textSecondary}]}>{options.religionNotice}</Text> : null}
      </> : <Text style={[text, {color: theme.textMuted}]}>La publicación de esta información todavía no está disponible.</Text>}
      {!perspective.publish && (perspective.hasDeclaration || perspective.religionCode) ? <Text accessibilityLiveRegion="polite" style={[text, {fontSize: 13, color: theme.textSecondary}]}>{perspective.hasDeclaration ? 'Al guardar los cambios, se borrará tu perspectiva anterior y dejará de aparecer en tu perfil.' : 'Esta selección no se guardará ni se mostrará mientras el interruptor esté apagado.'}</Text> : null}
      {!options?.religionEnabled && perspective.hasDeclaration && perspective.religionCode ? <Pressable disabled={busy} accessibilityRole="button" onPress={() => onPerspectiveChange({...perspective, religionCode: '', religionOtherText: '', publish: false, noticeVersion: null, needsReconfirmation: false})} style={{minHeight: 44, justifyContent: 'center'}}><Text style={[text, {color: theme.primary}]}>Quitar esta información de mi perfil</Text></Pressable> : null}
    </View>
  </>;
}
