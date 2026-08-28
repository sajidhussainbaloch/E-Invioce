import { promises as fs } from "node:fs";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { invoiceInputSchema } from "@invoice-bank/validation";
import {
  businesses,
  customers,
  invoiceItems,
  invoiceNumbers,
  invoices,
  settings as settingsTable,
} from "../../db/schema.js";
import { db } from "../../db/index.js";
import { rupeesToPaisa, taxPaisa } from "../../utils/money.js";
import { requireBusiness } from "../auth/service.js";
import { uploadsDir } from "../business/routes.js";
import { buildInvoicePdf } from "../pdf/build-invoice-pdf.js";
import { submitInvoiceToFbr } from "../fbr/service.js";

const INV_DIR = "invoices";

async function ensureInvoicesDir(businessId: string): Promise<string> {
  const dir = path.join(uploadsDir, INV_DIR, businessId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function computeTotals(
  lines: Array<{ quantity: number; unitPricePaisa: number; taxRateBp: number }>,
  discountPaisa: number,
) {
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPricePaisa, 0);
  const taxable = Math.max(0, subtotal - discountPaisa);
  const tax = lines.reduce((sum, l) => sum + taxPaisa(l.quantity * l.unitPricePaisa, l.taxRateBp), 0);
  const total = taxable + tax;
  return { subtotalPaisa: subtotal, taxablePaisa: taxable, taxPaisa: tax, totalPaisa: total };
}

function padNumber(n: number): string {
  return String(n).padStart(6, "0");
}

export async function invoiceRoutes(app: FastifyInstance) {
  app.get("/api/invoices", { preHandler: requireBusiness }, async (request) => {
    const businessId = request.auth!.businessId!;
    const query = request.query as { q?: string; status?: string };
    const q = query.q?.trim();
    const status = query.status?.trim();

    const rows = await db
      .select({
        id: invoices.id,
        number: invoices.number,
        status: invoices.status,
        issueDate: invoices.issueDate,
        createdAt: invoices.createdAt,
        totalPaisa: invoices.totalPaisa,
        customerName: customers.name,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(eq(invoices.businessId, businessId), q ? eq(invoices.customerId, customers.id) : undefined))
      .orderBy(desc(invoices.createdAt))
      .limit(200);

    const filtered = q
      ? rows.filter((r) => r.customerName.toLowerCase().includes(q.toLowerCase()) || (r.number ?? "").toLowerCase().includes(q.toLowerCase()))
      : rows;
    const byStatus = status ? filtered.filter((r) => r.status === status) : filtered;

    return { invoices: byStatus };
  });

  app.get("/api/invoices/:id", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const { id } = request.params as { id: string };

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.businessId, businessId)))
      .limit(1);
    if (!invoice) {
      return reply.status(404).send({ message: "Invoice not found" });
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, invoice.customerId))
      .limit(1);
    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id))
      .orderBy(desc(invoiceItems.id));

    return { invoice, customer: customer ?? null, items };
  });

  app.post("/api/invoices", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const body = invoiceInputSchema.parse(request.body);

    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, body.customerId), eq(customers.businessId, businessId)))
      .limit(1);
    if (!customer) {
      return reply.status(400).send({ message: "Customer not found" });
    }

    const discountPaisa = rupeesToPaisa(body.discount);
    const totals = computeTotals(
      body.items.map((it) => ({
        quantity: it.quantity,
        unitPricePaisa: rupeesToPaisa(it.unitPrice),
        taxRateBp: it.taxRateBp,
      })),
      discountPaisa,
    );

    const [invoice] = await db
      .insert(invoices)
      .values({
        businessId,
        customerId: body.customerId,
        createdBy: request.auth!.user.id,
        discountPaisa,
        subtotalPaisa: totals.subtotalPaisa,
        taxablePaisa: totals.taxablePaisa,
        taxPaisa: totals.taxPaisa,
        totalPaisa: totals.totalPaisa,
        notes: body.notes ?? null,
      })
      .returning();

    await db.insert(invoiceItems).values(
      body.items.map((it) => ({
        invoiceId: invoice.id,
        productId: it.productId ?? null,
        description: it.description,
        quantity: it.quantity,
        unitPricePaisa: rupeesToPaisa(it.unitPrice),
        taxRateBp: it.taxRateBp,
        amountPaisa: it.quantity * rupeesToPaisa(it.unitPrice),
      })),
    );

    return reply.status(201).send({ invoice });
  });

  app.patch("/api/invoices/:id", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const { id } = request.params as { id: string };
    const body = invoiceInputSchema.parse(request.body);

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.businessId, businessId)))
      .limit(1);
    if (!invoice) {
      return reply.status(404).send({ message: "Invoice not found" });
    }
    if (invoice.status !== "draft") {
      return reply.status(409).send({ message: "Issued invoices cannot be edited" });
    }

    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, body.customerId), eq(customers.businessId, businessId)))
      .limit(1);
    if (!customer) {
      return reply.status(400).send({ message: "Customer not found" });
    }

    const discountPaisa = rupeesToPaisa(body.discount);
    const totals = computeTotals(
      body.items.map((it) => ({
        quantity: it.quantity,
        unitPricePaisa: rupeesToPaisa(it.unitPrice),
        taxRateBp: it.taxRateBp,
      })),
      discountPaisa,
    );

    const [updated] = await db
      .update(invoices)
      .set({
        customerId: body.customerId,
        discountPaisa,
        subtotalPaisa: totals.subtotalPaisa,
        taxablePaisa: totals.taxablePaisa,
        taxPaisa: totals.taxPaisa,
        totalPaisa: totals.totalPaisa,
        notes: body.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoice.id))
      .returning();

    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
    await db.insert(invoiceItems).values(
      body.items.map((it) => ({
        invoiceId: invoice.id,
        productId: it.productId ?? null,
        description: it.description,
        quantity: it.quantity,
        unitPricePaisa: rupeesToPaisa(it.unitPrice),
        taxRateBp: it.taxRateBp,
        amountPaisa: it.quantity * rupeesToPaisa(it.unitPrice),
      })),
    );

    return { invoice: updated };
  });

  app.delete("/api/invoices/:id", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const { id } = request.params as { id: string };

    const [invoice] = await db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.businessId, businessId)))
      .limit(1);
    if (!invoice) {
      return reply.status(404).send({ message: "Invoice not found" });
    }
    if (invoice.status !== "draft") {
      return reply.status(409).send({ message: "Issued invoices cannot be deleted" });
    }

    await db.delete(invoices).where(eq(invoices.id, id));
    return { ok: true };
  });

  app.post("/api/invoices/:id/issue", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const { id } = request.params as { id: string };

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.businessId, businessId)))
      .limit(1);
    if (!invoice) {
      return reply.status(404).send({ message: "Invoice not found" });
    }
    if (invoice.status !== "draft") {
      return reply.status(409).send({ message: "Invoice is already issued" });
    }

    const [settingsRow] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.businessId, businessId))
      .limit(1);
    const prefix = (settingsRow?.invoicePrefix || "INV").trim() || "INV";

    const result = await db.transaction(async (tx) => {
      const [counter] = await tx
        .select()
        .from(invoiceNumbers)
        .where(eq(invoiceNumbers.businessId, businessId))
        .for("update");

      let number: string;
      if (counter) {
        const next = counter.lastNumber + 1;
        number = `${prefix}-${padNumber(next)}`;
        await tx
          .update(invoiceNumbers)
          .set({ lastNumber: next, prefix })
          .where(eq(invoiceNumbers.businessId, businessId));
      } else {
        number = `${prefix}-${padNumber(1)}`;
        await tx.insert(invoiceNumbers).values({ businessId, prefix, lastNumber: 1 });
      }

      const [issued] = await tx
        .update(invoices)
        .set({ number, status: "issued", issueDate: new Date(), updatedAt: new Date() })
        .where(eq(invoices.id, invoice.id))
        .returning();
      return { issued, number };
    });

    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, invoice.customerId))
      .limit(1);
    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id));

    let logoBuffer: Buffer | null = null;
    if (business.logoPath) {
      try {
        const relative = business.logoPath.replace(/^\/uploads\//, "");
        logoBuffer = await fs.readFile(path.join(uploadsDir, relative));
      } catch {
        logoBuffer = null;
      }
    }

    const pdf = await buildInvoicePdf({
      business,
      settings: settingsRow,
      logoBuffer,
      data: {
        invoiceNumber: result.issued.number!,
        issueDate: result.issued.issueDate ?? new Date(),
        customer: {
          name: customer?.name ?? "Customer",
          ntn: customer?.ntn ?? null,
          address: customer?.address ?? null,
          phone: customer?.phone ?? null,
          email: customer?.email ?? null,
        },
        items: items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPricePaisa: it.unitPricePaisa,
          amountPaisa: it.amountPaisa,
        })),
        subtotalPaisa: result.issued.subtotalPaisa,
        discountPaisa: result.issued.discountPaisa,
        taxablePaisa: result.issued.taxablePaisa,
        taxPaisa: result.issued.taxPaisa,
        totalPaisa: result.issued.totalPaisa,
        footerNote: "Invoice Bank",
      },
    });

    const dir = await ensureInvoicesDir(businessId);
    await fs.writeFile(path.join(dir, `${result.issued.number}.pdf`), pdf);

    // Try to report the invoice to FBR (sandbox/production per settings). Fails
    // silently if not configured — the FBR tab shows a retry queue instead.
    let fbr: Awaited<ReturnType<typeof submitInvoiceToFbr>> | null = null;
    try {
      fbr = await submitInvoiceToFbr(businessId, result.issued.id);
      if (fbr.ok && fbr.fbrNumber) {
        const [withFbr] = await db
          .select()
          .from(invoices)
          .where(eq(invoices.id, result.issued.id))
          .limit(1);
        if (withFbr?.fbrNumber) {
          const pdfWithFbr = await buildInvoicePdf({
            business,
            settings: settingsRow,
            logoBuffer,
            data: {
              invoiceNumber: withFbr.number!,
              issueDate: withFbr.issueDate ?? new Date(),
              fbrNumber: withFbr.fbrNumber,
              fbrSubmittedAt: withFbr.fbrSubmittedAt,
              customer: {
                name: customer?.name ?? "Customer",
                ntn: customer?.ntn ?? null,
                address: customer?.address ?? null,
                phone: customer?.phone ?? null,
                email: customer?.email ?? null,
              },
              items: items.map((it) => ({
                description: it.description,
                quantity: it.quantity,
                unitPricePaisa: it.unitPricePaisa,
                amountPaisa: it.amountPaisa,
              })),
              subtotalPaisa: withFbr.subtotalPaisa,
              discountPaisa: withFbr.discountPaisa,
              taxablePaisa: withFbr.taxablePaisa,
              taxPaisa: withFbr.taxPaisa,
              totalPaisa: withFbr.totalPaisa,
              footerNote: "Invoice Bank",
            },
          });
          await fs.writeFile(path.join(dir, `${withFbr.number}.pdf`), pdfWithFbr);
        }
      }
    } catch {
      // submission is best-effort; invoice remains issued with a queued/failed state
    }

    return { invoice: result.issued, fbr }; 
  });

  app.get("/api/invoices/:id/pdf", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const { id } = request.params as { id: string };

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.businessId, businessId)))
      .limit(1);
    if (!invoice) {
      return reply.status(404).send({ message: "Invoice not found" });
    }
    if (!invoice.number) {
      return reply.status(409).send({ message: "Invoice must be issued before downloading a PDF" });
    }

    const pdfPath = path.join(uploadsDir, INV_DIR, businessId, `${invoice.number}.pdf`);
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="${invoice.number}.pdf"`);
    return reply.send(await fs.readFile(pdfPath));
  });
}