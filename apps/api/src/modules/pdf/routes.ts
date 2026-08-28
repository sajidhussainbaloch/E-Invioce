import { promises as fs } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { businesses, settings as settingsTable } from "../../db/schema.js";
import { db } from "../../db/index.js";
import { requireBusiness } from "../auth/service.js";
import { uploadsDir } from "../business/routes.js";
import { buildInvoicePdf } from "./build-invoice-pdf.js";
import { rupeesToPaisa } from "../../utils/money.js";

const SAMPLE_ITEMS = [
  { name: "Laptop", qty: 2, price: 120000 },
  { name: "Mouse", qty: 5, price: 2000 },
];

export async function pdfRoutes(app: FastifyInstance) {
  app.get("/api/sample/invoice.pdf", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const query = request.query as { watermark?: string };

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    const [settingsRow] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.businessId, businessId))
      .limit(1);

    let logoBuffer: Buffer | null = null;
    if (business.logoPath) {
      try {
        const relative = business.logoPath.replace(/^\/uploads\//, "");
        logoBuffer = await fs.readFile(path.join(uploadsDir, relative));
      } catch {
        logoBuffer = null;
      }
    }

    const subtotal = SAMPLE_ITEMS.reduce((sum, it) => sum + it.qty * it.price, 0);
    const discount = 10000;
    const taxable = subtotal - discount;

    const pdf = await buildInvoicePdf({
      business,
      settings:
        query.watermark === "0"
          ? { ...settingsRow, watermarkEnabled: false }
          : settingsRow,
      logoBuffer,
      data: {
        invoiceNumber: "INV-000001",
        issueDate: new Date(),
        customer: {
          name: "ABC Traders",
          ntn: "1234567-8",
        },
        billToExtra: [
          "The seller is not responsible for any typographical errors.",
          "Customer delivery address line.",
        ],
        items: SAMPLE_ITEMS.map((it) => ({
          description: it.name,
          quantity: it.qty,
          unitPricePaisa: rupeesToPaisa(it.price),
          amountPaisa: rupeesToPaisa(it.qty * it.price),
        })),
        subtotalPaisa: rupeesToPaisa(subtotal),
        discountPaisa: rupeesToPaisa(discount),
        taxablePaisa: rupeesToPaisa(taxable),
        taxPaisa: rupeesToPaisa(taxable * 0.18),
        totalPaisa: rupeesToPaisa(taxable * 1.18),
        footerNote: "Sample invoice — Invoice Bank demo",
      },
    });

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", 'attachment; filename="sample-invoice.pdf"');
    return reply.send(pdf);
  });
}