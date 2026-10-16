import { CommissionLoading } from './CommissionLoading';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { FocusedActionSheet } from '../../components/finance/FocusedActionSheet';
import { getErrorMessage } from '../../constants/errors';
import { openPrivateDocument } from '../../utils/openPrivateDocument';
import * as service from '../../services/heraCommissionService';
import { Button, Card, CommissionDisclosure, Text, WorkflowDate, WorkflowHint, dateTime, getMadridDateKey, money, exclusionLabels, type Run } from './CommissionElements';
import { CommissionSessionActivityForm } from './CommissionSessions';
import { CommissionDecisionPanel } from './CommissionDecisionPanel';
import { CommissionMetrics, LedgerTitle } from './CommissionLedgerUI';
import { CommissionAccountHistory } from './CommissionAccountHistory';
import { CommissionMonthReceipt, CommissionSessionDetail, awaitingCompletion } from './CommissionMonthPanels';
import { CashOperations, CommissionIssues, CommissionPeriods, ReceiptForm } from './CommissionOperations';
import { ProfessionalCommissionDocuments } from './ProfessionalCommissionDocuments';
import { CommissionPayments, CommissionPaymentInstructions } from './CommissionPayments';
import { ReferralPagination } from '../referrals/ReferralControls';
import { WorkflowEmpty } from '../referrals/WorkflowUI';

const amount = (value: number | null) => value === null ? 'Por calcular' : money(value);
const paymentLabels: Record<service.MonthSummary['paymentState'], string> = { REVIEW:'Pendiente de revisión', PARTIAL:'Pago parcial', PENDING:'Pago pendiente', PAID:'Pagado', NO_AMOUNT:'Sin importe a pagar' };
const issueLabel = (issue: service.MonthlyIssue|service.Issue) => issue.decision === 'APPROVED' ? 'Aprobada' : issue.decision === 'REJECTED' ? 'Rechazada' : issue.status === 'RESOLVED' ? 'Resuelta' : issue.status === 'DEFERRED' ? 'Aplazada' : 'Pendiente';

export function CommissionMonthWorkspace({ data, admin, refresh, onChanged, clientId, initialMonth, toolbarActions }: {
 data: service.AccountDetail; admin: boolean; refresh: number; onChanged: () => void; clientId?: string; initialMonth?: string; toolbarActions?: React.ReactNode;
}) {
 const { theme } = useTheme();
 const accountId=data.summary.id;
 const [month,setMonth]=useState(()=>initialMonth ?? getMadridDateKey().slice(0,7));
 const [width,setWidth]=useState(0);
 const [page,setPage]=useState(0);
 const [summary,setSummary]=useState<service.MonthSummary>();
 const [rows,setRows]=useState<service.Page<service.CommissionSession>>();
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const submitting=useRef(false);
 const [retry,setRetry]=useState(0);
 const [selected,setSelected]=useState<service.CommissionSession>();
 const [activityRow,setActivityRow]=useState<service.CommissionSession>();
 const [preview,setPreview]=useState<service.DecisionPreview>();
 const [reason,setReason]=useState('');
 const [panel,setPanel]=useState<'payment'|'documents'|'history'|'reviews'|'close'|'activity'|'payments'|'accountReviews'|'advanced'>();
 const [advancedLoading,setAdvancedLoading]=useState(false);
 const [advancedPage,setAdvancedPage]=useState(0);
 const [advancedData,setAdvancedData]=useState(data);
 const [receipt,setReceipt]=useState<{documentId?: string}>();
 useEffect(()=>{let active=true;setLoading(true);setError('');setSummary(undefined);setRows(undefined);
  void Promise.all([service.month(accountId,admin,month),service.sessions(accountId,admin,{month,page,clientId})]).then(([s,r])=>{if(active){setSummary(s);setRows(r);}}).catch(e=>{if(active)setError(getErrorMessage(e,'No se pudo cargar el mes.'));}).finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[accountId,admin,month,page,clientId,refresh,retry]);
 useEffect(()=>{setAdvancedData(data);},[data]);
 useEffect(()=>{if(!advancedPage){setAdvancedData(data);setAdvancedLoading(false);return;}let active=true;setAdvancedLoading(true);void service.detail(accountId,admin,advancedPage).then(d=>{if(active)setAdvancedData(d);}).catch(e=>{if(active)setError(getErrorMessage(e,'No se pudo cargar el histórico.'));}).finally(()=>{if(active)setAdvancedLoading(false);});return()=>{active=false;};},[advancedPage,accountId,admin,refresh]);
 const run:Run=async operation=>{if(submitting.current)return false;submitting.current=true;setBusy(true);setError('');try{await operation();return true;}catch(e){setError(getErrorMessage(e,'No se pudo guardar. Recarga los datos y revisa el resultado antes de reintentar.'));return false;}finally{submitting.current=false;setBusy(false);}};
 const mutate:Run=async operation=>{const ok=await run(operation);if(ok){setSelected(undefined);setActivityRow(undefined);setPreview(undefined);setPanel(undefined);setReceipt(undefined);setRetry(v=>v+1);onChanged();}return ok;};
 const closePanel=()=>{if(!busy){setError('');setSelected(undefined);setActivityRow(undefined);setPreview(undefined);setPanel(undefined);setReason('');setReceipt(undefined);}};
 const inspectIssue=(issue:service.MonthlyIssue|service.Issue)=>void run(async()=>{setPreview(await service.decisionPreview(accountId,issue.id));setReason('');});
 const wide=width>=920;
 const currentIssues=selected ? summary?.issues.filter(i=>i.snapshotId===selected.id) ?? [] : [];
 const pendingIssues=summary?.issues.filter(i=>i.status==='OPEN'||i.status==='DEFERRED') ?? [];
 const title=preview ? 'Revisar solicitud' : selected ? 'Detalle de comisión' : panel==='activity'?'Corregir actividad':panel==='payment'?'Registrar pago recibido':panel==='close'?'Cerrar periodo':panel==='documents'?'Facturas':panel==='payments'?'Pagos y saldo a favor':panel==='advanced'?'Gestión avanzada':panel==='reviews'?'Solicitudes del mes':panel==='accountReviews'?'Solicitudes de la cuenta':'Historial de la cuenta';
 const issueRows=(issues:Array<service.MonthlyIssue|service.Issue>)=>issues.map(issue=><View key={issue.id} style={{gap:6,paddingVertical:12,borderBottomWidth:1,borderColor:theme.border}}>
  <LedgerTitle>{issue.kind==='COMMISSION_CANCELLATION'?'Anulación de comisión':issue.kind==='SESSION_CORRECTION'?'Corrección de sesión':'Revisión'} · {issueLabel(issue)}</LedgerTitle>
  <Text>{issue.reason}</Text><WorkflowHint>{issue.createdAt?dateTime(issue.createdAt):'Histórico'}</WorkflowHint>{issue.resolution?<Text>Respuesta de HERA: {issue.resolution}</Text>:null}
  {admin && issue.status==='OPEN' && ['COMMISSION_CANCELLATION','SESSION_CORRECTION'].includes(issue.kind??'')?<Button size="small" variant="outline" disabled={busy} onPress={()=>inspectIssue(issue)}>Revisar efecto y decidir</Button>:null}
 </View>);
 return <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{gap:22}}>
  <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'flex-end',justifyContent:'space-between',gap:12,padding:10,borderRadius:18,backgroundColor:theme.bgMuted}}>
   <View style={{minWidth:220,flexGrow:1,maxWidth:260}}><WorkflowDate hideLabel={!!toolbarActions} allowAllMonths={false} granularity="month" label="Mes de las sesiones" value={month} disabled={busy} onChangeText={value=>{setMonth(value||getMadridDateKey().slice(0,7));setPage(0);}} /></View>
   <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8,maxWidth:'100%',flexShrink:1}}>{toolbarActions}<Button size="small" variant="outline" style={{backgroundColor:theme.bgCard,borderWidth:0,borderRadius:12}} icon={<Ionicons name="download-outline" size={17} color={theme.textPrimary}/>} disabled={busy||loading} onPress={()=>void run(async()=>openPrivateDocument(await service.statement(accountId,admin,month),`${accountId}-${month}`,`HERA-${month}.pdf`,'application/pdf'))}>Descargar liquidación</Button><Button size="small" variant="ghost" icon={<Ionicons name="time-outline" size={17} color={theme.textPrimary}/>} onPress={()=>{setAdvancedPage(0);setAdvancedData(data);setPanel('history');}}>Histórico</Button></View>
  </View>
  {error && !selected && !panel && !preview?<Card><Text error>{error}</Text><Button variant="outline" onPress={()=>setRetry(v=>v+1)}>Recargar mes</Button></Card>:null}
  {loading?<CommissionLoading overview accessibilityLabel="Cargando mes de comisiones"/>:summary?<>
   <CommissionMetrics items={[
    {label:'Comisiones del mes',value:money(summary.netCents)},
    {label:'Pagado',value:amount(summary.appliedCents)},
    {label:'Pendiente de pagar',value:amount(summary.pendingCents),emphasis:true},
   ]} />
   {summary.cancellationCents || summary.adjustmentCents ? <CommissionDisclosure title="Desglose de ajustes">
    <Text>Generado antes de ajustes: {money(summary.originalCents)}</Text>
    <Text>Anulaciones: {money(summary.cancellationCents)}</Text>
    <Text>Otros ajustes: {money(summary.adjustmentCents)}</Text>
   </CommissionDisclosure> : null}
   {pendingIssues.length||summary.unknownSessions?<View style={{backgroundColor:theme.bgMuted,padding:16,borderRadius:12,gap:12,flexDirection:wide?'row':'column',alignItems:wide?'center':'flex-start'}}>
    <View style={{flex:wide?1:undefined,gap:4}}>
     {pendingIssues.length?<Text>{pendingIssues.length === 1 ? '1 solicitud o revisión pendiente' : `${pendingIssues.length} solicitudes o revisiones pendientes`}</Text>:null}
     {summary.unknownSessions?<WorkflowHint>{summary.unknownSessions === 1 ? '1 sesión completada por calcular' : `${summary.unknownSessions} sesiones completadas por calcular`}. Los importes confirmados siguen visibles.</WorkflowHint>:null}
    </View>
    <Button size="small" variant="outline" onPress={()=>setPanel('reviews')}>Revisar incidencias del mes</Button>
   </View>:null}
   <View style={{flexDirection:wide?'row':'column',gap:24,alignItems:'flex-start'}}>
    <View style={{flex:wide?1:undefined,width:wide?undefined:'100%',minWidth:0,gap:16}}>
     <View style={{gap:5}}><LedgerTitle>Sesiones del mes</LedgerTitle><WorkflowHint>{summary.countedSessions} computables{summary.pendingSessions ? ` · ${summary.pendingSessions} pendientes de realizar` : ''}{summary.excludedSessions ? ` · ${summary.excludedSessions} excluidas` : ''} · Hora de Madrid</WorkflowHint></View>
     {!rows?.items.length?<WorkflowEmpty icon="calendar-outline" title="Sin sesiones en este mes" description="Los ajustes de sesiones anteriores se incluyen en la liquidación del periodo."/>:rows.items.map(row=>{ const awaiting = awaitingCompletion(row); return <Card key={row.id} style={{padding:20,gap:16}}>
      <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'flex-start',gap:16}}><View style={{flexGrow:1,flexShrink:1,flexBasis:180,minWidth:0,gap:6}}><LedgerTitle>{admin?`Paciente · ${(row.relation.patientReference??row.relationId).slice(-8)}`:row.session.patientName??'Paciente'}</LedgerTitle><WorkflowHint>{dateTime(row.session.date)}{row.position!==null?` · ${row.position}.ª sesión computable`:''}</WorkflowHint></View><View style={{backgroundColor:theme.bgMuted,borderRadius:12,paddingHorizontal:14,paddingVertical:10,gap:2}}><WorkflowHint>Comisión</WorkflowHint><LedgerTitle>{awaiting?'Sin devengar':row.potentialCents===null?'Por calcular':money(row.entitledCents)}</LedgerTitle></View></View>
      <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:14,borderTopWidth:1,borderColor:theme.border,paddingTop:14}}><View style={{flexGrow:1,flexShrink:1,flexBasis:240,gap:6}}><Text>{awaiting?'Pendiente de realizar':row.potentialCents===null?'Base y porcentaje pendientes de confirmar':row.position===null?'Sesión no computable':`${amount(row.recognizedBaseCents??row.baseCents)} × ${row.rateBps/100}%`}{row.cancellationIssueId?' · Anulada':row.exclusion?` · ${exclusionLabels[row.exclusion]??row.exclusion}`:''}</Text><WorkflowHint>{awaiting?'Todavía no genera comisión':row.potentialCents===null?'Pendiente de revisión por HERA':row.cancellationIssueId||row.settlement?.paymentState==='NO_AMOUNT'?'Sin importe a pagar':row.settlement?.paymentState==='PAID'?'Pagado':row.settlement?.paymentState==='PARTIAL'?'Pago parcial':'Pago pendiente'} · {row.settlement?.documentState==='AVAILABLE'?'Factura disponible':'Sin factura de comisión'}</WorkflowHint>{summary.issues.some(i=>i.snapshotId===row.id&&i.status==='OPEN')?<Text>Solicitud pendiente · El importe se mantiene hasta la decisión de HERA</Text>:null}</View><Button size="small" variant="outline" onPress={()=>{setSelected(row);setReason('');}}>Ver detalle</Button></View>
     </Card>;})}
     <ReferralPagination page={page} hasMore={rows?.hasMore??false} loading={loading||busy} onChange={setPage}/>
    </View>
    <View style={{width:wide?300:'100%',gap:18}}>
     <Card style={{backgroundColor:theme.bgMuted,padding:20,gap:14}}><LedgerTitle>Liquidación del mes</LedgerTitle><Text>{summary.period?.status==='CLOSED'?'Periodo cerrado':summary.period?.status==='PREPARED'?'Preparado para revisión':'Periodo abierto'}</Text><LedgerTitle>{paymentLabels[summary.paymentState]}</LedgerTitle>
      {[['Importe a cubrir',summary.payableCents]].map(([label,value])=><View key={String(label)} style={{flexDirection:'row',justifyContent:'space-between',gap:8}}><Text>{label}</Text><Text>{amount(typeof value==='number'?value:null)}</Text></View>)}
      <WorkflowHint>Consulta el total final en la factura.</WorkflowHint>
      {summary.paymentState==='REVIEW'?<Text>{summary.unknownSessions?'Falta confirmar la base o la procedencia de alguna sesión. HERA debe revisar su cálculo.':'Hay documentación pendiente de rectificar o un documento compartido. HERA debe revisar su aplicación.'}</Text>:null}
      {summary.creditCents>0?<Text>Saldo a favor: {money(summary.creditCents)}. Pide a HERA que lo aplique.</Text>:null}
      {admin?<><Button disabled={busy||!summary.period||summary.pendingCents===null} onPress={()=>{setPanel('payment');}}>Registrar pago recibido</Button>{summary.period?.status!=='CLOSED'&&summary.period?<Button variant="outline" disabled={busy||month>=getMadridDateKey().slice(0,7)} onPress={()=>setPanel('close')}>{summary.period.status==='PREPARED'?'Cerrar periodo':'Preparar periodo'}</Button>:null}</>:<CommissionDisclosure title="Instrucciones de pago"><CommissionPaymentInstructions data={data}/></CommissionDisclosure>}
      <Button variant="outline" onPress={()=>{setAdvancedPage(0);setAdvancedData(data);setPanel('documents');}}>Facturas</Button>
      <Button variant="outline" disabled={busy} onPress={()=>{setAdvancedPage(0);setAdvancedData(data);setReceipt(undefined);setPanel('payments');}}>Pagos y saldo a favor</Button>
     </Card>
     <WorkflowHint>{summary.period?.status==='CLOSED'?'El cierre conserva el desglose original. Las correcciones posteriores se registran en un mes abierto.':'La descarga es provisional hasta que HERA cierre el periodo.'}</WorkflowHint>
    </View>
   </View>
  </>:null}
  <FocusedActionSheet visible={!!selected||!!panel||!!preview} title={title} onClose={closePanel}>
   {error && panel!=='activity'?<><Text error>{error}</Text><Button size="small" variant="outline" disabled={busy} onPress={()=>{closePanel();setRetry(v=>v+1);}}>Recargar y revisar</Button></>:null}
   {preview?<CommissionDecisionPanel preview={preview} reason={reason} onReason={setReason} busy={busy}
    onDecide={decision=>void mutate(()=>service.decide(accountId,true,{
     action:preview.kind==='COMMISSION_CANCELLATION'?'DECIDE_CANCELLATION':'DECIDE_SESSION_CORRECTION',
     issueId:preview.issueId,decision,reason,revision:preview.revision,snapshotRevision:preview.snapshotRevision,
    }))}/>
   :selected?<CommissionSessionDetail key={selected.id} row={selected} admin={admin} issues={currentIssues} busy={busy} run={mutate}
    onActivity={()=>{setActivityRow(selected);setSelected(undefined);setPanel('activity');}}>
    {issueRows(currentIssues)}
   </CommissionSessionDetail>:panel==='activity'&&activityRow?<><LedgerTitle>{activityRow.session.patientName??'Paciente'} · {dateTime(activityRow.session.date)}</LedgerTitle><CommissionSessionActivityForm row={activityRow} admin={false} run={mutate} busy={busy} initialAction="ATTENDANCE" onDone={closePanel}/></>:panel==='payment'&&summary?.period?<CommissionMonthReceipt accountId={accountId} periodId={summary.period.id} summary={summary} busy={busy} run={mutate}/>:panel==='close'&&summary?.period?<><Text>Periodo {month} · Neto {money(summary.netCents)}</Text><WorkflowHint>El cierre conserva el desglose. Las solicitudes pendientes y las excepciones económicas del periodo deben estar resueltas.</WorkflowHint><Button disabled={busy} onPress={()=>void mutate(()=>service.decide(accountId,true,summary.period?.status==='PREPARED'?{action:'CLOSE',periodId:summary.period.id,revision:summary.period.revision,baseCents:summary.netCents}:{action:'PREPARE',periodId:summary.period!.id,revision:summary.period!.revision}))}>{summary.period.status==='PREPARED'?'Confirmar cierre':'Preparar para revisión'}</Button></>:panel==='reviews'?<>
    {issueRows(summary?.issues??[])}
    <Button variant="outline" disabled={busy} onPress={()=>{setAdvancedPage(0);setAdvancedData(data);setPanel('accountReviews');}}>Ver solicitudes de toda la cuenta</Button>
   </>:['documents','history','payments','accountReviews','advanced'].includes(panel??'')?<>
    {advancedLoading?<CommissionLoading accessibilityLabel="Cargando histórico"/>:<>
     {panel==='documents' ? admin ? <CommissionPeriods data={advancedData} admin documentsOnly run={mutate} busy={busy} onReceipt={id=>{setReceipt({documentId:id});setPanel('payments');}}/> : <ProfessionalCommissionDocuments data={advancedData} documentsOnly run={run} busy={busy}/> : null}
     {panel==='payments' ? <>
      {admin ? <WorkflowHint>Pagos recibidos de todos los meses.</WorkflowHint> : null}
      {admin ? receipt ? <ReceiptForm data={advancedData} selectedDocument={receipt.documentId} run={mutate} busy={busy} onClose={()=>setReceipt(undefined)}/> : <><Button disabled={busy} onPress={()=>setReceipt({})}>Registrar ingreso</Button><CashOperations data={advancedData} run={mutate} busy={busy}/></> : <><CommissionMetrics items={[{label:'Saldo a favor',value:money(advancedData.summary.creditCents)}]}/><CommissionPayments data={advancedData}/></>}
     </> : null}
     {panel==='history' ? <>
      <CommissionAccountHistory data={advancedData} admin={admin} busy={busy} onMonth={value=>{setMonth(value);setPage(0);closePanel();}}/>
      <Button variant="outline" disabled={busy} onPress={()=>setPanel('accountReviews')}>Ver solicitudes de la cuenta</Button>
      {admin ? <CommissionDisclosure title="Gestión avanzada"><WorkflowHint>Solo para incorporar pacientes anteriores o vincular fichas.</WorkflowHint><Button variant="outline" disabled={busy} onPress={()=>setPanel('advanced')}>Abrir gestión avanzada</Button></CommissionDisclosure> : null}
     </> : null}
     {panel==='accountReviews' ? <>
      <WorkflowHint>Solicitudes y decisiones de todos los meses.</WorkflowHint>
      {issueRows(advancedData.issues.filter(i=>['COMMISSION_CANCELLATION','SESSION_CORRECTION'].includes(i.kind??'')))}
      {advancedData.issues.filter(i=>!['COMMISSION_CANCELLATION','SESSION_CORRECTION'].includes(i.kind??'')).map(issue=><CommissionDisclosure key={issue.id} title={issue.status==='RESOLVED'?'Procedencia resuelta':issue.status==='DEFERRED'?'Procedencia aplazada':'Revisar procedencia'}><CommissionIssues data={{...advancedData,issues:[issue]}} admin={admin} showAdvanced={false} run={mutate} busy={busy}/></CommissionDisclosure>)}
      {!advancedData.issues.length?<Text>No hay solicitudes en esta página.</Text>:null}
     </> : null}
     {panel==='advanced' && admin ? <CommissionIssues data={{...advancedData,issues:[]}} admin run={mutate} busy={busy}/> : null}
     {panel!=='advanced' && <ReferralPagination page={advancedPage} hasMore={advancedData.hasMore} loading={busy||advancedLoading} onChange={value=>{setAdvancedPage(value);setReceipt(undefined);if(!value)setAdvancedData(data);}}/>}
    </>}
   </>:null}
  </FocusedActionSheet>
 </View>;
}
