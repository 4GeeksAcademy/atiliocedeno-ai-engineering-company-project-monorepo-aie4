const API_BASE = (window.HEALTHCORE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const form = document.querySelector("#incident-upload-form");
const input = document.querySelector("#incident-file");
const result = document.querySelector("#incident-results");
const tokenField = document.querySelector("#api-token");
let busy = false;
const messages = {
  invalid_file_type: "Select a CSV file.", file_too_large: "The CSV exceeds the 25 MB limit.",
  invalid_encoding: "The CSV must use UTF-8 encoding.", invalid_csv: "The CSV structure is invalid.",
  invalid_headers: "The CSV headers do not match the nine required columns.", empty_file: "The file is empty.",
  analysis_not_found: "No saved analysis is available for this account. Upload a CSV first.",
  analysis_failed: "Analysis failed. Please try again.", export_failed: "Export failed. Please try again.",
};
const ruleLabels = {
  invalid_or_missing_incident_id: "Invalid or missing incident ID", duplicate_incident_id: "Duplicate incident ID",
  invalid_date: "Invalid date", invalid_or_missing_clinic: "Invalid or missing clinic", country_clinic_mismatch: "Country/clinic mismatch",
  invalid_country: "Invalid country", invalid_or_missing_category: "Invalid or missing category", invalid_description: "Missing or short description",
  invalid_status: "Invalid status", invalid_or_missing_patient_id: "Invalid or missing patient ID",
  closed_without_satisfaction_score: "Closed incident without a score", invalid_satisfaction_score: "Invalid satisfaction score",
  invalid_record_structure: "Invalid row structure",
};
function showMessage(message, isError = false) {
  result.replaceChildren();
  const paragraph = document.createElement("p");
  paragraph.className = isError ? "incident-error" : "incident-message";
  paragraph.textContent = message;
  result.append(paragraph);
}
function metric(label, value) {
  const card = document.createElement("article"); card.className = "incident-stat";
  const title = document.createElement("span"); title.textContent = label;
  const count = document.createElement("strong"); count.textContent = String(value);
  card.append(title, count); return card;
}
function renderReport(report) {
  result.replaceChildren();
  const note = document.createElement("p"); note.className = "incident-message";
  note.textContent = "Analysis complete. Only aggregate results are stored for your account.";
  const stats = document.createElement("div"); stats.className = "incident-stats";
  stats.append(metric("Total records", report.total_records), metric("Valid records", report.valid_records),
    metric("Invalid records", report.invalid_records), metric("Average satisfaction", report.average_satisfaction?.toFixed(2) ?? "N/A"));
  result.append(note, stats);
  if (report.invalid_records) {
    const warning = document.createElement("p"); warning.className = "incident-warning"; warning.setAttribute("role", "status");
    warning.textContent = `${report.invalid_records} invalid records excluded from business metrics. Validation rules may overlap.`;
    result.append(warning);
  }
  const breakdown = document.createElement("div"); breakdown.className = "incident-breakdowns";
  for (const [title, values] of [["By category", report.categories], ["By status", report.statuses], ["By country", report.countries],
    [`Satisfaction (${report.closed_with_valid_satisfaction} closed cases)`, report.satisfaction_distribution], ["Validation reasons", report.invalid_breakdown.by_rule]]) {
    const section = document.createElement("section"), heading = document.createElement("h3"), list = document.createElement("ul");
    heading.textContent = title;
    for (const [name, count] of Object.entries(values)) {
      const item = document.createElement("li"); item.textContent = `${ruleLabels[name] || name}: ${count}`; list.append(item);
    }
    section.append(heading, list); breakdown.append(section);
  }
  const exportButton = document.createElement("button"); exportButton.type = "button"; exportButton.className = "button-secondary";
  exportButton.textContent = "Download Results CSV"; exportButton.addEventListener("click", () => submit(true));
  result.append(breakdown, exportButton);
}
async function submit(download = false) {
  if (busy) return;
  const token = tokenField.value.trim(), file = input.files?.[0];
  if (!token || (!download && !file)) { showMessage("Select a CSV file and enter an API access token.", true); return; }
  if (!download && (!file.name.toLowerCase().endsWith(".csv") || file.size > 25_000_000)) {
    showMessage("Select a CSV file no larger than 25 MB.", true); return;
  }
  const options = { method: download ? "GET" : "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" };
  if (!download) { options.body = new FormData(); options.body.append("file", file, "incident-upload.csv"); }
  busy = true; form.setAttribute("aria-busy", "true");
  form.querySelector('button[type="submit"]').disabled = true;
  showMessage(download ? "Preparing results…" : "Analyzing file…");
  try {
    const response = await fetch(`${API_BASE}/api/incidents/${download ? "results/export" : "analyze"}`, options);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      showMessage(response.status === 401 ? "Your access token is invalid or expired. Sign in again." :
        messages[payload?.detail?.code] || "Request failed. Check authorization and file format.", true); return;
    }
    if (download) {
      const blob = await response.blob(), link = document.createElement("a");
      link.href = URL.createObjectURL(blob); link.download = "results.csv"; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      showMessage("Results downloaded. Only aggregate metrics are included.");
    } else { renderReport(await response.json()); }
  } catch { showMessage("Unable to reach the analysis service. Please try again.", true); }
  finally { busy = false; form.setAttribute("aria-busy", "false"); form.querySelector('button[type="submit"]').disabled = false; }
}
form.addEventListener("submit", event => { event.preventDefault(); void submit(); });
tokenField.addEventListener("input", () => { if (!busy) result.replaceChildren(); });
