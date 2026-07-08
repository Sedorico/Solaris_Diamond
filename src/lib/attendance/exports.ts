/**
 * Client-side report exports for Attendance — CSV, Excel (SpreadsheetML) and a
 * printable HTML report (Print → Save as PDF). Self-contained: no dependency on
 * any other Solaris module and no heavyweight export libraries.
 */

import type { AttendanceStatus, ReportSummaryDTO } from "@/lib/attendance/types";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PENDING: "Pending",
  PRESENT: "Present",
  LATE: "Late",
  ABSENT: "Absent",
  REJECTED: "Rejected",
};

const PERIOD_LABEL: Record<string, string> = {
  daily: "Daily Report",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
  custom: "Custom Date Report",
};

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

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

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();
const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—";
const fmtHours = (h: number | null) => (h != null ? `${h.toFixed(1)}h` : "—");

function fileStamp(report: ReportSummaryDTO): string {
  return `${report.rangeFrom.slice(0, 10)}-to-${report.rangeTo.slice(0, 10)}`;
}

// --- CSV --------------------------------------------------------------------

export function buildAttendanceCsv(report: ReportSummaryDTO): {
  body: string;
  filename: string;
} {
  const rows: string[] = [
    "Date,Employee,Employee ID,Department,Time In,Time Out,Working Hours,Attendance Status",
  ];
  for (const r of report.rows) {
    rows.push(
      [
        fmtDate(r.workDate),
        csvCell(r.employeeName),
        csvCell(r.employeeCode),
        csvCell(r.departmentName ?? "—"),
        fmtTime(r.timeIn),
        fmtTime(r.timeOut),
        r.workingHours != null ? r.workingHours.toFixed(2) : "",
        STATUS_LABEL[r.status],
      ].join(","),
    );
  }
  rows.push("");
  rows.push(`Present,${report.present}`);
  rows.push(`Late,${report.late}`);
  rows.push(`Absent,${report.absent}`);
  rows.push(`Rejected,${report.rejected}`);
  rows.push(`Pending,${report.pending}`);
  rows.push(`Attendance %,${report.attendancePercentage}`);
  rows.push(`Average Working Hours,${report.averageWorkingHours}`);
  return {
    body: "﻿" + rows.join("\r\n"),
    filename: `solaris-attendance-${fileStamp(report)}.csv`,
  };
}

// --- Excel (SpreadsheetML .xls) --------------------------------------------

export function buildAttendanceXls(
  report: ReportSummaryDTO,
  businessName: string,
): { body: string; filename: string } {
  const cell = (v: string | number, type: "String" | "Number" = "String") =>
    type === "Number"
      ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>`
      : `<Cell><Data ss:Type="String">${escapeXml(String(v))}</Data></Cell>`;

  const rowsXml = report.rows
    .map(
      (r) => `<Row>
        ${cell(fmtDate(r.workDate))}
        ${cell(r.employeeName)}
        ${cell(r.employeeCode)}
        ${cell(r.departmentName ?? "—")}
        ${cell(fmtTime(r.timeIn))}
        ${cell(fmtTime(r.timeOut))}
        ${r.workingHours != null ? cell(r.workingHours, "Number") : cell("")}
        ${cell(STATUS_LABEL[r.status])}
      </Row>`,
    )
    .join("");

  const body = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Attendance">
  <Table>
   <Row><Cell><Data ss:Type="String">${escapeXml(businessName)} — ${PERIOD_LABEL[report.period] ?? "Attendance Report"}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">${new Date(report.rangeFrom).toDateString()} — ${new Date(report.rangeTo).toDateString()}</Data></Cell></Row>
   <Row/>
   <Row>
    ${cell("Date")}${cell("Employee")}${cell("Employee ID")}${cell("Department")}${cell("Time In")}${cell("Time Out")}${cell("Working Hours")}${cell("Attendance Status")}
   </Row>
   ${rowsXml}
   <Row/>
   <Row>${cell("Present")}${cell(report.present, "Number")}</Row>
   <Row>${cell("Late")}${cell(report.late, "Number")}</Row>
   <Row>${cell("Absent")}${cell(report.absent, "Number")}</Row>
   <Row>${cell("Rejected")}${cell(report.rejected, "Number")}</Row>
   <Row>${cell("Pending")}${cell(report.pending, "Number")}</Row>
   <Row>${cell("Attendance %")}${cell(report.attendancePercentage, "Number")}</Row>
   <Row>${cell("Avg Working Hours")}${cell(report.averageWorkingHours, "Number")}</Row>
  </Table>
 </Worksheet>
</Workbook>`;
  return { body, filename: `solaris-attendance-${fileStamp(report)}.xls` };
}

// --- Printable HTML (→ PDF) -------------------------------------------------

export function buildAttendancePrintHtml(
  report: ReportSummaryDTO,
  businessName: string,
): string {
  const generatedAt = new Date();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${PERIOD_LABEL[report.period] ?? "Attendance Report"} — ${escapeHtml(businessName)}</title>
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
  @media print { body{padding:32px} }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="sun">SOLARIS — DIAMOND</div>
    <h1>${PERIOD_LABEL[report.period] ?? "Attendance Report"}</h1>
    <p style="margin:2px 0;color:#444">${escapeHtml(businessName)}</p>
  </div>
  <div class="meta">
    <div>${new Date(report.rangeFrom).toDateString()} — ${new Date(report.rangeTo).toDateString()}</div>
    <div>Generated ${generatedAt.toLocaleString()}</div>
  </div>
</div>

<h2>Attendance Summary</h2>
<div class="summary">
  <div class="card"><div class="label">Present</div><div class="val">${report.present}</div></div>
  <div class="card"><div class="label">Late</div><div class="val">${report.late}</div></div>
  <div class="card"><div class="label">Absent</div><div class="val">${report.absent}</div></div>
  <div class="card"><div class="label">Rejected</div><div class="val">${report.rejected}</div></div>
  <div class="card"><div class="label">Pending</div><div class="val">${report.pending}</div></div>
  <div class="card"><div class="label">Attendance %</div><div class="val">${report.attendancePercentage}%</div></div>
  <div class="card"><div class="label">Avg Hours</div><div class="val">${report.averageWorkingHours}h</div></div>
  <div class="card"><div class="label">Total Employees</div><div class="val">${report.totalEmployees}</div></div>
</div>

<h2>Employee Records</h2>
<table>
  <thead><tr>
    <th>Date</th><th>Employee</th><th>ID</th><th>Department</th>
    <th>Time In</th><th>Time Out</th><th class="num">Hours</th><th>Status</th>
  </tr></thead>
  <tbody>
    ${report.rows
      .map(
        (r) => `<tr>
          <td>${fmtDate(r.workDate)}</td>
          <td>${escapeHtml(r.employeeName)}</td>
          <td>${escapeHtml(r.employeeCode)}</td>
          <td>${escapeHtml(r.departmentName ?? "—")}</td>
          <td>${fmtTime(r.timeIn)}</td>
          <td>${fmtTime(r.timeOut)}</td>
          <td class="num">${fmtHours(r.workingHours)}</td>
          <td>${STATUS_LABEL[r.status]}</td>
        </tr>`,
      )
      .join("")}
  </tbody>
</table>

<div class="footer">
  Generated by Solaris Diamond — Attendance Tracking. Records are scoped to ${escapeHtml(businessName)} and never include data from other businesses.
</div>
</body>
</html>`;
}

// --- Download / print helpers ----------------------------------------------

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
