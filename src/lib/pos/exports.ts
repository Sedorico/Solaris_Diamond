/**
 * Client-side document builders for the POS — the printable thermal receipt
 * and report exports (CSV, Excel SpreadsheetML, printable HTML → Save as PDF).
 * Self-contained: no heavyweight export libraries.
 */

import type { PosReceiptSnapshot, PosReportDTO } from "@/lib/pos/types";

const PERIOD_LABEL: Record<string, string> = {
  daily: "Daily Sales Report",
  weekly: "Weekly Sales Report",
  monthly: "Monthly Sales Report",
  custom: "Sales Report",
};

const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

const fmtHour = (hour: number) => {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00 ${hour < 12 ? "AM" : "PM"}`;
};

function fileStamp(report: PosReportDTO): string {
  return `${report.rangeFrom.slice(0, 10)}-to-${report.rangeTo.slice(0, 10)}`;
}

// --- Thermal receipt (print / save as PDF) -----------------------------------

export function buildReceiptHtml(receipt: PosReceiptSnapshot): string {
  const when = new Date(receipt.completedAt);
  const rows = receipt.lines
    .map(
      (l) => `<tr>
        <td>${l.qty}× ${escapeHtml(l.name)}</td>
        <td class="r">${peso(l.price)}</td>
        <td class="r">${peso(l.lineTotal)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Receipt ${escapeHtml(receipt.receiptNo)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:12px;color:#000;background:#fff;padding:16px;max-width:320px;margin:0 auto}
  .c{text-align:center}
  .r{text-align:right}
  .b{font-weight:700}
  .divider{border-top:1px dashed #000;margin:8px 0}
  table{width:100%;border-collapse:collapse}
  td{padding:2px 0;vertical-align:top}
  .total td{font-weight:700;font-size:14px;padding-top:4px}
  img.logo{max-width:120px;max-height:64px;object-fit:contain;margin:0 auto 6px;display:block}
  @media print{body{padding:0}}
</style>
</head>
<body>
<div class="c">
  ${receipt.business.logoUrl ? `<img class="logo" src="${receipt.business.logoUrl}" alt="">` : ""}
  <p class="b" style="font-size:16px">${escapeHtml(receipt.business.name)}</p>
  ${receipt.business.address ? `<p>${escapeHtml(receipt.business.address)}</p>` : ""}
  ${receipt.business.contactNumber ? `<p>${escapeHtml(receipt.business.contactNumber)}</p>` : ""}
  ${receipt.headerMessage ? `<p style="margin-top:4px">${escapeHtml(receipt.headerMessage)}</p>` : ""}
</div>
<div class="divider"></div>
<p>Receipt #: <span class="b">${escapeHtml(receipt.receiptNo)}</span></p>
<p>Txn #: ${escapeHtml(receipt.ref)}</p>
<p>Date: ${when.toLocaleDateString("en-PH", { dateStyle: "long" })}</p>
<p>Time: ${when.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</p>
<p>Cashier: ${escapeHtml(receipt.cashier)}</p>
${receipt.customer ? `<p>Customer: ${escapeHtml(receipt.customer)}</p>` : ""}
<div class="divider"></div>
<table>
  <thead><tr><td class="b">Item</td><td class="b r">Price</td><td class="b r">Total</td></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="divider"></div>
<table>
  <tr><td>Subtotal</td><td class="r">${peso(receipt.subtotal)}</td></tr>
  ${receipt.discount > 0 ? `<tr><td>Discount</td><td class="r">−${peso(receipt.discount)}</td></tr>` : ""}
  ${receipt.tax ? `<tr><td>${escapeHtml(receipt.tax.label)}${receipt.tax.included ? " incl." : ""}</td><td class="r">${peso(receipt.tax.amount)}</td></tr>` : ""}
  <tr class="total"><td>TOTAL</td><td class="r">${peso(receipt.total)}</td></tr>
  <tr><td>Paid via</td><td class="r">${escapeHtml(receipt.method)}</td></tr>
  ${receipt.cashReceived != null ? `<tr><td>Cash received</td><td class="r">${peso(receipt.cashReceived)}</td></tr>` : ""}
  ${receipt.change != null ? `<tr><td>Change</td><td class="r">${peso(receipt.change)}</td></tr>` : ""}
</table>
<div class="divider"></div>
<div class="c">
  ${receipt.thankYouMessage ? `<p>${escapeHtml(receipt.thankYouMessage)}</p>` : ""}
  ${receipt.footerMessage ? `<p style="margin-top:4px;font-size:11px">${escapeHtml(receipt.footerMessage)}</p>` : ""}
</div>
</body>
</html>`;
}

// --- Report CSV ---------------------------------------------------------------

export function buildReportCsv(
  report: PosReportDTO,
  businessName: string,
): { body: string; filename: string } {
  const rows: string[] = [
    `${csvCell(businessName)} — ${PERIOD_LABEL[report.period] ?? "Sales Report"}`,
    `Generated,${new Date().toLocaleString("en-PH")}`,
    `Period,${new Date(report.rangeFrom).toLocaleDateString("en-PH")} to ${new Date(report.rangeTo).toLocaleDateString("en-PH")}`,
    "",
    "Revenue Summary",
    `Revenue,${report.revenue}`,
    `Transactions,${report.transactionCount}`,
    `Average Sale,${report.averageSale}`,
    `Items Sold,${report.itemsSold}`,
    `Voided,${report.voidedCount}`,
    "",
    "Best Selling Products",
    "Product,Quantity,Revenue",
    ...report.bestSellers.map((p) => `${csvCell(p.name)},${p.qty},${p.revenue}`),
    "",
    "Top Categories",
    "Category,Quantity,Revenue",
    ...report.topCategories.map((c) => `${csvCell(c.name)},${c.qty},${c.revenue}`),
    "",
    "Payment Methods",
    "Method,Transactions,Revenue",
    ...report.methodBreakdown.map((m) => `${csvCell(m.method)},${m.count},${m.revenue}`),
    "",
    "Sales by Hour",
    "Hour,Transactions,Revenue",
    ...report.peakHours.map((h) => `${fmtHour(h.hour)},${h.count},${h.revenue}`),
    "",
    "Daily Trend",
    "Day,Transactions,Revenue",
    ...report.dailyTrend.map((d) => `${d.day},${d.count},${d.revenue}`),
  ];
  return {
    body: "﻿" + rows.join("\r\n"),
    filename: `solaris-pos-${report.period}-${fileStamp(report)}.csv`,
  };
}

// --- Report Excel (SpreadsheetML) ----------------------------------------------

export function buildReportXls(
  report: PosReportDTO,
  businessName: string,
): { body: string; filename: string } {
  const cell = (v: string | number, type: "String" | "Number" = "String") =>
    type === "Number"
      ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>`
      : `<Cell><Data ss:Type="String">${escapeXml(String(v))}</Data></Cell>`;
  const row = (...cells: string[]) => `<Row>${cells.join("")}</Row>`;

  const section = (
    title: string,
    header: string[],
    rows: (string | number)[][],
  ) =>
    [
      "<Row/>",
      row(cell(title)),
      row(...header.map((h) => cell(h))),
      ...rows.map((r) =>
        row(...r.map((v) => cell(v, typeof v === "number" ? "Number" : "String"))),
      ),
    ].join("");

  const body = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="POS Report">
  <Table>
   ${row(cell(`${businessName} — ${PERIOD_LABEL[report.period] ?? "Sales Report"}`))}
   ${row(cell(`Generated ${new Date().toLocaleString("en-PH")}`))}
   ${row(cell(`${new Date(report.rangeFrom).toDateString()} — ${new Date(report.rangeTo).toDateString()}`))}
   ${section("Revenue Summary", ["Metric", "Value"], [
     ["Revenue", report.revenue],
     ["Transactions", report.transactionCount],
     ["Average Sale", report.averageSale],
     ["Items Sold", report.itemsSold],
     ["Voided", report.voidedCount],
   ])}
   ${section("Best Selling Products", ["Product", "Quantity", "Revenue"],
     report.bestSellers.map((p) => [p.name, p.qty, p.revenue]))}
   ${section("Top Categories", ["Category", "Quantity", "Revenue"],
     report.topCategories.map((c) => [c.name, c.qty, c.revenue]))}
   ${section("Payment Methods", ["Method", "Transactions", "Revenue"],
     report.methodBreakdown.map((m) => [m.method, m.count, m.revenue]))}
   ${section("Sales by Hour", ["Hour", "Transactions", "Revenue"],
     report.peakHours.map((h) => [fmtHour(h.hour), h.count, h.revenue]))}
   ${section("Daily Trend", ["Day", "Transactions", "Revenue"],
     report.dailyTrend.map((d) => [d.day, d.count, d.revenue]))}
  </Table>
 </Worksheet>
</Workbook>`;
  return {
    body,
    filename: `solaris-pos-${report.period}-${fileStamp(report)}.xls`,
  };
}

// --- Report printable HTML (→ PDF) ---------------------------------------------

export function buildReportPrintHtml(
  report: PosReportDTO,
  businessName: string,
): string {
  const generatedAt = new Date();
  const table = (
    title: string,
    header: string[],
    rows: (string | number)[][],
  ) => `
  <h2>${escapeHtml(title)}</h2>
  <table>
    <thead><tr>${header
      .map((h, i) => `<th${i > 0 ? ' class="num"' : ""}>${escapeHtml(h)}</th>`)
      .join("")}</tr></thead>
    <tbody>${rows
      .map(
        (r) =>
          `<tr>${r
            .map(
              (v, i) =>
                `<td${i > 0 ? ' class="num"' : ""}>${escapeHtml(String(v))}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("")}</tbody>
  </table>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${PERIOD_LABEL[report.period] ?? "Sales Report"} — ${escapeHtml(businessName)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Inter',system-ui,sans-serif;color:#1a1a1a;margin:0;padding:48px;background:#fff;line-height:1.5}
  h1{font-family:Georgia,serif;font-size:34px;margin:0 0 4px;letter-spacing:-0.02em}
  h2{font-size:14px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#666;margin:32px 0 12px}
  .header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #ddd;padding-bottom:18px}
  .meta{font-size:12px;color:#666;text-align:right}
  .sun{font-size:13px;letter-spacing:0.4em;color:#b8860b}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:28px}
  .card{border:1px solid #eee;border-radius:8px;padding:16px}
  .card .label{font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#888}
  .card .val{font-family:Georgia,serif;font-size:22px;margin-top:6px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
  th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #eee}
  th{font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#777;font-weight:500}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .footer{margin-top:32px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:14px}
  @media print{body{padding:32px}}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="sun">SOLARIS — DIAMOND</div>
    <h1>${PERIOD_LABEL[report.period] ?? "Sales Report"}</h1>
    <p style="margin:2px 0;color:#444">${escapeHtml(businessName)}</p>
  </div>
  <div class="meta">
    <div>${new Date(report.rangeFrom).toDateString()} — ${new Date(report.rangeTo).toDateString()}</div>
    <div>Generated ${generatedAt.toLocaleString("en-PH")}</div>
  </div>
</div>

<h2>Revenue Summary</h2>
<div class="summary">
  <div class="card"><div class="label">Revenue</div><div class="val">${peso(report.revenue)}</div></div>
  <div class="card"><div class="label">Transactions</div><div class="val">${report.transactionCount}</div></div>
  <div class="card"><div class="label">Average Sale</div><div class="val">${peso(report.averageSale)}</div></div>
  <div class="card"><div class="label">Items Sold</div><div class="val">${report.itemsSold}</div></div>
</div>

${table("Best Selling Products", ["Product", "Qty", "Revenue"], report.bestSellers.map((p) => [p.name, p.qty, peso(p.revenue)]))}
${table("Top Categories", ["Category", "Qty", "Revenue"], report.topCategories.map((c) => [c.name, c.qty, peso(c.revenue)]))}
${table("Payment Methods", ["Method", "Transactions", "Revenue"], report.methodBreakdown.map((m) => [m.method, m.count, peso(m.revenue)]))}
${table("Peak Sales Hours", ["Hour", "Transactions", "Revenue"], report.peakHours.map((h) => [fmtHour(h.hour), h.count, peso(h.revenue)]))}
${table("Daily Trend", ["Day", "Transactions", "Revenue"], report.dailyTrend.map((d) => [d.day, d.count, peso(d.revenue)]))}

<div class="footer">
  Generated by Solaris Diamond — Point of Sale. Records are scoped to ${escapeHtml(businessName)} and never include data from other businesses.
</div>
</body>
</html>`;
}

// --- Download / print helpers ---------------------------------------------------

export function downloadFile(
  filename: string,
  body: string,
  mime = "text/csv;charset=utf-8",
) {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function openPrintWindow(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    try {
      w.print();
    } catch {
      /* user cancelled */
    }
  }, 250);
}
