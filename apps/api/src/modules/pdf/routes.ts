import { promises as fs } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import PDFDocument from "pdfkit";
import { businesses } from "../../db/schema.js";
import { db } from "../../db/index.js";
import { requireBusiness } from "../auth/service.js";
import { uploadsDir } from "../business/routes.js";

const SAMPLE_ITEMS = [
  { name: "Laptop", qty: 2, price: 120000 },
  { name: "Mouse", qty: 5, price: 2000 },
];

export async function pdfRoutes(app: FastifyInstance) {
  app.get("/api/sample/invoice.pdf", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const query = request.query as { watermark?: string };
    const watermark = query.watermark !== "0";

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));

    if (watermark) {
      drawWatermark(doc, "DRAFT");
    }

    let logoBuffer: Buffer | null = null;
    if (business.logoPath) {
      try {
        const relative = business.logoPath.replace(/^\/uploads\//, "");
        logoBuffer = await fs.readFile(path.join(uploadsDir, relative));
      } catch {
        logoBuffer = null;
      }
    }

    const MONEY = (n: number) =>
      `Rs. ${(n / 1000 >= 1 ? n.toLocaleString("en-US") : n.toString())}`;

    doc.fontSize(10).fillColor("#666").text("INVOICE BANK", 50, 45, { align: "right" });

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, 60, { width: 72 });
      } catch {
        // ignore malformed logo
      }
      doc.fontSize(16).fillColor("#111").text(business.name, 140, 66, { width: 400 });
    } else {
      doc.fontSize(16).fillColor("#111").text(business.name, 50, 60);
    }

    doc.moveDown(0.5);
    doc
      .fontSize(9)
      .fillColor("#555")
      .text(
        [
          business.address ?? "",
          business.phone ? `Phone: ${business.phone}` : "",
          business.ntn ? `NTN: ${business.ntn}` : "",
          business.taxRegistration ? `Tax Reg: ${business.taxRegistration}` : "",
          business.email ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
        50,
        88,
      );

    doc
      .fontSize(20)
      .fillColor("#111")
      .text("INVOICE", 50, 170, { align: "right", width: 496 });

    doc.moveTo(50, 205).lineTo(545, 205).strokeColor("#ddd").stroke();

    doc.fontSize(10).fillColor("#555").text("Bill To", 50, 220);
    doc.fontSize(11).fillColor("#111").text("ABC Traders", 50, 234);
    doc.fontSize(9).fillColor("#555").text("NTN: 1234567-8\nThe seller is not responsible for any typographical errors.\nCustomer delivery address line.", 50, 250);

    doc.fontSize(10).fillColor("#555").text("Invoice No", 420, 220);
    doc.fontSize(11).fillColor("#111").text("INV-000001", 450, 220, { align: "right", width: 95 });
    doc.fontSize(10).fillColor("#555").text("Date", 420, 240);
    doc.fontSize(11).fillColor("#111").text(new Date().toLocaleDateString("en-GB"), 440, 240, { align: "right", width: 105 });

    let y = 285;
    doc.fontSize(9).fillColor("#888").text("Description", 50, y);
    doc.text("Qty", 340, y, { align: "right", width: 60 });
    doc.text("Unit Price", 400, y, { align: "right", width: 70 });
    doc.text("Amount", 470, y, { align: "right", width: 75 });
    y += 18;

    doc.moveTo(50, y).lineTo(545, y).strokeColor("#eee").stroke();
    y += 8;

    doc.fontSize(10).fillColor("#222");
    const subtotal = SAMPLE_ITEMS.reduce((sum, it) => sum + it.qty * it.price, 0);
    for (const item of SAMPLE_ITEMS) {
      doc.text(item.name, 55, y);
      doc.text(String(item.qty), 340, y, { align: "right", width: 60 });
      doc.text(MONEY(item.price), 400, y, { align: "right", width: 70 });
      doc.text(MONEY(item.qty * item.price), 470, y, { align: "right", width: 75 });
      y += 20;
    }

    doc.moveTo(50, y + 2).lineTo(545, y + 2).strokeColor("#ddd").stroke();
    y += 16;

    const discount = 10000;
    const taxable = subtotal - discount;
    const taxRate = 0.18;
    const tax = taxable * taxRate;
    const total = taxable + tax;

    const rows: Array<[string, string]> = [
      ["Subtotal", MONEY(subtotal)],
      ["Discount", `- ${MONEY(discount)}`],
      ["Taxable Amount", MONEY(taxable)],
      ["Sales Tax (18%)", MONEY(tax)],
    ];
    for (const [label, value] of rows) {
      doc.fontSize(10).fillColor("#555").text(label, 400, y, { align: "right", width: 145 });
      doc.fontSize(10).fillColor("#111").text(value, 440, y, { align: "right", width: 105 });
      y += 16;
    }

    doc.moveTo(350, y).lineTo(545, y).strokeColor("#111").lineWidth(1).stroke();
    doc.moveTo(350, y + 2).lineTo(545, y + 2).strokeColor("#111").lineWidth(2).stroke();
    doc
      .fontSize(12)
      .fillColor("#111")
      .text("Total", 400, y + 12, { align: "right", width: 145 });
    doc.fontSize(12).fillColor("#111").text(MONEY(total), 440, y + 12, { align: "right", width: 105 });

    doc.fontSize(8).fillColor("#999").text("Sample invoice · Invoice Bank demo", 50, 780);
    doc.fontSize(8).fillColor("#999").text("FBR reference number and QR code will appear here after FBR integration.", 50, 794);

    doc.end();
    await new Promise<void>((resolve) => doc.on("end", () => resolve()));

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", 'attachment; filename="sample-invoice.pdf"');
    return reply.send(Buffer.concat(chunks));
  });
}

function drawWatermark(doc: PDFKit.PDFDocument, text: string) {
  doc.save();
  doc.rotate(-35, { origin: [doc.page.width / 2, doc.page.height / 2] });
  doc
    .fontSize(72)
    .fillColor("#e5e5e5")
    .fillOpacity(0.35)
    .text(text, doc.page.width / 2 - 140, doc.page.height / 2 - 40, { align: "center", width: 280 });
  doc.restore();
}