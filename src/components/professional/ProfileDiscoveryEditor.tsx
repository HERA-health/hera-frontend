import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../common/Button';
import { renderLanguageIcon } from '../common/LanguageIcon';
import { optionLabel } from '../../utils/profileOptions';
import { useDiscoveryRevalidation } from '../../hooks/useDiscoveryRevalidation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useProfileOptions } from '../../hooks/useProfileOptions';
import { useTheme } from '../../contexts/ThemeContext';
import { SearchableProfileSelect } from '../common/SearchableProfileSelect';
import { getReligionPublication, publishReligion, withdrawReligion, ReligionPublication } from '../../services/profileDiscoveryService';
import { getErrorMessage } from '../../constants/errors';

export function ProfileDiscoveryEditor({ languages, onLanguagesChange }: { languages: string[]; onLanguagesChange: (values: string[]) => void; profileVisible: boolean }) {
  const { theme } = useTheme();
  const { options, error, retry } = useProfileOptions();
  const [publication, setPublication] = useState<ReligionPublication | null>(null);
  const [draft, setDraft] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [showPublicationDetails, setShowPublicationDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [readAttempt, setReadAttempt] = useState(0);
  const [publicationError, setPublicationError] = useState(false);
  const edited = useRef(false);
  const revision = useRef(0);
  const noticeVersion = options?.religionNoticeVersion;
  const confirmationText = 'Quiero mostrar esta información en mi perfil y permitir su uso en filtros.';
  const needsConfirmation = Boolean(draft && (draft !== publication?.religionCode || !publication?.hasPublication));
  useEffect(() => {
    let active = true;
    const requestRevision = revision.current;
    setPublicationError(false);
    getReligionPublication().then(value => {
      if (!active || requestRevision !== revision.current) return;
      setPublication(value);
      if (!edited.current) { setDraft(value.religionCode ?? ''); setAccepted(false); }
    }).catch(() => { if (active && requestRevision === revision.current) setPublicationError(true); });
    return () => { active = false; };
  }, [readAttempt]);
  useEffect(() => { setAccepted(false); }, [noticeVersion]);
  useDiscoveryRevalidation(useCallback(() => { retry(); setReadAttempt(value => value + 1); }, [retry]));
  const changePublication = async (remove: boolean) => {
    if (busy || (!remove && (!accepted || !draft || !publication || !options?.religionEnabled || !noticeVersion))) return;
    revision.current++;
    setBusy(true); setMessage('');
    try {
      const value = remove ? await withdrawReligion() : await publishReligion(draft, noticeVersion!);
      revision.current++;
      edited.current = false;
      setPublication(value); setDraft(value.religionCode ?? ''); setAccepted(false);
      setMessage(remove ? 'Información eliminada.' : '');
    } catch (failure) { setMessage(getErrorMessage(failure, 'No se pudo actualizar la publicación.')); }
    finally { setBusy(false); }
  };
  const text = { color: theme.textPrimary, fontFamily: theme.fontSans, fontSize: 15 };
  const action = { paddingVertical: 12, minHeight: 44 };
  const card = { backgroundColor: theme.bgCard, borderColor: theme.border, borderWidth: 1, borderRadius: 18, padding: 24, gap: 14 };
  const eyebrow = { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold, fontSize: 11, letterSpacing: 1 };
  return <View style={{ gap: 20 }}>
    <View style={card}>
    <Text style={eyebrow}>COMUNICACIÓN</Text>
    <SearchableProfileSelect renderIcon={renderLanguageIcon} label="Idiomas en los que ofreces sesiones" options={options?.languages ?? []} values={languages} onChange={onLanguagesChange} multiple disabled={!options} emptyLabel="Buscar y añadir idioma" />
    <Text style={text}>Selecciona los idiomas en los que puedes atender con fluidez profesional. Se aplicarán al guardar los cambios del perfil.</Text>
    {!options ? <Pressable accessibilityRole="button" onPress={retry} style={action}><Text style={text}>{error ? 'No se pudo cargar el catálogo. Reintentar' : 'Cargando catálogo…'}</Text></Pressable> : null}
    </View>
    <View style={card}>
    <Text style={eyebrow}>INFORMACIÓN PERSONAL · OPCIONAL</Text>
    <Text style={[text, { fontSize: 18, fontFamily: theme.fontSansSemiBold }]}>Religión o creencias</Text>
    <Text style={[text, { color: theme.textSecondary, lineHeight: 22 }]}>Opcional. Se verá en tu perfil, también al acceder por enlace aunque no aparezcas en el directorio. Puedes eliminarla cuando quieras.</Text>
    {options?.religionEnabled ? <View style={{ gap: 12 }}>
      <SearchableProfileSelect label="Tu declaración" options={options.religions} values={draft ? [draft] : []} disabled={busy} onChange={values => { edited.current = true; setDraft(values[0] ?? ''); setAccepted(false); setMessage(''); }} emptyLabel="Seleccionar creencia" />
      {publication?.religionCode ? <Text accessibilityLiveRegion="polite" style={text}>{publication.hasPublication ? 'Guardado: ' : 'Pendiente de confirmar: '}{optionLabel(options.religions, publication.religionCode)}</Text> : !publication && !publicationError ? <Text style={text}>Cargando publicación…</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showPublicationDetails }} onPress={() => setShowPublicationDetails(value => !value)} style={action}>
        <Text style={[text, { color: theme.primary }]}>{showPublicationDetails ? 'Menos información' : 'Más información'}</Text>
      </Pressable>
      {showPublicationDetails ? <Text style={[text, { color: theme.textSecondary, lineHeight: 22 }]}>{options.religionNotice}</Text> : null}
      {needsConfirmation ? <>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={confirmationText} accessibilityState={{ checked: accepted, disabled: busy }} disabled={busy}
        onPress={() => { edited.current = true; setAccepted(value => !value); }}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: accepted ? theme.primary : theme.border, backgroundColor: accepted ? theme.primaryAlpha12 : theme.bgCard }}>
        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: accepted ? theme.primary : theme.border, backgroundColor: accepted ? theme.primary : theme.bgCard, alignItems: 'center', justifyContent: 'center' }}>
          {accepted ? <Ionicons name="checkmark" size={16} color={theme.actionPrimaryText} /> : null}
        </View>
        <Text style={[text, { flex: 1, lineHeight: 22 }]}>{confirmationText}</Text>
      </Pressable>
      <Button fullWidth loading={busy} disabled={!accepted || !publication || !noticeVersion} onPress={() => { void changePublication(false); }}>Guardar religión</Button>
      {!accepted ? <Text style={[text, { color: theme.textSecondary, fontSize: 13 }]}>Marca la casilla para guardar tu elección.</Text> : null}
      </> : null}
    </View> : null}
    {options && !options.religionEnabled ? <Text style={[text, { color: theme.textMuted, lineHeight: 22 }]}>La publicación de creencias todavía no está disponible.</Text> : null}
    {publication?.hasDeclaration || publication?.hasPublication ? <Pressable disabled={busy} accessibilityRole="button" style={action} onPress={() => { void changePublication(true); }}><Text style={[text, { color: theme.primary }]}>{publication.hasPublication ? 'Retirar de mi perfil' : 'Eliminar información guardada'}</Text></Pressable> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={text}>{message}</Text> : null}
    {publicationError ? <Text accessibilityLiveRegion="polite" style={text}>No se pudo cargar la declaración de religión o creencias.</Text> : null}
    {publicationError ? <Pressable accessibilityRole="button" style={action} onPress={() => setReadAttempt(value => value + 1)}><Text style={text}>Reintentar carga</Text></Pressable> : null}
    </View>
  </View>;
}
