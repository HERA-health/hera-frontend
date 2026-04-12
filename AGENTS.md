# HERA Backend: Agent Guidelines & Architecture (April 2026)

## 1. API Logic Flow & Architecture
Strict adherence to the following request flow:
`src/index.ts` → `routes/` → `controllers/` (Zod Validation) → `src/services/` (Business Logic) → Prisma (Data Access).

### Core Rules:
- **Thin Controllers**: Controllers ONLY handle req/res and Zod parsing. 100% of business logic MUST reside in `src/services/`.
- **SOLID Implementation**: Every service must have a single responsibility (e.g., `matchingService.ts` for algorithms, `billingService.ts` for tax logic).
- **Singleton Prisma**: Use ONLY the client from `src/utils/prisma.ts`. Never re-instantiate.

## 2. Data Protection & Clinical Compliance (GDPR/LOPDGDD)
HERA is a mental health platform. Compliance is the highest priority.
- **Highly Sensitive Data**: Treat all patient notes, specialist profiles, and clinical sessions as sensitive under EU GDPR and Spanish LOPDGDD.
- **PII Protection**: Ensure API responses never leak sensitive fields. Use Zod to explicitly filter output.
- **Audit Logging**: Every access to clinical records must be logged via Pino with the corresponding `userId`.
- **Anonymization**: Any data used for matching or analytics must be strictly anonymized at the service level.

## 3. Database & Type Safety
- **Prisma First**: Always read `prisma/schema.prisma` before proposing changes to controllers or services.
- **Zero-Trust Validation**: Every incoming request must be validated against a Zod schema before hitting the service layer.

## 4. Operational Commands
- **Development**: `npm run dev` (starts nodemon + ts-node).
- **DB Tools**: `npm run prisma:migrate` (migrations), `npm run prisma:studio` (GUI).

## 5. Error Handling & Logging
- **Pino Logger**: Use structured logging for all significant events.
- **Error Wrapping**: Always wrap errors in the `safeError` utility to prevent leaking sensitive info.

## 6. Feature Context
- **Billing**: Handle Spanish IRPF/VAT rules. Sequential ID format: `{prefix}-{year}-{padded3digits}`.
- **Integrations**: Daily.co (video), Discord (internal alerts), Cloudinary (PDF storage).

## 7. Coding Style & Commits
- **TypeScript**: Strict mode. No `any`.
- **Git Safety**: Agent is PROHIBITED from executing 'git push' or 'git commit' without explicit user authorization.