import { useCallback, useEffect, useRef, useState } from "react";
import * as clinicService from "../../../services/clinicService";
import type {
  ClinicAgreementRelationship,
  ClinicAgreementScope,
  ClinicAgreementSettlementCondition,
  ClinicAgreementShareMethod,
  ClinicEconomicAgreement,
  ClinicFinanceOverview,
  ClinicMembershipRole,
  FinancialPeriodPreview,
} from "../../../services/clinicService";
import {
  getMadridDateKey,
  parseMadridDateTime,
} from "../../../utils/madridTime";

export interface AgreementDraftForm {
  scope: ClinicAgreementScope;
  clinicSpecialistId: string | null;
  clinicServiceId: string | null;
  clinicPatientId: string | null;
  relationship: ClinicAgreementRelationship;
  shareMethod: ClinicAgreementShareMethod;
  shareValue: string;
  settlementCondition: ClinicAgreementSettlementCondition;
  validFrom: string;
  validUntil: string;
  replacementReason: string;
}

const initialAgreementForm = (): AgreementDraftForm => ({
  scope: "CLINIC",
  clinicSpecialistId: null,
  clinicServiceId: null,
  clinicPatientId: null,
  relationship: "SELF_EMPLOYED_COLLABORATOR",
  shareMethod: "PERCENTAGE",
  shareValue: "50",
  settlementCondition: "PATIENT_COLLECTION",
  validFrom: getMadridDateKey(),
  validUntil: "",
  replacementReason: "Nueva configuración económica",
});

const initialClosedPeriod = (): { year: number; month: number } => {
  const [currentYear, currentMonth] = getMadridDateKey().split("-").map(Number);
  return currentMonth === 1
    ? { year: currentYear - 1, month: 12 }
    : { year: currentYear, month: currentMonth - 1 };
};

export const useClinicFinancialWorkspace = (
  clinicId: string,
  role: ClinicMembershipRole,
  section:
    "overview" | "agreements" | "patient-documents" | "periods" | "ledger",
) => {
  const [overview, setOverview] = useState<ClinicFinanceOverview | null>(null);
  const [agreements, setAgreements] = useState<ClinicEconomicAgreement[]>([]);
  const [specialists, setSpecialists] = useState<
    clinicService.ClinicSpecialist[]
  >([]);
  const [services, setServices] = useState<
    clinicService.ClinicServiceCatalogItem[]
  >([]);
  const [patients, setPatients] = useState<
    clinicService.ClinicPatientSummary[]
  >([]);
  const [patientPageInfo, setPatientPageInfo] =
    useState<clinicService.ClinicPatientListPageInfo>({
      page: 1,
      limit: 25,
      hasMore: false,
      nextPage: null,
    });
  const [patientSearch, setPatientSearch] = useState("");
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [periodPreview, setPeriodPreview] =
    useState<FinancialPeriodPreview | null>(null);
  const [ledger, setLedger] = useState<
    clinicService.ClinicFinancialLedgerLine[]
  >([]);
  const [ledgerNextCursor, setLedgerNextCursor] = useState<string | null>(null);
  const [agreementForm, setAgreementForm] =
    useState<AgreementDraftForm>(initialAgreementForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(initialClosedPeriod);
  const requestGeneration = useRef(0);
  const patientRequestGeneration = useRef(0);
  const ledgerRequestGeneration = useRef(0);
  const commandKeys = useRef(new Map<string, string>());

  useEffect(() => {
    requestGeneration.current += 1;
    patientRequestGeneration.current += 1;
    ledgerRequestGeneration.current += 1;
    setOverview(null);
    setAgreements([]);
    setSpecialists([]);
    setServices([]);
    setPatients([]);
    setPeriodPreview(null);
    setLedger([]);
    setLedgerNextCursor(null);
    commandKeys.current.clear();
  }, [clinicId]);

  const load = useCallback(async () => {
    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    setLoading(true);
    setError(null);
    try {
      const needsAgreements = section === "agreements" || section === "periods";
      const [
        nextOverview,
        nextAgreements,
        nextSpecialists,
        catalog,
        patientPage,
        preview,
        ledgerPage,
      ] = await Promise.allSettled([
        clinicService.getClinicFinanceOverview(clinicId),
        needsAgreements
          ? clinicService.listClinicFinanceAgreements(clinicId)
          : Promise.resolve(null),
        section === "agreements"
          ? clinicService.listClinicSpecialists(clinicId, { status: "ACTIVE" })
          : Promise.resolve(null),
        section === "agreements"
          ? clinicService.listClinicServices(clinicId, { status: "ACTIVE" })
          : Promise.resolve(null),
        section === "agreements"
          ? clinicService.listClinicPatients(clinicId, {
              status: "ACTIVE",
              page: 1,
              limit: 25,
            })
          : Promise.resolve(null),
        section === "periods"
          ? clinicService.previewClinicFinancialPeriod(
              clinicId,
              selectedPeriod.year,
              selectedPeriod.month,
            )
          : Promise.resolve(null),
        section === "ledger"
          ? clinicService.listClinicFinancialLedger(clinicId, { limit: 50 })
          : Promise.resolve(null),
      ] as const);
      if (requestGeneration.current !== generation) return;
      if (nextOverview.status === "rejected") throw nextOverview.reason;
      setOverview(nextOverview.value);
      if (nextAgreements.status === "fulfilled" && nextAgreements.value)
        setAgreements(nextAgreements.value);
      if (nextSpecialists.status === "fulfilled" && nextSpecialists.value)
        setSpecialists(nextSpecialists.value);
      if (catalog.status === "fulfilled" && catalog.value)
        setServices(catalog.value.services);
      if (patientPage.status === "fulfilled" && patientPage.value) {
        setPatients(patientPage.value.items);
        setPatientPageInfo(patientPage.value.pageInfo);
      }
      if (preview.status === "fulfilled" && preview.value)
        setPeriodPreview(preview.value);
      if (ledgerPage.status === "fulfilled" && ledgerPage.value) {
        setLedger(ledgerPage.value.items);
        setLedgerNextCursor(ledgerPage.value.nextCursor);
      }
      const optionalFailure = [
        nextAgreements,
        nextSpecialists,
        catalog,
        patientPage,
        preview,
        ledgerPage,
      ].find((result) => result.status === "rejected");
      if (optionalFailure?.status === "rejected") {
        setError(
          optionalFailure.reason instanceof Error
            ? optionalFailure.reason.message
            : "Una parte de esta vista no se pudo cargar. Reintenta esta pestaña.",
        );
      }
    } catch (loadError: unknown) {
      if (requestGeneration.current !== generation) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el circuito económico.",
      );
    } finally {
      if (requestGeneration.current === generation) setLoading(false);
    }
  }, [clinicId, section, selectedPeriod.month, selectedPeriod.year]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(
    async (
      action: (idempotencyKey?: string) => Promise<unknown>,
      commandFingerprint?: string,
    ): Promise<boolean> => {
      setSaving(true);
      setError(null);
      const idempotencyKey = commandFingerprint
        ? (commandKeys.current.get(commandFingerprint) ??
          clinicService.createFinancialCommandKey())
        : undefined;
      if (commandFingerprint && idempotencyKey)
        commandKeys.current.set(commandFingerprint, idempotencyKey);
      try {
        await action(idempotencyKey);
        if (commandFingerprint) commandKeys.current.delete(commandFingerprint);
        try {
          await load();
        } catch {
          setError(
            "La acción se completó, pero no se pudo actualizar la vista. Reintenta la carga.",
          );
        }
        return true;
      } catch (actionError: unknown) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "No se pudo completar la acción.",
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const createAgreement = useCallback(() => {
    const numericValue = Number(agreementForm.shareValue.replace(",", "."));
    if (
      !Number.isFinite(numericValue) ||
      numericValue < 0 ||
      (agreementForm.shareMethod === "PERCENTAGE" && numericValue > 100)
    ) {
      setError("Introduce una parte profesional válida.");
      return Promise.resolve(false);
    }
    if (agreementForm.scope !== "CLINIC" && !agreementForm.clinicSpecialistId) {
      setError("Selecciona el profesional al que se aplicará el acuerdo.");
      return Promise.resolve(false);
    }
    if (
      agreementForm.scope === "SPECIALIST_SERVICE" &&
      !agreementForm.clinicServiceId
    ) {
      setError("Selecciona el servicio al que se aplicará el acuerdo.");
      return Promise.resolve(false);
    }
    if (
      agreementForm.scope === "SPECIALIST_PATIENT" &&
      !agreementForm.clinicPatientId
    ) {
      setError("Selecciona el paciente al que se aplicará el acuerdo.");
      return Promise.resolve(false);
    }
    const validFrom = parseMadridDateTime(agreementForm.validFrom, "00:00");
    const validUntil = agreementForm.validUntil
      ? parseMadridDateTime(agreementForm.validUntil, "00:00")
      : null;
    if (!validFrom || (agreementForm.validUntil && !validUntil)) {
      setError("Revisa las fechas de vigencia en horario de Madrid.");
      return Promise.resolve(false);
    }
    const payload: clinicService.CreateClinicAgreementPayload = {
        scope: agreementForm.scope,
        clinicSpecialistId:
          agreementForm.scope === "CLINIC"
            ? null
            : agreementForm.clinicSpecialistId,
        clinicServiceId:
          agreementForm.scope === "SPECIALIST_SERVICE"
            ? agreementForm.clinicServiceId
            : null,
        clinicPatientId:
          agreementForm.scope === "SPECIALIST_PATIENT"
            ? agreementForm.clinicPatientId
            : null,
        relationship: agreementForm.relationship,
        shareMethod: agreementForm.shareMethod,
        professionalShareBps:
          agreementForm.shareMethod === "PERCENTAGE"
            ? Math.round(numericValue * 100)
            : null,
        professionalFixedCents:
          agreementForm.shareMethod === "FIXED_AMOUNT"
            ? Math.round(numericValue * 100)
            : null,
        settlementCondition: agreementForm.settlementCondition,
        validFrom: validFrom.iso,
        validUntil: validUntil?.iso ?? null,
        replacementReason: agreementForm.replacementReason,
    };
    return runAction(
      async (idempotencyKey) => {
        await clinicService.createClinicFinanceAgreement(
          clinicId,
          payload,
          idempotencyKey,
        );
        setAgreementForm(initialAgreementForm());
      },
      `create-agreement:${JSON.stringify(payload)}`,
    );
  }, [agreementForm, clinicId, runAction]);

  const searchPatients = useCallback(
    async (search: string, append = false): Promise<void> => {
      const generation = patientRequestGeneration.current + 1;
      patientRequestGeneration.current = generation;
      const normalizedSearch = search.trim();
      const page = append ? patientPageInfo.nextPage : 1;
      if (!page) return;
      setPatientsLoading(true);
      setError(null);
      try {
        const result = await clinicService.listClinicPatients(clinicId, {
          status: "ACTIVE",
          search: normalizedSearch || undefined,
          page,
          limit: 25,
        });
        if (patientRequestGeneration.current !== generation) return;
        setPatientSearch(normalizedSearch);
        setPatients((current) =>
          append
            ? [
                ...current,
                ...result.items.filter(
                  (item) =>
                    !current.some((existing) => existing.id === item.id),
                ),
              ]
            : result.items,
        );
        setPatientPageInfo(result.pageInfo);
      } catch (searchError: unknown) {
        if (patientRequestGeneration.current !== generation) return;
        setError(
          searchError instanceof Error
            ? searchError.message
            : "No se pudo buscar pacientes.",
        );
      } finally {
        if (patientRequestGeneration.current === generation)
          setPatientsLoading(false);
      }
    },
    [clinicId, patientPageInfo.nextPage],
  );

  return {
    overview,
    agreements,
    specialists,
    services,
    patients,
    patientPageInfo,
    patientSearch,
    patientsLoading,
    periodPreview,
    ledger,
    ledgerNextCursor,
    agreementForm,
    loading,
    saving,
    error,
    role,
    selectedPeriod,
    setSelectedPeriod,
    setAgreementForm,
    retry: load,
    createAgreement,
    searchPatients,
    loadMorePatients: () => searchPatients(patientSearch, true),
    loadMoreLedger: async () => {
      if (!ledgerNextCursor) return;
      const generation = ledgerRequestGeneration.current + 1;
      ledgerRequestGeneration.current = generation;
      try {
        const page = await clinicService.listClinicFinancialLedger(clinicId, {
          cursor: ledgerNextCursor,
          limit: 50,
        });
        if (ledgerRequestGeneration.current !== generation) return;
        setLedger((current) => [
          ...current,
          ...page.items.filter(
            (item) => !current.some((existing) => existing.id === item.id),
          ),
        ]);
        setLedgerNextCursor(page.nextCursor);
      } catch (loadError: unknown) {
        if (ledgerRequestGeneration.current !== generation) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar más actividad financiera.",
        );
      }
    },
    openDocument: (documentId: string) =>
      clinicService.openClinicFinancialDocument(clinicId, documentId),
    activateAgreement: (
      versionId: string,
      expectedVersion: number,
      reason: string,
    ) =>
      runAction((idempotencyKey) =>
        clinicService.activateClinicFinanceAgreement(
          clinicId,
          versionId,
          expectedVersion,
          reason,
          idempotencyKey,
        ),
        `activate-agreement:${versionId}:${expectedVersion}:${reason}`,
      ),
    closePeriod: () =>
      periodPreview
      ? runAction(
        (idempotencyKey) =>
          clinicService.closeClinicFinancialPeriod(
            clinicId,
            selectedPeriod.year,
            selectedPeriod.month,
            periodPreview.previewFingerprint,
            idempotencyKey,
          ),
        `close-period:${clinicId}:${selectedPeriod.year}-${selectedPeriod.month}:${periodPreview.previewFingerprint}`,
      )
      : Promise.resolve(false),
    resolveBlockedSession: (
      sessionId: string,
      payload: clinicService.SessionEconomicRevisionPayload,
    ) =>
      runAction(
        (idempotencyKey) =>
          clinicService.reviseClinicSessionEconomics(
            clinicId,
            sessionId,
            payload,
            idempotencyKey,
          ),
        `revise-session-economics:${sessionId}:${JSON.stringify(payload)}`,
      ),
    previewBlockedSession: (
      sessionId: string,
      payload: clinicService.SessionEconomicRevisionPayload,
    ) =>
      clinicService.previewClinicSessionEconomicRevision(
        clinicId,
        sessionId,
        payload,
      ),
    createPatientInvoice: (
      sessionId: string,
      invoiceKind: clinicService.ClinicInvoiceKind,
      vatRateBasisPoints: number,
      vatExemptReason: string | null,
    ) =>
      runAction((idempotencyKey) =>
        clinicService.createWorkflowPatientInvoice(
          clinicId,
          sessionId,
          { invoiceKind, vatRateBasisPoints, vatExemptReason },
          idempotencyKey,
        ),
        `create-patient-invoice:${sessionId}:${invoiceKind}:${vatRateBasisPoints}:${vatExemptReason ?? ""}`,
      ),
    issuePatientInvoice: (invoiceId: string) =>
      runAction(
        (idempotencyKey) =>
          clinicService.issueWorkflowPatientInvoice(
            clinicId,
            invoiceId,
            idempotencyKey,
          ),
        `issue-patient-invoice:${invoiceId}`,
      ),
    discardPatientInvoiceDraft: (invoiceId: string) => {
      const reason = "Borrador descartado por administración antes de su emisión";
      return runAction(
        (idempotencyKey) =>
          clinicService.discardWorkflowPatientInvoiceDraft(
            clinicId,
            invoiceId,
            reason,
            idempotencyKey,
          ),
        `discard-patient-invoice-draft:${invoiceId}:${reason}`,
      );
    },
    deliverPatientInvoice: (invoiceId: string) =>
      runAction(
        (idempotencyKey) =>
          clinicService.deliverWorkflowPatientInvoice(
            clinicId,
            invoiceId,
            idempotencyKey,
          ),
        `deliver-patient-invoice:${invoiceId}`,
      ),
    createPatientRectification: (invoiceId: string, reason: string) =>
      runAction((idempotencyKey) =>
        clinicService.createWorkflowPatientInvoiceRectification(
          clinicId,
          invoiceId,
          reason,
          idempotencyKey,
        ),
        `create-patient-rectification:${invoiceId}:${reason}`,
      ),
    recordPatientCollection: (
      invoiceId: string,
      amountCents: number,
      method: clinicService.ClinicPaymentMethod,
      externalReference: string | null,
      effectiveAt: string,
      administrativeNote: string | null,
    ) =>
      runAction(
        (idempotencyKey) =>
          clinicService.recordPatientCollection(
            clinicId,
            invoiceId,
            {
              amountCents,
              method,
              effectiveAt,
              externalReference,
              administrativeNote,
            },
            idempotencyKey,
          ),
        `patient-collection:${invoiceId}:${amountCents}:${method}:${effectiveAt}:${externalReference ?? ""}:${administrativeNote ?? ""}`,
      ),
    recordPatientRefund: (
      invoiceId: string,
      originalMovementId: string,
      amountCents: number,
      method: clinicService.ClinicPaymentMethod,
      externalReference: string | null,
      effectiveAt: string,
      administrativeNote: string | null,
    ) =>
      runAction(
        (idempotencyKey) =>
          clinicService.recordPatientRefund(
            clinicId,
            invoiceId,
            {
              amountCents,
              method,
              effectiveAt,
              externalReference,
              administrativeNote,
              originalMovementId,
            },
            idempotencyKey,
          ),
        `patient-refund:${invoiceId}:${originalMovementId}:${amountCents}:${method}:${effectiveAt}:${externalReference ?? ""}:${administrativeNote ?? ""}`,
      ),
    reviewProfessionalInvoice: (
      invoiceId: string,
      expectedVersion: number,
      decision: "ACCEPT" | "REQUEST_CORRECTION",
      reason?: string,
    ) =>
      runAction((idempotencyKey) =>
        clinicService.reviewClinicProfessionalInvoice(
          clinicId,
          invoiceId,
          { decision, reason, expectedVersion },
          idempotencyKey,
        ),
        `review-professional-invoice:${invoiceId}:${expectedVersion}:${decision}:${reason ?? ""}`,
      ),
    recordProfessionalPayment: (
      statementId: string,
      amountCents: number,
      withheldAmountCents: number,
      method: clinicService.ClinicPaymentMethod,
      externalReference: string | null,
      effectiveAt: string,
      administrativeNote: string | null,
    ) =>
      runAction(
        (idempotencyKey) =>
          clinicService.registerClinicProfessionalPayment(
            clinicId,
            statementId,
            {
              transferredAmountCents: amountCents,
              withheldAmountCents,
              method,
              effectiveAt,
              externalReference,
              administrativeNote,
            },
            idempotencyKey,
          ),
        `professional-payment:${statementId}:${amountCents}:${withheldAmountCents}:${method}:${effectiveAt}:${externalReference ?? ""}:${administrativeNote ?? ""}`,
      ),
    createAdjustment: (
      payload: Parameters<
        typeof clinicService.createClinicFinancialAdjustment
      >[1],
    ) =>
      runAction(
        (idempotencyKey) =>
          clinicService.createClinicFinancialAdjustment(
            clinicId,
            payload,
            idempotencyKey,
          ),
        `financial-adjustment:${JSON.stringify(payload)}`,
      ),
  };
};
