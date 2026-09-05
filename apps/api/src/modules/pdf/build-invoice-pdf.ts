import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { Business, Settings } from "../../db/schema.js";
import { formatRs } from "../../utils/money.js";

export type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: Date;
  fbrNumber?: string | null;
  fbrSubmittedAt?: Date | null;
  customer: {
    name: string;
    ntn?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPricePaisa: number;
    amountPaisa: number;
  }>;
  subtotalPaisa: number;
  discountPaisa: number;
  taxablePaisa: number;
  taxPaisa: number;
  totalPaisa: number;
  billToExtra?: string[];
  footerNote?: string;
};

export async function buildInvoicePdf(opts: {
  business: Business;
  settings: Settings | null;
  logoBuffer: Buffer | null;
  data: InvoicePdfData;
}): Promise<Buffer> {
  const { business, settings, logoBuffer, data } = opts;

  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  if (settings?.watermarkEnabled !== false) {
    if (settings?.watermarkMode === "logo" && logoBuffer) {
      drawLogoWatermark(doc, logoBuffer);
    } else {
      drawWatermark(doc, settings?.watermarkText || "DRAFT");
    }
  }

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
        business.ntn ? `FBR No: ${business.ntn}` : "",
        business.salesTaxRegistered && business.taxRegistration ? `STRN: ${business.taxRegistration}` : "",
        business.email ?? "",
      ]
        .filter(Boolean)
        .join("\n"),
      50,
      88,
    );

  doc.fontSize(20).fillColor("#111").text("INVOICE", 50, 170, { align: "right", width: 496 });

  doc.moveTo(50, 205).lineTo(545, 205).strokeColor("#ddd").stroke();

  const billToLines = [
    data.customer.address ?? "",
    data.customer.phone ? `Phone: ${data.customer.phone}` : "",
    data.customer.email ?? "",
    data.customer.ntn ? `NTN: ${data.customer.ntn}` : "",
    ...(data.billToExtra ?? []),
  ].filter(Boolean);

  doc.fontSize(10).fillColor("#555").text("Bill To", 50, 220);
  doc.fontSize(11).fillColor("#111").text(data.customer.name, 50, 234);
  if (billToLines.length > 0) {
    doc.fontSize(9).fillColor("#555").text(billToLines.join("\n"), 50, 250);
  }

  doc.fontSize(10).fillColor("#555").text("Invoice No", 420, 220);
  doc
    .fontSize(11)
    .fillColor("#111")
    .text(data.invoiceNumber, 450, 220, { align: "right", width: 95 });
  doc.fontSize(10).fillColor("#555").text("Date", 420, 240);
  doc
    .fontSize(11)
    .fillColor("#111")
    .text(data.issueDate.toLocaleDateString("en-GB"), 440, 240, { align: "right", width: 105 });

  let y = 285;
  doc.fontSize(9).fillColor("#888").text("Description", 50, y);
  doc.text("Qty", 340, y, { align: "right", width: 60 });
  doc.text("Unit Price", 400, y, { align: "right", width: 70 });
  doc.text("Amount", 470, y, { align: "right", width: 75 });
  y += 18;

  doc.moveTo(50, y).lineTo(545, y).strokeColor("#eee").stroke();
  y += 8;

  doc.fontSize(10).fillColor("#222");
  for (const item of data.items) {
    doc.text(item.description.slice(0, 80), 55, y);
    doc.text(String(item.quantity), 340, y, { align: "right", width: 60 });
    doc.text(formatRs(item.unitPricePaisa), 400, y, { align: "right", width: 70 });
    doc.text(formatRs(item.amountPaisa), 470, y, { align: "right", width: 75 });
    y += 20;
  }

  doc.moveTo(50, y + 2).lineTo(545, y + 2).strokeColor("#ddd").stroke();
  y += 16;

  const rows: Array<[string, string]> = [
    ["Subtotal", formatRs(data.subtotalPaisa)],
    ["Discount", `- ${formatRs(data.discountPaisa)}`],
    ["Taxable Amount", formatRs(data.taxablePaisa)],
    ["Sales Tax", formatRs(data.taxPaisa)],
  ];
  for (const [label, value] of rows) {
    doc.fontSize(10).fillColor("#555").text(label, 400, y, { align: "right", width: 145 });
    doc.fontSize(10).fillColor("#111").text(value, 440, y, { align: "right", width: 105 });
    y += 16;
  }

  doc.moveTo(350, y).lineTo(545, y).strokeColor("#111").lineWidth(1).stroke();
  doc.moveTo(350, y + 2).lineTo(545, y + 2).strokeColor("#111").lineWidth(2).stroke();
  doc.fontSize(12).fillColor("#111").text("Total", 400, y + 12, { align: "right", width: 145 });
  doc.fontSize(12).fillColor("#111").text(formatRs(data.totalPaisa), 440, y + 12, { align: "right", width: 105 });

  doc.fontSize(8).fillColor("#999").text(data.footerNote ?? "Invoice Bank", 50, 780);
  if (data.fbrNumber) {
    const qrData = buildQrData({
      sellerNtn: business.ntn ?? "",
      sellerName: business.name,
      invoiceNumber: data.invoiceNumber,
      fbrNumber: data.fbrNumber,
      invoiceDate: data.issueDate,
      totalPaisa: data.totalPaisa,
    });
    const qrBuffer = await QRCode.toBuffer(qrData, {
      type: "png",
      width: 70,
      margin: 1,
      errorCorrectionLevel: "M",
    });
    try {
      doc.image(qrBuffer, 50, 708, { width: 64 });
    } catch {
      // QR rendering failed — still show the number
    }
    doc
      .fontSize(8)
      .fillColor("#555")
      .text(`FBR No: ${data.fbrNumber}`, 122, 712);
    if (data.fbrSubmittedAt) {
      doc
        .fontSize(8)
        .fillColor("#999")
        .text(
          `Reported to FBR ${data.fbrSubmittedAt.toLocaleString("en-GB")}`,
          122,
          724,
        );
    }
    doc
      .fontSize(7.5)
      .fillColor("#999")
      .text("Scan to verify this invoice with FBR.", 122, 736);
  } else {
    doc
      .fontSize(8)
      .fillColor("#999")
      .text("FBR reference number and QR code will appear here after FBR integration.", 50, 794);
  }

  doc.end();
  await new Promise<void>((resolve) => doc.on("end", () => resolve()));

  return Buffer.concat(chunks);
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

function drawLogoWatermark(doc: PDFKit.PDFDocument, logoBuffer: Buffer) {
  try {
    doc.save();
    const width = 160;
    const x = doc.page.width / 2 - width / 2;
    const y = doc.page.height / 2 - width / 2;
    doc.rotate(-20, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.image(logoBuffer, x, y, { width });
    doc.restore();
  } catch {
    // ignore malformed logo
  }
}

function buildQrData(input: {
  sellerNtn: string;
  sellerName: string;
  invoiceNumber: string;
  fbrNumber: string;
  invoiceDate: Date;
  totalPaisa: number;
}): string {
  const { sellerNtn, sellerName, invoiceNumber, fbrNumber, invoiceDate, totalPaisa } = input;
  const total = totalPaisa / 100;
  return [
    sellerNtn.replace(/[-\s]/g, ""),
    sellerName,
    invoiceNumber,
    fbrNumber,
    invoiceDate.toISOString().slice(0, 10),
    total.toFixed(2),
  ].join("|");
}