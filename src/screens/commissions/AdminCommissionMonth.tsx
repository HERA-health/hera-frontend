import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import { openPrivateDocument } from '../../utils/openPrivateDocument';
import * as service from '../../services/heraCommissionService';
import { Button, Check, Field, Text, WorkflowDate, WorkflowHint, getMadridDateKey, money } from './CommissionElements';
import { CommissionSelect } from './CommissionFields';
import { CommissionMetrics, LedgerTitle } from './CommissionLedgerUI';
import { ReferralPagination } from '../referrals/ReferralControls';

export function AdminCommissionMonth({specialistId,onOpen,refresh}:{specialistId?:string;onOpen:(id:string,month:string)=>void;refresh:number}) {
 const {theme}=useTheme();
 const [width,setWidth]=useState(0);
 const [month,setMonth]=useState(()=>getMadridDateKey().slice(0,7));
 const [mode,setMode]=useState<service.Mode>('LIVE');
 const [operators,setOperators]=useState<Awaited<ReturnType<typeof service.operators>>>([]);
 const [operatorKey,setOperatorKey]=useState('');
 const [search,setSearch]=useState('');
 const [missing,setMissing]=useState(false);
 const [page,setPage]=useState(0);
 const [result,setResult]=useState<Awaited<ReturnType<typeof service.adminMonth>>>();
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [exporting,setExporting]=useState(false);
 useEffect(()=>{let active=true;void service.operators().then(list=>{if(active){setOperators(list);setOperatorKey(k=>k||list[0]?.operatorKey||'');if(list.length&&!list.some(o=>o.mode==='LIVE'))setMode('SIMULATION');if(!list.length)setLoading(false);}}).catch(e=>{if(active){setError(getErrorMessage(e,'No se pudieron cargar los operadores.'));setLoading(false);}});return()=>{active=false;};},[refresh]);
 useEffect(()=>{if(!operatorKey)return;let active=true;setLoading(true);setError('');setResult(undefined);void service.adminMonth({month,mode,operatorKey,search,page,specialistId,missingAcceptance:missing}).then(r=>{if(active)setResult(r);}).catch(e=>{if(active)setError(getErrorMessage(e,'No se pudo cargar el mes.'));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[month,mode,operatorKey,search,page,specialistId,missing,refresh]);
 const rows=result?.items??[];
 const exportCsv=async()=>{if(exporting)return;setExporting(true);setError('');try{await openPrivateDocument(await service.exportMonth({month,mode,operatorKey,page:0,specialistId,search,missingAcceptance:missing}),`month-${month}`,`HERA-${month}.csv`,'text/csv');}catch(e){setError(getErrorMessage(e,'No se pudo exportar el mes.'));}finally{setExporting(false);}};
 const wide=width>=920;
 return <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{gap:20}}>
  <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'flex-end',gap:14}}><View style={{flexGrow:1,flexBasis:230}}><WorkflowDate allowAllMonths={false} granularity="month" label="Mes" value={month} onChangeText={v=>{setMonth(v||getMadridDateKey().slice(0,7));setPage(0);}}/></View><View style={{flexGrow:1,flexBasis:200}}><CommissionSelect accessibilityLabel="Operador" value={operatorKey} onSelect={v=>{setOperatorKey(v);setPage(0);}} options={[...new Map(operators.map(o=>[o.operatorKey,{value:o.operatorKey,label:o.operatorName}])).values()]}/></View><View style={{flexGrow:1,flexBasis:170}}><CommissionSelect accessibilityLabel="Tipo de cuenta" value={mode} onSelect={v=>{setMode(v);setPage(0);}} options={[{value:'LIVE',label:'Real'},{value:'SIMULATION',label:'Simulación'}]}/></View><Button variant="outline" disabled={exporting||!operatorKey} onPress={()=>void exportCsv()}>{exporting?'Exportando…':'Exportar selección (CSV)'}</Button></View>
  {!loading&&!error&&!operators.length?<WorkflowHint>No hay acuerdos de comisiones disponibles. Revisa la configuración antes de iniciar nuevas liquidaciones.</WorkflowHint>:null}
  {mode==='SIMULATION'?<WorkflowHint>Simulación sin deuda. Las operaciones de esta cuenta no representan pagos reales.</WorkflowHint>:null}
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:14,alignItems:'flex-end'}}><View style={{flex:1,minWidth:220}}><Field label="Buscar profesional" value={search} onChangeText={v=>{setSearch(v);setPage(0);}}/></View><Check checked={missing} onChange={v=>{setMissing(v);setPage(0);}} label="Solo sin aceptación vigente"/></View>
  {error?<Text error>{error}</Text>:null}{loading?<ActivityIndicator accessibilityLabel="Cargando resumen mensual"/>:!error?<>
   {result?<CommissionMetrics items={[
    {label:'Comisiones del mes',value:money(result.totals.netCents),emphasis:true},
    {label:'Sesiones computables',value:String(result.totals.countedSessions)},
    {label:'Especialistas',value:String(result.totals.specialistCount)},
   ]}/>:null}
   <WorkflowHint>Resumen de toda la selección · La exportación respeta estos filtros. Los importes corresponden a comisiones ya calculadas.</WorkflowHint>
   {wide?<View style={{flexDirection:'row',gap:12,paddingVertical:10,borderBottomWidth:1,borderColor:theme.border}}><View style={{flex:2}}><LedgerTitle>Profesional</LedgerTitle></View><View style={{flex:1}}><Text>Pacientes / sesiones</Text></View><View style={{flex:1}}><Text>Original / ajustes</Text></View><View style={{flex:1}}><Text>Neto / recibido</Text></View><View style={{flex:1}}><Text>Pendiente</Text></View><View style={{width:110}}/></View>:null}
   {rows.map(row=><View key={row.specialistId} style={{flexDirection:wide?'row':'column',gap:12,paddingVertical:16,borderBottomWidth:1,borderColor:theme.border,alignItems:wide?'center':'stretch'}}>
    <View style={{flex:wide?2:undefined,gap:4,minWidth:0}}><LedgerTitle>{row.specialistName}</LedgerTitle><WorkflowHint>{row.contact}</WorkflowHint>{row.verificationStatus && row.verificationStatus!=='VERIFIED'?<Text>Verificación pendiente · Historial disponible</Text>:null}{row.summary?.unknownSessions?<Text>{row.summary.unknownSessions} sesiones por calcular</Text>:null}{!row.accepted?<Text>Sin aceptación vigente</Text>:null}{row.summary?.issues.some(i=>i.status==='OPEN')?<Text>Solicitudes pendientes</Text>:null}</View>
    {row.summary?<><View style={{flex:wide?1:undefined,gap:3}}><Text>{!wide?'Pacientes / sesiones: ':''}{row.summary.patientCount} / {row.summary.countedSessions}</Text><WorkflowHint>{row.summary.tiers.map(t=>`${t.count} al ${t.rateBps/100}%`).join(' · ')}</WorkflowHint></View><View style={{flex:wide?1:undefined}}><Text>{!wide?'Original: ':''}{money(row.summary.originalCents)}</Text><WorkflowHint>Ajustes {money(row.summary.adjustmentCents-row.summary.cancellationCents)}</WorkflowHint></View><View style={{flex:wide?1:undefined}}><LedgerTitle>{!wide?'Neto: ':''}{money(row.summary.netCents)}</LedgerTitle><WorkflowHint>Recibido {row.summary.appliedCents===null?'por revisar':money(row.summary.appliedCents)}</WorkflowHint></View><View style={{flex:wide?1:undefined}}><Text>{!wide?'Pendiente: ':''}{row.summary.pendingCents===null?'Por calcular':money(row.summary.pendingCents)}</Text><WorkflowHint>{row.summary.period?.status==='CLOSED'?'Cerrado':row.summary.period?.status==='PREPARED'?'Preparado':'Abierto'}</WorkflowHint></View></>:<View style={{flex:wide?4:undefined}}><Text>Sin cuenta económica. Pendiente de aceptación.</Text></View>}
    <View style={{width:wide?110:undefined}}>{row.accountId?<Button size="small" variant="outline" onPress={()=>{if(row.accountId)onOpen(row.accountId,month);}}>Ver detalle</Button>:null}</View>
   </View>)}{!rows.length?<Text>No hay profesionales para esta selección.</Text>:null}
   <ReferralPagination page={page} hasMore={result?.hasMore??false} loading={loading} onChange={setPage}/>
  </>:null}
 </View>;
}
