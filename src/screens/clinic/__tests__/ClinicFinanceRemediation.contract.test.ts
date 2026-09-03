import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string): string =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

describe("clinic finance production remediation contracts", () => {
  const clinicWorkspace = read("../finance/ClinicFinancialWorkspace.tsx");
  const clinicController = read("../finance/useClinicFinancialWorkspace.ts");
  const professionalPanel = read(
    "../../professional/clinic-finance/ProfessionalClinicFinancePanel.tsx",
  );
  const clinicBilling = read("../ClinicBillingScreen.tsx");
  const financeNavigation = read(
    "../../../components/finance/FinanceSectionNavigation.tsx",
  );
  const simpleDropdown = read("../../../components/common/SimpleDropdown.tsx");
  const visibleScrollView = read(
    "../../../components/common/VisibleScrollView.tsx",
  );
  const focusedActionSheet = read(
    "../../../components/finance/FocusedActionSheet.tsx",
  );
  const clinicScaffold = read("../components/ClinicWorkspaceScaffold.tsx");
  const professionalBilling = read("../../professional/BillingScreen.tsx");
  const financeService = read("../../../services/clinic/financeService.ts");
  const billingController = read("../useClinicBillingController.ts");

  it("uses the shared cross-platform confirmation surface", () => {
    expect(clinicWorkspace).not.toContain("Alert.alert");
    expect(professionalPanel).not.toContain("Alert.alert");
    expect(clinicWorkspace).toContain("useAppAlert");
    expect(professionalPanel).toContain("useAppAlert");
  });

  it("keeps command keys stable across retryable finance actions", () => {
    expect(clinicController).toContain("commandKeys.current.get");
    expect(professionalPanel).toContain("commandKeys.current.get");
    expect(financeService).toContain(
      "idempotencyKey ?? createFinancialCommandKey()",
    );
    expect(clinicController).not.toContain(
      "effectiveAt: new Date().toISOString()",
    );
    expect(clinicWorkspace).toContain('<MadridDateField label="Fecha efectiva"');
  });

  it("supports month selection, blocked-session resolution and signed adjustments", () => {
    expect(clinicWorkspace).toContain("Mes contable");
    expect(clinicWorkspace).toContain("Previsualizar y resolver");
    expect(clinicWorkspace).toContain("Importe del ajuste");
    expect(clinicController).toContain("resolveBlockedSession");
  });

  it("derives paid totals from real transfers and explains zero and credit states", () => {
    expect(professionalPanel).toContain("payment.transferredAmountCents");
    expect(professionalPanel).toContain("NO_PAYMENT_DUE");
    expect(professionalPanel).toContain("CREDIT_CARRY_FORWARD");
    expect(professionalPanel).toContain("REPLACEMENT_PENDING");
    expect(professionalPanel).toContain("finance?.liveSummary");
    expect(professionalPanel).toContain("ACTIVIDAD DEL MES");
    expect(clinicWorkspace).toContain("obligation.collectableCents");
    expect(clinicWorkspace).toContain("obligation.refundableCents");
  });

  it("keeps agreement decisions in Acuerdo and separates projected from generated money", () => {
    expect(professionalPanel).not.toContain('acceptProfessionalClinicAgreement');
    expect(professionalPanel).not.toContain('Aceptar acuerdo');
    expect(professionalPanel).toContain('Previsto en citas');
    expect(professionalPanel).toContain('Generado en sesiones completadas');
    expect(professionalPanel).toContain('economicState');
    expect(clinicWorkspace).toContain('requiredProfessionals');
    expect(clinicWorkspace).toContain('Crear nueva versión');
    expect(clinicWorkspace).toContain('Revisión solicitada');
    expect(clinicWorkspace).toContain('Rechazado');
  });

  it("lets administrators recover an incorrect unissued patient draft safely", () => {
    expect(clinicWorkspace).toContain("Descartar borrador");
    expect(clinicWorkspace).toContain("Se conservará la trazabilidad");
    expect(clinicController).toContain("discardPatientInvoiceDraft");
    expect(financeService).toContain("/discard-draft");
    expect(financeService).toContain('expectedStatus: "DRAFT"');
  });

  it("renders every financial dropdown above clipped cards and action footers", () => {
    for (const source of [
      clinicWorkspace,
      clinicBilling,
      professionalPanel,
      financeNavigation,
    ]) {
      const dropdowns = source.match(/<SimpleDropdown[\s\S]*?\/>/g) ?? [];
      expect(dropdowns.length).toBeGreaterThan(0);
      dropdowns.forEach((dropdown) => {
        expect(dropdown).toContain('presentation="portal"');
      });
    }

    expect(simpleDropdown).toContain("overlayLayers.popoverBackdrop");
    expect(simpleDropdown).toContain("resolvedMaxHeight");
    expect(clinicBilling).not.toContain("dropdownStackTop");
    expect(clinicBilling).not.toContain("dropdownStackMiddle");
  });

  it("keeps scrollbars visible across financial pages, panels and overlays", () => {
    expect(visibleScrollView).toContain("persistentScrollbar={persistentScrollbar}");
    expect(visibleScrollView).toContain("showsHorizontalScrollIndicator={isHorizontal}");
    expect(visibleScrollView).toContain("showsVerticalScrollIndicator={!isHorizontal}");
    expect(visibleScrollView).toContain("scrollbarGutter: 'stable'");
    expect(visibleScrollView).toContain("scrollbarWidth: 'thin'");

    for (const source of [
      clinicBilling,
      focusedActionSheet,
      clinicScaffold,
      professionalBilling,
      simpleDropdown,
    ]) {
      expect(source).toContain("VisibleScrollView");
      expect(source).not.toContain("showsVerticalScrollIndicator={false}");
      expect(source).not.toContain("showsHorizontalScrollIndicator={false}");
    }
  });

  it("keeps secondary finance navigation visible on mobile when it represents pages", () => {
    expect(financeNavigation).toContain("collapseOnMobile = true");
    expect(financeNavigation).toContain("width < 768 && collapseOnMobile");
    expect(clinicBilling).toContain('collapseOnMobile={false}');
    expect(clinicBilling).not.toContain('placeholder="Histórico anterior"');
  });

  it("does not expose HERA activation states or preparation tasks to users", () => {
    for (const source of [clinicWorkspace, professionalPanel, clinicBilling]) {
      expect(source).not.toContain("Pendiente de preparación");
      expect(source).not.toContain("En comprobación");
      expect(source).not.toContain("ClinicFinancialActivationCard");
      expect(source).not.toContain("Solicitar revisión a HERA");
    }
    expect(clinicWorkspace).not.toContain("FINANZAS DE LA CLÍNICA");
    expect(clinicWorkspace).not.toContain("Cada importe, explicado desde su sesión");
  });

  it("keeps clinic finance available without an activation or review flow", () => {
    expect(clinicBilling).not.toContain("Enviar a revisión");
    expect(clinicBilling).not.toContain("activationReadiness");
    expect(clinicBilling).not.toContain("ClinicFinancialActivationCard");
    expect(billingController).not.toContain("handleRequestActivationReview");
    expect(billingController).not.toContain("handleCancelActivationReview");
    expect(financeService).not.toContain("/finance/activation-readiness");
    expect(financeService).not.toContain("/finance/activation-requests");
  });

  it("uses concise product language instead of technical or overexplained copy", () => {
    expect(clinicBilling).toContain("Gestiona el reparto, las facturas y los cobros");
    expect(clinicWorkspace).toContain("Facturas y cobros");
    expect(professionalPanel).toContain("Tu actividad con clínicas");

    for (const source of [clinicBilling, clinicWorkspace, professionalPanel]) {
      expect(source).not.toContain("Emitir no es entregar");
      expect(source).not.toContain("Estado no disponible");
      expect(source).not.toContain("línea(s)");
      expect(source).not.toContain("documento(s)");
      expect(source).not.toContain("bloqueo(s)");
    }
  });
});
