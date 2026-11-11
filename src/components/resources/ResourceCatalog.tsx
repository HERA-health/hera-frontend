import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { Button } from '../common/Button';
import { SimpleDropdown } from '../common/SimpleDropdown';
import { listResources, type HeraResource, type ResourceCategory, type ResourceFormat, type ResourceList } from '../../services/resourceService';
import { getErrorMessage } from '../../constants/errors';
import { ResourceActions } from './ResourceActions';
import { ResourceEditor } from './ResourceEditor';
import { resourceCategories, planLabel } from './resourcePresentation';

export function ResourceCatalog({ admin = false }: { admin?: boolean }) {
  const { theme } = useTheme();
  const width = useWindowDimensions().width;
  const desktop = width >= 1200;
  const compact = width < 768;
  const focused = useIsFocused();
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<ResourceCategory | ''>('');
  const [format, setFormat] = useState<ResourceFormat | ''>('');
  const [status, setStatus] = useState<HeraResource['status'] | ''>('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<ResourceList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<{ resource: HeraResource | null } | null>(null);
  useEffect(() => { const timer = setTimeout(() => { setSearchTerm(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    if (!focused || editor) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    void listResources({ search: searchTerm, category: category || undefined, format: format || undefined, status: admin ? status || undefined : undefined, page }, admin, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return;
        if (page > 1 && !data.items.length) { setPage(1); return; }
        setResult(data);
      }).catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [admin, page, category, format, status, searchTerm, revision, focused, editor]);
  const text = { color: theme.textSecondary, fontFamily: theme.fontSans };
  const strong = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold };
  const filtered = !!(search || category || format || status);
  function reset() { setSearch(''); setSearchTerm(''); setCategory(''); setFormat(''); setStatus(''); setPage(1); }
  if (editor && admin) return <ResourceEditor initial={editor.resource} onClose={() => { setEditor(null); setRevision(value => value + 1); }} />;
  return <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.container, compact && { padding: 18 }]}>
    <View style={styles.content}>
      <View style={styles.heading}>
        <View style={{ flex: 1, minWidth: 230, gap: 4 }}>
          {admin && <Text accessibilityRole="header" style={[strong, { fontSize: 20 }]}>Plantillas y recursos</Text>}
          <Text style={[text, styles.intro]}>{admin ? 'Prepara, revisa y publica los materiales para especialistas.' : 'Documentos y materiales para acompañar tu práctica profesional.'}</Text>
        </View>
        {admin && <Button accessibilityLabel="Nuevo recurso" onPress={() => setEditor({ resource: null })} icon={<Ionicons name="add" size={18} color={theme.textOnPrimary} />}>Nuevo recurso</Button>}
      </View>
      <View style={styles.categories}>
        {resourceCategories.map(item => {
          const selected = category === item.value;
          const count = result?.categoryCounts.find(entry => entry.category === item.value)?.count;
          return <AnimatedPressable key={item.value} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`Categoría ${item.label}`} accessibilityHint={count === undefined ? undefined : `${count} ${count === 1 ? 'recurso publicado' : 'recursos publicados'}`}
            onPress={() => { setCategory(selected ? '' : item.value); setPage(1); }}
            style={[styles.category, { width: desktop ? '23.9%' : '48%', backgroundColor: selected ? theme.primaryAlpha12 : theme.bgCard, borderColor: selected ? theme.primary : theme.border }]}>
            {!compact && <View style={[styles.categoryIcon, { backgroundColor: theme.bgMuted }]}><Ionicons name={item.icon} color={theme.primary} size={20} /></View>}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[strong, { fontSize: 13, lineHeight: 18 }]}>{item.label}</Text>
              <Text style={[text, { fontSize: 12, lineHeight: 16 }]}>{count === undefined ? '—' : `${count} ${count === 1 ? 'recurso' : 'recursos'}${admin ? count === 1 ? ' publicado' : ' publicados' : ''}`}</Text>
            </View>
          </AnimatedPressable>;
        })}
      </View>
      {!admin && result && !result.openAccess && <View style={[styles.notice, { borderColor: theme.border }]}>
        <Ionicons name="lock-closed-outline" size={19} color={theme.primary} />
        <Text style={[text, { flex: 1, fontSize: 13, lineHeight: 20 }]}>Puedes consultar el catálogo. El acceso a los archivos todavía no está habilitado.</Text>
      </View>}
      <View style={styles.toolbar}>
        <Text accessibilityRole="header" style={[strong, { fontSize: 16, marginRight: 'auto' }]}>{category ? resourceCategories.find(item => item.value === category)?.label : 'Todos los recursos'}</Text>
        <View style={[styles.search, { borderColor: theme.border, backgroundColor: theme.bgCard, width: compact ? '100%' : 310 }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} />
          <TextInput accessibilityLabel="Buscar recursos" placeholder="Buscar por nombre o descripción…" placeholderTextColor={theme.textMuted} value={search} onChangeText={setSearch} maxLength={160} style={{ flex: 1, minWidth: 0, fontFamily: theme.fontSans, color: theme.textPrimary, fontSize: 13, paddingVertical: 10 }} />
        </View>
        <SimpleDropdown<ResourceFormat | ''> value={format} accessibilityLabel="Filtrar por formato" options={[{ value: '', label: 'Todos los formatos' }, { value: 'PDF', label: 'PDF' }, { value: 'DOCX', label: 'DOCX' }]} onSelect={value => { setFormat(value); setPage(1); }} presentation="portal" compact />
        {admin && <SimpleDropdown<HeraResource['status'] | ''> value={status} accessibilityLabel="Filtrar por estado" options={[{ value: '', label: 'Todos los estados' }, { value: 'DRAFT', label: 'Borradores' }, { value: 'PUBLISHED', label: 'Publicados' }]} onSelect={value => { setStatus(value); setPage(1); }} presentation="portal" compact />}
        {filtered && <Button variant="ghost" size="small" onPress={reset}>Restablecer</Button>}
      </View>
      {loading ? <View style={styles.empty}><ActivityIndicator color={theme.primary} /><Text style={text}>Cargando recursos…</Text></View>
        : error ? <View style={styles.empty}><Text accessibilityRole="alert" style={[text, { color: theme.error }]}>{error}</Text><Button variant="outline" onPress={() => setRevision(value => value + 1)}>Reintentar</Button></View>
        : !result?.items.length ? <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={38} color={theme.primary} />
          <Text style={[strong, { fontSize: 19 }]}>{filtered ? 'No hay recursos con estos filtros' : 'La biblioteca está por comenzar'}</Text>
          <Text style={[text, { textAlign: 'center', maxWidth: 420, lineHeight: 22 }]}>{filtered ? 'Prueba otra búsqueda o restablece los filtros.' : admin ? 'Crea el primer recurso, añade sus archivos y publícalo cuando esté listo.' : 'Aquí encontrarás los materiales que publique el equipo de HERA.'}</Text>
          {filtered && <Button variant="outline" onPress={reset}>Restablecer filtros</Button>}
        </View> : <View style={[styles.table, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
          {desktop && <View style={[styles.row, styles.tableHead, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
            <Text style={[text, styles.mainCol, styles.caption]}>Nombre y descripción</Text><Text style={[text, styles.formatCol, styles.caption]}>Formato</Text><Text style={[text, styles.dateCol, styles.caption]}>Actualización</Text><Text style={[text, styles.planCol, styles.caption]}>{admin ? 'Plan / estado' : 'Plan previsto'}</Text><Text style={[text, styles.actionCol, styles.caption]}>Acciones</Text>
          </View>}
          {result.items.map(item => <View key={item.id} style={[styles.row, !desktop && styles.mobileRow, { borderColor: theme.border }]}>
            <View style={[desktop ? styles.mainCol : undefined, { gap: 6 }]}>
              <Text style={[strong, { fontSize: 15, lineHeight: 21 }]}>{item.title}</Text>
              <Text style={[text, { fontSize: 13, lineHeight: 20 }]}>{item.description}</Text>
            </View>
            <View style={[desktop && styles.formatCol, { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }]}>
              {item.files.map(file => <Text key={file.format} style={[styles.badge, { color: theme.textSecondary, backgroundColor: theme.bgMuted, fontFamily: theme.fontSansSemiBold }]}>{file.format}</Text>)}
              {!item.files.length && <Text style={[text, styles.caption]}>Sin archivos</Text>}
            </View>
            <Text style={[text, desktop && styles.dateCol, styles.caption]}>{!desktop ? 'Actualizado: ' : ''}{new Date(item.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            <View style={[desktop && styles.planCol, { gap: 7 }]}><Text style={[text, styles.caption]}>Desde {planLabel(item.minimumPlan)}</Text>{admin && <Text style={[styles.caption, { color: item.status === 'PUBLISHED' ? theme.primary : theme.textMuted, fontFamily: theme.fontSansSemiBold }]}>{item.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}</Text>}</View>
            <View style={[desktop && styles.actionCol, { gap: 8 }]}>
              <ResourceActions resource={item} admin={admin} enabled={admin || result.openAccess} />
              {admin && <AnimatedPressable accessibilityRole="button" accessibilityLabel={`Editar ${item.title}`} onPress={() => setEditor({ resource: item })} style={{ paddingVertical: 8 }}><Text style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold, fontSize: 13 }}>Editar recurso →</Text></AnimatedPressable>}
            </View>
          </View>)}
        </View>}
      {!loading && !error && !!result?.total && <View style={styles.pagination}>
        <Text style={[text, styles.caption]}>{result.total} {result.total === 1 ? 'recurso' : 'recursos'} · Página {result.page} de {Math.ceil(result.total / result.pageSize)}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}><Button variant="ghost" size="small" disabled={page <= 1} onPress={() => setPage(value => value - 1)}>Anterior</Button><Button variant="ghost" size="small" disabled={page * result.pageSize >= result.total} onPress={() => setPage(value => value + 1)}>Siguiente</Button></View>
      </View>}
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 20 }, content: { width: '100%', maxWidth: 1440, alignSelf: 'center', gap: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  intro: { fontSize: 14, lineHeight: 22 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  category: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  categoryIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', gap: 10, borderLeftWidth: 2, paddingLeft: 12, paddingVertical: 3 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  search: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 12, borderWidth: 1, borderRadius: 9 },
  table: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' }, row: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: StyleSheet.hairlineWidth, gap: 16 },
  tableHead: { paddingVertical: 12 }, mobileRow: { flexDirection: 'column', alignItems: 'stretch', gap: 12 },
  mainCol: { flex: 1, minWidth: 160 }, formatCol: { width: 82 }, dateCol: { width: 105 }, planCol: { width: 108 }, actionCol: { width: 210 },
  caption: { fontSize: 12, lineHeight: 18 }, badge: { fontSize: 10, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 16 },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' },
});
