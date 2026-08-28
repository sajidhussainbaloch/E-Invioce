# FBR Digital Invoicing — Where the connection comes from & how it works

This doc explains the FBR (Federal Board of Revenue) integration to any customer: where the
"connection" actually comes from, what it costs, and how the pieces fit together. It also lists
what Invoice Bank already supports today and what is still needed.

## 1. Why this exists at all

Since **1 July 2025**, FBR mandates **Digital Invoicing (DI)** for all businesses, under
**SRO 709(I)/2025** (SI number on the tax invoice). In practice:

- Every issued tax invoice must carry a **22-digit FBR number** and a **QR code**
  (QR has a specific data format defined by FBR/POS rules).
- Businesses must report sales invoices to FBR in near real time through an approved channel.
- Failure to integrate can mean sales data is not visible to FBR — and eventually invoices
  without the FBR number/QR cannot be claimed as input tax by the buyer.

So the "FBR connection" is your invoice software talking to the Pakistani tax agency, live.

## 2. Where the connection comes from

It is **not a physical device and it is not installed by the government**. It is an
**API (web address + a security token)** issued by FBR to you:

| Piece | What it is | Where it comes from |
|---|---|---|
| **IRIS portal** | FBR's online portal, iris.fbr.gov.pk | The government website you log into |
| **Licensed Integrator (LI)** | The software you choose (e.g. **PRAL**) | PRAL is free; other LIs may charge a monthly fee (~Rs 1,500–10,000/business) |
| **API credentials** | A **Bearer security token** (valid 5 years) | Issued inside IRIS after you pick "API Integration" mode, fill in your ERP/software details and submit |
| **IP whitelisting** (≤3 IPs) | The IP the token is allowed to call from | Submitted in IRIS; usually accepted/rejected within ~2 working hours |

Key point for a shop owner: **the connection is credentials from the FBR portal**, not something
you buy in a shop. Choose **PRAL** as your integrator and it is free of charge.

## 3. How it works (the data flow)

```
Your invoice software
   │  (issued invoice: NTN + seller/buyer + items + prices + HS code + tax)
   ▼
FBR Gateway  http://gw.fbr.gov.pk  (Bearer token decides sandbox vs production)
   │
   ▼
FBR validates the invoice (invoice number, NTN, schema rules)
   │
   ◄──── FBR returns: 22-digit FBR number (+ data to build the QR code)
   ▼
Your software prints the FBR number + QR onto the invoice PDF
```

Phases during setup:

1. **Sandbox (training)**: you get a sandbox token, test the 28 FBR scenario permutations
   (different invoice types, zero-rated, exempt, etc.).
2. **Production**: once the tests pass, production token is enabled and every real issued
   invoice goes through the flow above.

The app must also handle **retries/offline**: if your internet or FBR is down, you keep
selling, queue the invoice, and submit it within the allowed window.

## 4. What Invoice Bank already supports today

Already in the product (no extra work for the shop):

- Business **NTN** + registration details captured (required by the FBR schema).
- **HS codes** on products (required field in the DI payload).
- **GST rate per line** (18% default, configurable per product/invoice line).
- Sequential invoice numbering per business (e.g. `FLOW-000001`), issued next number only on "Issue".
- Clean **PDF invoice** per issued invoice, watermark option for drafts.
- Customer catalog with NTN (buyer info required by the DI schema).

## 5. What is still needed for a real FBR submission

Not yet built (keep this scoped and honest):

1. **Token storage** — store the FBR sandbox/production token per business (Settings).
2. **Gateway client** — a backend module that POSTs each issued invoice to `gw.fbr.gov.pk`
   in the official DI JSON schema and captures the returned 22-digit FBR number + QR.
3. **QR + FBR number on the PDF** — build the QR into the invoice PDF (PDFKit can embed it).
4. **Retry queue** — persist submissions that fail (offline / FBR down) and retry.
5. **Sandbox testing** — a "run the 28 scenarios" helper and status screen.
6. **Cancel/return flows** — FBR requires special handling for credits/cancelled sales.

## 6. Customer-facing summary (what to tell a customer)

- You already get real, tax-ready invoices with your NTN, HS code and GST.
- To go fully FBR-compliant: register at iris.fbr.gov.pk, choose **PRAL** (free) as integrator,
  pick **API Integration**, give the requested software details + your IP, await the ~2h IP
  approval, then test on sandbox and go live.
- Cost: **Rs 0** for the government side. Optional third-party integrators may charge a monthly fee.
- Once integrated, every invoice you issue carries the official 22-digit FBR number and QR,
  and your sales are reported to FBR automatically.