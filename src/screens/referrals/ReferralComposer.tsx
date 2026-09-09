import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SimpleDropdown, type DropdownOption } from '../../components/common/SimpleDropdown';
import { useTheme } from '../../contexts/ThemeContext';
import { PROFESSIONAL_LANGUAGE_OPTIONS } from '../../constants/professionalMatchingOptions';
import { translateSpecialty } from '../../constants/specialties';
import * as Crypto from 'expo-crypto';
import { Button } from '../../components/common';
import { getErrorMessage } from '../../constants/errors';
import * as service from '../../services/referralService';
import { getReferralCandidate } from '../../services/collaborationService';
import { ReferralCard, ReferralCheck, ReferralField, ReferralText, money, styles } from './ReferralElements';

interface Props { clientId: string; access: service.ReferralAccess; initial?: service.ReferralDetail; previousId?: string; agreementVersionId?: string; onSaved: (id: string) => void; onCancel: () => void }
export function ReferralComposer({ clientId, access, initial, previousId, agreementVersionId, onSaved, onCancel }: Props) {
  const { theme } = useTheme();
  const [wide, setWide] = useState(false);
  const [specialization, setSpecialization] = useState('');
  const [options, setOptions] = useState<service.ReferralDirectoryOptions>({ specializations: [], languages: [], capabilities: [] });
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState('');
  const [optionsAttempt, setOptionsAttempt] = useState(0);
  const versionId = initial?.agreementVersionId ?? agreementVersionId;
  const [purpose, setPurpose] = useState<service.ReferralPurpose>(initial?.purpose ?? 'COMPLEMENTARY');
  const [content, setContent] = useState<service.ReferralContent>(initial?.content ?? { reason: 'PREFERENCE', explanation: '', summary: '', needs: '', transition: '' });
  const [selected, setSelected] = useState<service.ReferralCandidate[]>(initial?.candidates ?? []);
  const [query, setQuery] = useState(''); const [language, setLanguage] = useState(''); const [capability, setCapability] = useState(''); const [modality, setModality] = useState(''); const [budget, setBudget] = useState('');
  const [results, setResults] = useState<service.ReferralCandidate[]>([]); const [page, setPage] = useState(0); const [more, setMore] = useState(false); const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [candidateAttempt, setCandidateAttempt] = useState(0);
  const submitting = useRef(false); const requestGeneration = useRef(0); const command = useRef({ key: Crypto.randomUUID(), fingerprint: '' });
  useEffect(() => () => { requestGeneration.current++; }, []);
  useEffect(() => {
    if (versionId) { setOptionsLoading(false); return; }
    let active = true;
    setOptionsLoading(true); setOptionsError('');
    void service.getReferralDirectoryOptions().then(data => { if (active) setOptions(data); })
      .catch(err => { if (active) setOptionsError(getErrorMessage(err, 'No se pudieron cargar los filtros. Puedes buscar por nombre o reintentarlo.')); })
      .finally(() => { if (active) setOptionsLoading(false); });
    return () => { active = false; };
  }, [versionId, optionsAttempt]);
  useEffect(() => {
    if (!versionId || initial) return;
    const current = ++requestGeneration.current; setBusy(true);
    void getReferralCandidate(versionId).then(candidate => { if (current === requestGeneration.current) setSelected([candidate]); }).catch(err => { if (current === requestGeneration.current) setError(getErrorMessage(err, 'No se pudo consultar el destinatario del acuerdo.')); }).finally(() => { if (current === requestGeneration.current) setBusy(false); });
    return () => { requestGeneration.current++; };
  }, [versionId, initial, candidateAttempt]);
  const search = async (nextPage = 0) => {
    if (submitting.current) return;
    const generation = ++requestGeneration.current; setBusy(true); setError(''); setResults([]); setSearched(false);
    try {
      const price = budget.trim() ? Number(budget.replace(',', '.')) : undefined;
      if (price !== undefined && (!Number.isFinite(price) || price < 0)) throw new Error('Revisa el presupuesto.');
      const data = await service.searchReferralDirectory({ page: nextPage, query: query.trim() || undefined, specialization: specialization || undefined, language: language || undefined, capability: capability || undefined, modality: modality || undefined, maxPriceCents: price !== undefined ? Math.round(price * 100) : undefined });
      if (requestGeneration.current !== generation) return;
      setResults(data.items); setPage(nextPage); setMore(data.hasMore); setSearched(true);
    } catch (err) { if (requestGeneration.current === generation) setError(getErrorMessage(err, 'No se pudo consultar el directorio.')); }
    finally { if (requestGeneration.current === generation) setBusy(false); }
  };
  const save = async () => {
    if (submitting.current) return; submitting.current = true; setBusy(true); setError('');
    try {
      if (!content.explanation.trim() || !selected.length) throw new Error('Añade una explicación y selecciona entre uno y tres profesionales.');
      const values = { clientId, purpose, content, candidateIds: selected.map(c => c.id), previousId, agreementVersionId: versionId || undefined };
      const fingerprint = JSON.stringify(values);
      if (command.current.fingerprint !== fingerprint) command.current = { key: Crypto.randomUUID(), fingerprint };
      const draft: service.ReferralDraft = { commandKey: command.current.key, ...values };
      if (initial) { await service.editReferral(initial.id, draft, initial.revision, access); onSaved(initial.id); }
      else { const created = await service.createReferral(draft, access); onSaved(created.id); }
    } catch (err) { setError(getErrorMessage(err, 'No se pudo guardar. Conservamos tu propuesta para que puedas reintentar.')); }
    finally { setBusy(false); submitting.current = false; }
  };
  const changeContent = (key: keyof service.ReferralContent, value: string) => { setContent(current => ({ ...current, [key]: value })); };
  const invalidateSearch = () => { requestGeneration.current++; setBusy(false); setResults([]); setSearched(false); setPage(0); setMore(false); setError(''); };
  const clearFilters = () => { setQuery(''); setSpecialization(''); setLanguage(''); setCapability(''); setModality(''); setBudget(''); invalidateSearch(); };
  const hasFilters = Boolean(query || specialization || language || capability || modality || budget);
  const languageLabel = (value: string) => PROFESSIONAL_LANGUAGE_OPTIONS.find(option => option.value === value)?.label ?? value;
  const selectFilter = (setter: (value: string) => void) => (value: string) => { if (submitting.current) return; setter(value); invalidateSearch(); };
  const canSave = selected.length > 0 && Boolean(content.explanation.trim());
  return <View style={composer.root} onLayout={event => setWide(event.nativeEvent.layout.width >= 900)}>
    <View style={composer.heading}>
      <View style={composer.headingCopy}>
        <Text style={{ color: theme.textMuted, fontFamily: theme.fontSansSemiBold, fontSize: 12, letterSpacing: 1.5 }}>CONTINUIDAD DE LA ATENCIÓN</Text>
        <ReferralText title>{initial ? 'Editar borrador' : 'Proponer derivación'}</ReferralText>
        <ReferralText>Prepara la propuesta y elige hasta tres profesionales para tu paciente.</ReferralText>
      </View>
      <View style={[composer.badge, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
        <Ionicons name="document-text-outline" size={16} color={theme.textSecondary} /><Hint>Borrador privado</Hint>
      </View>
    </View>
    <View style={[composer.notice, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <Ionicons name="shield-checkmark-outline" size={20} color={theme.textSecondary} />
      <View style={{ flex: 1 }}><Hint>El paciente elige y autoriza qué se comparte. El receptor valora y acepta el caso. Esta bandeja no es un canal de urgencias.</Hint></View>
    </View>
    <View style={[composer.columns, wide && { flexDirection: 'row' }]}>
      <ReferralCard style={composer.column}>
        <SectionHeading number="01" title="Detalles de la propuesta" subtitle="Los campos con * son obligatorios para guardar." />
        <FieldLabel label="Objetivo de la derivación *" />
        <View style={composer.purposeRow}>
          {([{ value: 'COMPLEMENTARY', title: 'Atención complementaria', description: 'Añadir apoyo a la atención actual.', icon: 'add-circle-outline' }, { value: 'TRANSFER', title: 'Cambio de profesional', description: 'Proponer un cambio de profesional.', icon: 'swap-horizontal-outline' }] as const).map(option => <View key={option.value} style={composer.purposeItem}>
            <Button variant={purpose === option.value ? 'secondary' : 'outline'} accessibilityRole="radio" accessibilityState={{ checked: purpose === option.value }} disabled={busy} style={{ borderRadius: 12, borderColor: purpose === option.value ? theme.textSecondary : theme.border, minHeight: 76 }} textStyle={{ fontSize: 13, color: theme.textPrimary }} icon={<Ionicons name={option.icon} size={19} color={theme.textPrimary} />} onPress={() => setPurpose(option.value)}>{option.title}</Button>
            <Hint>{option.description}</Hint>
          </View>)}
        </View>
        <ComposerSelect label="Motivo principal *" value={content.reason} onSelect={value => { if (!busy) setContent(current => ({ ...current, reason: value })); }} options={reasonOptions} />
        <ReferralField label="Explicación para el paciente *" placeholder="Explica por qué propones la derivación y por qué estos profesionales pueden encajar." multiline maxLength={2000} editable={!busy} value={content.explanation} onChangeText={value => changeContent('explanation', value)} />
        <ReferralField label="Necesidades de atención (opcional)" placeholder="Población, apoyo necesario, horarios preferidos u otras necesidades del paciente…" multiline style={{ minHeight: 88 }} maxLength={2000} editable={!busy} value={content.needs} onChangeText={value => changeContent('needs', value)} />
        <View style={[composer.divider, { borderColor: theme.border }]} />
        <ReferralField label="Resumen para compartir (opcional)" placeholder="Incluye solo la información necesaria para valorar el caso." multiline style={{ minHeight: 88 }} maxLength={8000} editable={!busy} value={content.summary} onChangeText={value => changeContent('summary', value)} />
        <Hint>La información clínica requiere autorización del expediente. Puedes proponer perfiles sin compartir historia.</Hint>
        <ReferralField label="Transición y próximas citas (opcional)" placeholder="Cómo acompañarás la transición y qué se ha acordado sobre las próximas citas." multiline style={{ minHeight: 88 }} maxLength={2000} editable={!busy} value={content.transition} onChangeText={value => changeContent('transition', value)} />
        <Hint>La aceptación no cerrará tu atención ni cancelará citas automáticamente.</Hint>
      </ReferralCard>
      <ReferralCard style={composer.column}>
        <SectionHeading number="02" title="Encuentra profesionales" subtitle="Selecciona entre 1 y 3 perfiles. Todos los filtros son opcionales." />
        <View style={[composer.selection, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <FieldLabel label={`Profesionales propuestos · ${selected.length}/3 *`} />
          {!selected.length ? <Hint>Aún no has elegido perfiles. Búscalos y añádelos a tu propuesta.</Hint> : selected.map(candidate => <View key={candidate.id} style={composer.selectedRow}>
            <Ionicons name="checkmark-circle" size={19} color={theme.textPrimary} />
            <Text style={{ flex: 1, color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }}>{candidate.user.name}</Text>
            {!versionId ? <Button size="small" variant="ghost" disabled={busy} accessibilityLabel={`Quitar a ${candidate.user.name}`} style={composer.smallButton} onPress={() => setSelected(current => current.filter(item => item.id !== candidate.id))}>Quitar</Button> : null}
          </View>)}
        </View>
        {versionId ? <>
          <ReferralText>El destinatario está vinculado al acuerdo. El paciente conocerá el interés económico del origen y podrá rechazar la propuesta.</ReferralText>
          {!selected.length && !busy ? <Button variant="outline" onPress={() => setCandidateAttempt(value => value + 1)}>Reintentar destinatario</Button> : null}
        </> : <>
          <ReferralField label="Nombre o palabra clave" placeholder="Ej. nombre del profesional" maxLength={100} editable={!busy} value={query} onChangeText={selectFilter(setQuery)} onSubmitEditing={() => { if (!busy) void search(); }} />
          {optionsLoading ? <ActivityIndicator accessibilityLabel="Cargando opciones del directorio" /> : optionsError ? <View style={{ gap: 8 }}><ReferralText error>{optionsError}</ReferralText><Button size="small" variant="outline" onPress={() => setOptionsAttempt(value => value + 1)}>Reintentar filtros</Button></View> : <>
            <ComposerSelect label="Especialidad" value={specialization} onSelect={selectFilter(setSpecialization)} options={[{ value: '', label: 'Todas las especialidades' }, ...options.specializations.map(value => ({ value, label: translateSpecialty(value) }))]} />
            <View style={composer.filterRow}>
              <View style={composer.filter}><ComposerSelect label="Idioma" value={language} onSelect={selectFilter(setLanguage)} options={[{ value: '', label: 'Cualquier idioma' }, ...options.languages.map(value => ({ value, label: languageLabel(value) }))]} /></View>
              <View style={composer.filter}><ComposerSelect label="Modalidad" value={modality} onSelect={selectFilter(setModality)} options={[{ value: '', label: 'Cualquier modalidad' }, { value: 'online', label: 'Online' }, { value: 'in-person', label: 'Presencial' }]} /></View>
            </View>
            <ComposerSelect label="Capacidad declarada" value={capability} onSelect={selectFilter(setCapability)} options={[{ value: '', label: 'Cualquier capacidad' }, ...options.capabilities.map(value => ({ value, label: value }))]} />
            <Hint>Opciones de perfiles que aceptan derivaciones. Cada profesional deberá confirmar su encaje para este caso.</Hint>
          </>}
          <ReferralField label="Presupuesto máximo por sesión (€)" placeholder="Sin límite de presupuesto" keyboardType="decimal-pad" maxLength={10} editable={!busy} value={budget} onChangeText={selectFilter(setBudget)} />
          <View style={composer.searchActions}>
            <Button style={{ flex: 1, borderRadius: 12 }} icon={<Ionicons name="search-outline" size={18} color={theme.actionPrimaryText} />} onPress={() => void search()} loading={busy}>Buscar profesionales</Button>
            {hasFilters ? <Button size="small" variant="ghost" disabled={busy} style={composer.smallButton} onPress={clearFilters}>Limpiar filtros</Button> : null}
          </View>
          {!searched ? <View style={[composer.empty, { backgroundColor: theme.bg }]}><Ionicons name="people-outline" size={26} color={theme.textMuted} /><FieldLabel label="Explora el directorio" /><Hint>Puedes buscar sin rellenar ningún filtro o acotar según las necesidades de tu paciente.</Hint></View> : !results.length ? <View style={[composer.empty, { backgroundColor: theme.bg }]}><Ionicons name="search-outline" size={26} color={theme.textMuted} /><FieldLabel label="No encontramos coincidencias" /><Hint>Prueba con menos filtros o amplía el presupuesto. Tu selección se conserva.</Hint>{hasFilters ? <Button size="small" variant="outline" onPress={clearFilters}>Restablecer filtros</Button> : null}</View> : <>
            <FieldLabel label={`Resultados · Página ${page + 1}`} />
            <Hint>Credenciales verificadas y capacidades declaradas. HERA no selecciona el destino.</Hint>
            {results.map(candidate => <ReferralCard key={candidate.id} style={{ padding: 16, borderRadius: 14, gap: 10 }}>
              <View style={composer.selectedRow}><View style={{ flex: 1, gap: 4 }}><FieldLabel label={candidate.user.name} /><Hint>{translateSpecialty(candidate.specialization)}</Hint></View><FieldLabel label={`${money(Math.round(candidate.pricePerSession * 100))}/sesión`} /></View>
              <Hint>Idiomas: {candidate.languagesSpoken.map(languageLabel).join(', ') || 'Consulta el perfil'}</Hint>
              <Hint>Capacidades: {candidate.referralCapabilities.join(', ') || 'Sin detalle'}{candidate.referralExclusions.length ? `\nExclusiones: ${candidate.referralExclusions.join(', ')}` : ''}</Hint>
              <ReferralCheck label={selected.some(item => item.id === candidate.id) ? `${candidate.user.name} en la propuesta` : `Añadir a ${candidate.user.name}`} checked={selected.some(item => item.id === candidate.id)} disabled={busy || (selected.length === 3 && !selected.some(item => item.id === candidate.id))} onChange={checked => setSelected(current => checked ? current.some(item => item.id === candidate.id) || current.length >= 3 ? current : [...current, candidate] : current.filter(item => item.id !== candidate.id))} />
            </ReferralCard>)}
          </>}
          {selected.length === 3 ? <Hint>Ya has elegido el máximo de tres perfiles. Quita uno para añadir otro.</Hint> : null}
          {searched && (page > 0 || more) ? <View style={styles.row}><Button size="small" variant="ghost" disabled={page === 0 || busy} onPress={() => void search(page - 1)}>Anterior</Button><Button size="small" variant="ghost" disabled={!more || busy} onPress={() => void search(page + 1)}>Siguiente</Button></View> : null}
        </>}
      </ReferralCard>
    </View>
    {error ? <ReferralText error>{error}</ReferralText> : null}
    <View style={[composer.footer, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <View style={{ flex: 1, minWidth: 200, gap: 4 }}><FieldLabel label={canSave ? 'Tu propuesta está lista para guardar' : 'Completa lo esencial para guardar'} /><Hint>{canSave ? 'Guardar no envía la propuesta. Podrás revisarla antes de enviarla.' : 'Añade una explicación y selecciona al menos un profesional.'}</Hint></View>
      <View style={styles.row}><Button variant="ghost" disabled={busy} style={composer.smallButton} onPress={onCancel}>Volver</Button><Button disabled={!canSave} loading={busy} style={{ borderRadius: 12 }} icon={<Ionicons name="save-outline" size={18} color={theme.actionPrimaryText} />} onPress={() => void save()}>Guardar borrador</Button></View>
    </View>
  </View>;
}
const reasonOptions: readonly DropdownOption<service.ReferralContent['reason']>[] = [
  { value: 'PREFERENCE', label: 'Preferencia del paciente' }, { value: 'COMPETENCE', label: 'Competencia requerida' },
  { value: 'AVAILABILITY', label: 'Disponibilidad' }, { value: 'COMPLEMENTARY', label: 'Atención complementaria' }, { value: 'OTHER', label: 'Otro motivo' },
];
function FieldLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 14, lineHeight: 20 }}>{label}</Text>;
}
function Hint({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 13, lineHeight: 20 }}>{children}</Text>;
}
function ComposerSelect<T extends string>({ label, value, options, onSelect }: { label: string; value: T; options: readonly DropdownOption<T>[]; onSelect: (value: T) => void }) {
  return <View style={{ gap: 7 }}><FieldLabel label={label} /><SimpleDropdown<T> accessibilityLabel={label} value={value} options={options} onSelect={onSelect} highlightSelection={false} selectionIndicator="radio" presentation="portal" maxHeight={300} /></View>;
}
function SectionHeading({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  const { theme } = useTheme();
  return <View style={{ gap: 10, marginBottom: 4 }}><View style={composer.selectedRow}><View style={[composer.step, { backgroundColor: theme.bg }]}><Text style={{ color: theme.textSecondary, fontFamily: theme.fontSansSemiBold, fontSize: 13 }}>{number}</Text></View><Text accessibilityRole="header" style={{ flex: 1, color: theme.textPrimary, fontFamily: theme.fontHeading, fontSize: 20, lineHeight: 27 }}>{title}</Text></View><Hint>{subtitle}</Hint></View>;
}
const composer = StyleSheet.create({
  root: { gap: 20, width: '100%' }, heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }, headingCopy: { flex: 1, minWidth: 220, gap: 6 },
  badge: { flexDirection: 'row', gap: 7, alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  notice: { flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 14 },
  columns: { gap: 20, alignItems: 'stretch' }, column: { flex: 1, minWidth: 0, padding: 20, gap: 16, borderRadius: 18, alignSelf: 'flex-start', width: '100%' },
  purposeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, purposeItem: { flex: 1, minWidth: 175, gap: 6 },
  divider: { borderTopWidth: 1, marginVertical: 2 }, step: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  selection: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 }, selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, filter: { flex: 1, minWidth: 155 },
  searchActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, smallButton: { borderRadius: 10, minHeight: 44 },
  empty: { borderRadius: 12, padding: 20, gap: 8 }, footer: { borderWidth: 1, borderRadius: 16, padding: 18, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 },
});
