import { CommissionLoading } from './CommissionLoading';
import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View } from 'react-native';
import { getErrorMessage } from '../../constants/errors';
import { openPrivateDocument } from '../../utils/openPrivateDocument';
import * as service from '../../services/heraCommissionService';
import { Button, Check, Field, Text, WorkflowDate, WorkflowHint, getMadridDateKey, money } from './CommissionElements';
import { CommissionSelect } from './CommissionFields';
import { CommissionMetrics } from './CommissionLedgerUI';
import { AdminCommissionTable } from './AdminCommissionTable';
import { ReferralPagination } from '../referrals/ReferralControls';

export function AdminCommissionMonth({specialistId,onOpen,refresh}:{specialistId?:string;onOpen:(id:string,month:string)=>void;refresh:number}) {
 const [width,setWidth]=useState(0);
 const [month,setMonth]=useState(()=>getMadridDateKey().slice(0,7));
 const [operators,setOperators]=useState(service.cachedOperators);
 const [mode,setMode]=useState<service.Mode>(()=>operators.length&&!operators.some(o=>o.mode==='LIVE')?'SIMULATION':'LIVE');
 const [operatorKey,setOperatorKey]=useState(()=>operators[0]?.operatorKey??'');
 const [search,setSearch]=useState('');
 const [query,setQuery]=useState('');
 const [missing,setMissing]=useState(false);
 const [page,setPage]=useState(0);
 const [result,setResult]=useState<Awaited<ReturnType<typeof service.adminMonth>>>();
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [exporting,setExporting]=useState(false);
 useEffect(()=>{if(search===query)return;const timer=setTimeout(()=>{setQuery(search);setPage(0);},300);return()=>clearTimeout(timer);},[search,query]);
 useFocusEffect(useCallback(()=>{let active=true;void service.operators(refresh>0).then(list=>{if(active){setOperators(list);setOperatorKey(k=>k||list[0]?.operatorKey||'');if(list.length&&!list.some(o=>o.mode==='LIVE'))setMode('SIMULATION');if(!list.length)setLoading(false);}}).catch(e=>{if(active){setError(getErrorMessage(e,'No se pudieron cargar los operadores.'));setLoading(false);}});return()=>{active=false;};},[refresh]));
 useFocusEffect(useCallback(()=>{if(!operatorKey)return;let active=true;setLoading(true);setError('');setResult(undefined);void service.adminMonth({month,mode,operatorKey,search:query,page,specialistId,missingAcceptance:missing}).then(r=>{if(active)setResult(r);}).catch(e=>{if(active)setError(getErrorMessage(e,'No se pudo cargar el mes.'));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[month,mode,operatorKey,query,page,specialistId,missing,refresh]));
 const rows=result?.items??[];
 const exportCsv=async()=>{if(exporting||search!==query)return;setExporting(true);setError('');try{await openPrivateDocument(await service.exportMonth({month,mode,operatorKey,page:0,specialistId,search:query,missingAcceptance:missing}),`month-${month}`,`HERA-${month}.csv`,'text/csv');}catch(e){setError(getErrorMessage(e,'No se pudo exportar el mes.'));}finally{setExporting(false);}};
 return <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{gap:20}}>
  <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'flex-end',gap:14}}><View style={{flexGrow:1,flexBasis:230}}><WorkflowDate allowAllMonths={false} granularity="month" label="Mes" value={month} onChangeText={v=>{setMonth(v||getMadridDateKey().slice(0,7));setPage(0);}}/></View><View style={{flexGrow:1,flexBasis:200}}><CommissionSelect accessibilityLabel="Titular del acuerdo HERA" value={operatorKey} onSelect={v=>{setOperatorKey(v);setPage(0);}} options={[...new Map(operators.map(o=>[o.operatorKey,{value:o.operatorKey,label:o.operatorName}])).values()]}/></View><View style={{flexGrow:1,flexBasis:170}}><CommissionSelect accessibilityLabel="Datos de comisiones" value={mode} onSelect={v=>{setMode(v);setPage(0);}} options={[{value:'LIVE',label:'Reales'},{value:'SIMULATION',label:'Pruebas (sin deuda)'}]}/></View><Button variant="outline" disabled={exporting||!operatorKey||search!==query} onPress={()=>void exportCsv()}>{exporting?'Exportando…':'Exportar selección (CSV)'}</Button></View>
  <WorkflowHint>El titular identifica a quien figura en el acuerdo económico de HERA. Las cuentas de pruebas están separadas de las reales.</WorkflowHint>
  {!loading&&!error&&!operators.length?<WorkflowHint>No hay acuerdos de comisiones disponibles. Revisa la configuración antes de iniciar nuevas liquidaciones.</WorkflowHint>:null}
  {mode==='SIMULATION'?<WorkflowHint>Simulación sin deuda. Las operaciones de esta cuenta no representan pagos reales.</WorkflowHint>:null}
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:14,alignItems:'flex-end'}}><View style={{flex:1,minWidth:220}}><Field label="Buscar profesional" value={search} onChangeText={setSearch}/></View><Check checked={missing} onChange={v=>{setMissing(v);setPage(0);}} label="Solo con condiciones pendientes"/></View>
  {missing ? <WorkflowHint>Muestra profesionales sin aceptación activa de las condiciones económicas actuales. No indica si tienen pagos pendientes.</WorkflowHint> : null}
  {error?<Text error>{error}</Text>:null}{loading?<CommissionLoading overview variant="admin" accessibilityLabel="Cargando resumen mensual"/>:!error?<>
   {result?<CommissionMetrics items={[
    {label:'Comisiones del mes',value:money(result.totals.netCents),emphasis:true},
    {label:'Sesiones computables',value:String(result.totals.countedSessions)},
    {label:'Especialistas',value:String(result.totals.specialistCount)},
   ]}/>:null}
   <WorkflowHint>Resumen de toda la selección · La exportación respeta estos filtros. Los importes corresponden a comisiones ya calculadas.</WorkflowHint>
   <AdminCommissionTable rows={rows} width={width} onOpen={id=>onOpen(id,month)}/>{!rows.length?<Text>No hay profesionales para esta selección.</Text>:null}
   <ReferralPagination page={page} hasMore={result?.hasMore??false} loading={loading} onChange={setPage}/>
  </>:null}
 </View>;
}
