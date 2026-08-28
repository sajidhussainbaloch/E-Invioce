# Shopkeeper's Complete Guide — Invoice Bank + FBR

Plain-language guide: how to use the app, how to sell, and how to connect to FBR
(Government of Pakistan tax system). Written for a shop owner, not an IT person.

---

## Part A — What you have and how to sell

You are running **Invoice Bank** on your own computer. Open your browser and go to
`http://localhost:5173`. Log in with your account.

### 1. The two windows (servers)
Two black windows must stay open while you use the app:
- `IB-API` (the computer brain — holds your data)
- `IB-WEB` (the shop screen — what you look at)

If you close them, the app stops. Just start them again and you're back.

### 2. One-time setup (fill this once)
The **business form** (the NTN one that confused you). Fill it once and save:
- **Business name** — your shop name (goes on every invoice)
- **NTN** — your tax number, e.g. `1234567-8` (optional for now, needed for FBR)
- **Address / phone / email** — appear on your invoice paper

After saving you land on the Dashboard. You don't fill this again.

### 3. Daily selling — the summary

| Do this | Where | What happens |
|---|---|---|
| Add your products | `Products` tab → Add product | Name, price, tax (default 18%), SKU, optional barcode |
| Add your customers | `Customers` tab → Add customer | Name, phone, optional NTN |
| **Sell fast** | **`Quick Sell`** tab → pick customer → Scan barcode / pick item → **Issue invoice now** | Invoice made + numbered in one click |
| Full invoice | `Invoices` tab → New invoice | More detail, then **Issue** |
| Give the bill | Download the **PDF** | Print it or WhatsApp it |

**Scanning a barcode that has no product:** the app asks you to name + price it,
saves it as a product automatically, and adds it to the sale. You are never stuck.

### 4. Invoice numbers
Invoices are numbered automatically per business: `SHOP-000001`, `SHOP-000002`, ...
Only invoices you click **Issue** on get the next number. That's the number the
government wants.

---

## Part B — The FBR part (Pakistan government)

### 5. What FBR is
**FBR** = Federal Board of Revenue — Pakistan's tax collection agency. Since
**1 July 2025** (law **SRO 709(I)/2025**), every tax invoice must show a
**22-digit FBR number** and a **QR code**, and sales must be reported to FBR.
Basically: the government wants to see your sales, in real time.

### 6. Why iris.fbr.gov.pk only shows "Login"
Because **IRIS is for people who already have an NTN**. It is not a normal
"sign up with email" website. There are two cases:

- **You already have an NTN (active taxpayer):** go to `iris.fbr.gov.pk` and log in
  with that number + password. You don't create a new account — your NTN is your login.
- **You do NOT have an NTN yet:** use the **"New Registration"** link (or
  **e-Enrollment**) on the same page. You register **using your 13-digit CNIC** —
  your CNIC is validated against NADRA, you get OTPs on your phone/email, set a
  password + 4-digit PIN, and after approval you get your **NTN**.

So: the reason you only see login is that the real registration is done **through
your CNIC/NTN**, not through an email sign-up form. That's how FBR works.

### 7. What you must create before connecting FBR (checklist)

| Item | What it is | Where to get it | Cost |
|---|---|---|---|
| **NTN** | National Tax Number, e.g. `1234567-8` | IRIS → New Registration / e-Enrollment using CNIC | Free |
| **Sales Tax Registration (STRN)** | Needed for digital invoicing | IRIS, after you have NTN | Free |
| **IRIS login** | Your login to iris.fbr.gov.pk | With your NTN + password | Free |
| **Licensed Integrator = PRAL** | The "connector" company, chosen from dropdown in IRIS | IRIS → Digital Invoicing → choose PRAL | Free (other companies may charge Rs. 1,500–10,000/month) |
| **IP whitelisting** | Your internet address (max 3 IPs) so FBR knows who's sending invoices | IRIS form (there's an Excel template for multiple IPs) | Free, approved in ~2 working hours |
| **API token** | A long security string (Bearer token, valid 5 years) | Generated in IRIS after approval | Free |

### 8. Step by step: connecting to FBR

1. Make sure you have an **NTN** (and sales tax registration). If not, do Part B point 6 first.
2. Log in to **iris.fbr.gov.pk** with your NTN.
3. From the dashboard choose **Digital Invoicing** (look for "Digital Invoice" menu).
4. Fill the **registration form**: contact person (name, mobile, email), your
   software is "Invoice Bank – On-Premises", choose business nature/sector.
5. Choose **PRAL** as Licensed Integrator (free).
6. Submit **IP whitelisting** — give the IP of the computer running the shop app.
   To know your IP, ask whoever set up the internet, or run this later when we build
   the FBR settings page in the app.
7. **Wait ~2 working hours** for IP approval.
8. Get the **API token** (sandbox first for testing, production later for real money).
9. In the app: paste the token into the FBR Settings page (to be built), run the
   sandbox tests, then switch to production.

### 9. Sandbox vs Production
- **Sandbox** = practice. FBR gives you a fake/test token, you send test invoices
  until all 28 test scenarios pass. Nothing is "real".
- **Production** = real life. Your real invoices are reported to FBR and carry the
  official 22-digit number + QR.

---

## Part C — What Invoice Bank can do today and what is left

### Already working (no extra work for you)

- Capture business **NTN** + registration details.
- **HS code** on each product (a required field in FBR's system).
- **GST per line** — 18% by default, changeable per product.
- **Sequential invoice numbers** — new number only on "Issue".
- Clean **PDF invoice** for every issued invoice (with draft watermark option).
- **Customer catalogue** with NTN (buyer info FBR wants).
- **Barcode scanning + Quick Sell** — the fast counter flow you now have.

### Still needed (not built yet)

| # | Piece | What it does |
|---|---|---|
| 1 | **FBR token storage** | A Settings page in the app where you paste your FBR token |
| 2 | **Gateway client** | The app's auto-send that POSTs each issued invoice to `gw.fbr.gov.pk` |
| 3 | **QR + 22-digit FBR number on PDF** | Print the FBR number and QR code on your invoice PDF |
| 4 | **Retry queue** | If internet/FBR is down, the app keeps selling, queues invoices, sends them later |
| 5 | **Sandbox test helper** | A screen that runs the 28 FBR test scenarios and shows pass/fail |
| 6 | **Cancel / return flows** | Special handling for refunds and cancelled sales (FBR requires it) |

### What YOU (or the customer) create; what I build

**You create (on FBR's website):**
1. NTN (with CNIC) — if you don't have one.
2. Sales Tax registration.
3. Digital Invoicing registration in IRIS with PRAL as integrator.
4. IP whitelisting.
5. Get the API token(s).

**I build (in the app):** items 1–6 in the table above.

---

## Part D — Quick answers

- **"Why only login on iris.fbr.gov.pk?"**
  Because IRIS is for existing taxpayers. New registration is done with your CNIC,
  not an email form. Look for the **New Registration** / **e-Enrollment** link.
- **"What's free?"** Everything on the government side is free: NTN, IRIS, PRAL,
  IP whitelisting, API token. Some third-party integrator companies charge a monthly
  fee, but PRAL is free.
- **"How long?"** IP approval ~2 working hours; full registration usually a few days.
- **"Is my shop already compliant?"** You already produce tax-ready invoices
  (NTN + HS code + GST + numbered + PDF). To be fully FBR-compliant, finish Part B
  and the 6 build items in Part C.
- **"Do I need internet?"** The app works fully offline for normal selling. Internet
  is only needed for the FBR submission step (and re-installing the app).