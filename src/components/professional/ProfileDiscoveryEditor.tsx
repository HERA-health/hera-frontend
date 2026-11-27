import {OptionalFieldSuffix} from '../common/OptionalFieldSuffix';
import {choiceKeyboardProps} from '../../utils/choiceKeyboard';
import React from 'react';
import {Alert, Linking, Platform, Pressable, Switch, Text, TextInput, View} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';
import {SearchableProfileSelect} from '../common/SearchableProfileSelect';
import {renderLanguageIcon} from '../common/LanguageIcon';
import type {PerspectiveDraft, ProfileOptions} from '../../services/profileDiscoveryService';
import {legalReaderUrl} from '../../services/legalReader';

const publicationLabel = 'Mostrar mi perspectiva en mi perfil público y usarla en los filtros del directorio y en las recomendaciones del cuestionario';

function ProfileLegalLink({label, url}: {label: string; url: string}) {
  const {theme} = useTheme();
  const linkProps = Platform.OS === 'web'
    ? {href: url, hrefAttrs: {target: '_blank', rel: 'noopener noreferrer'}}
    : {onPress: () => Linking.openURL(url).catch(() => Alert.alert('No se pudo abrir el documento', 'Vuelve a pulsar el enlace para reintentar.'))};
  return <Pressable {...linkProps} accessibilityRole="link" accessibilityLabel={Platform.OS === 'web' ? label + ' (abre otra pestaña)' : label}
    style={{minHeight: 44, justifyContent: 'center'}}>
    <Text style={{fontFamily: theme.fontSansSemiBold, fontSize: 14, color: theme.primary, textDecorationLine: 'underline'}}>{label}</Text>
  </Pressable>;
}

interface Props {
  languages: string[]; onLanguagesChange: (values: string[]) => void;
  languageNotice?: React.ReactNode;
  languageRef?: React.Ref<View>;
  perspective: PerspectiveDraft; onPerspectiveChange: (value: PerspectiveDraft) => void;
  options: ProfileOptions | null; busy?: boolean; retry: () => void; error?: boolean;
}
export function ProfileDiscoveryEditor({languages, onLanguagesChange, languageNotice, languageRef, perspective, onPerspectiveChange, options, busy, retry, error}: Props) {
  const {theme} = useTheme();
  const text = {color: theme.textPrimary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 21};
  const heading = {...text, fontSize: 18, fontFamily: theme.fontSansSemiBold};
  const changeChoice = (religionCode: string) => onPerspectiveChange({...perspective, religionCode, religionOtherText: '', publish: false, noticeVersion: null});
  return <>
    <View ref={languageRef} collapsable={false} tabIndex={-1} style={{gap: 12}}>
      <SearchableProfileSelect compact label="Idiomas de las sesiones" labelAction={languageNotice} renderIcon={renderLanguageIcon} options={options?.languages ?? []} values={languages} onChange={onLanguagesChange} multiple disabled={!options || busy} emptyLabel="+ Añadir idioma" />
      {!options ? <Pressable accessibilityRole="button" onPress={retry}><Text style={text}>{error ? 'No se pudieron cargar las opciones. Reintentar' : 'Cargando opciones…'}</Text></Pressable> : null}
    </View>
    <View style={{height: 1, backgroundColor: theme.borderLight}} />
    <View style={{gap: 12}}>
      <Text style={heading}>Perspectiva espiritual o religiosa<OptionalFieldSuffix /></Text>
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
          <Switch accessibilityLabel={publicationLabel} value={perspective.publish} disabled={busy || !options.religions.some(option => option.value === perspective.religionCode) || (perspective.religionCode === 'other' && !perspective.religionOtherText.trim()) || !options.religionNoticeVersion} onValueChange={publish => onPerspectiveChange({...perspective, publish, noticeVersion: publish ? options.religionNoticeVersion : null})} trackColor={{false: theme.border, true: theme.primary}} />
          <Text style={[text, {flex: 1, fontFamily: theme.fontSansSemiBold}]}>{publicationLabel}</Text>
        </View>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', columnGap: 20}}>
          <ProfileLegalLink label="Política de privacidad" url={legalReaderUrl('PRIVACY_POLICY') + '#perspectiva-espiritual'} />
          <ProfileLegalLink label="Términos y condiciones" url={legalReaderUrl('TERMS_OF_SERVICE', undefined, 'PROFESSIONAL')} />
        </View>
      </> : <Text style={[text, {color: theme.textMuted}]}>La publicación de esta información todavía no está disponible.</Text>}
      {!perspective.publish && (perspective.hasDeclaration || perspective.religionCode) ? <Text accessibilityLiveRegion="polite" style={[text, {fontSize: 13, color: theme.textSecondary}]}>{perspective.hasDeclaration ? 'Al guardar los cambios, se borrará tu perspectiva anterior y dejará de aparecer en tu perfil.' : 'Esta selección no se guardará ni se mostrará mientras el interruptor esté apagado.'}</Text> : null}
      {!options?.religionEnabled && perspective.hasDeclaration && perspective.religionCode ? <Pressable disabled={busy} accessibilityRole="button" onPress={() => onPerspectiveChange({...perspective, religionCode: '', religionOtherText: '', publish: false, noticeVersion: null, needsReconfirmation: false})} style={{minHeight: 44, justifyContent: 'center'}}><Text style={[text, {color: theme.primary}]}>Quitar esta información de mi perfil</Text></Pressable> : null}
    </View>
  </>;
}
