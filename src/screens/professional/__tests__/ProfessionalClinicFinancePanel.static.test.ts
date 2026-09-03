import fs from "fs";
import path from "path";

const panel = fs.readFileSync(
  path.join(__dirname, "..", "clinic-finance", "ProfessionalClinicFinancePanel.tsx"),
  "utf8",
);

describe("ProfessionalClinicFinancePanel split loading contract", () => {
  it("loads the statement list without the legacy aggregate", () => {
    expect(panel).toContain("listProfessionalClinicFinanceStatements");
    expect(panel).not.toMatch(/clinicService\.getProfessionalClinicFinance\(/);
  });

  it("loads invoices and documents only when a statement is opened", () => {
    expect(panel).toContain("getProfessionalClinicFinanceStatementDetail");
    expect(panel).toContain("Abrir detalle");
    expect(panel).toContain("const detail = statementDetail?.statement.id === summary.id");
  });
});
