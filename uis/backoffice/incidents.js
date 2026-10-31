const API_BASE = window.HEALTHCORE_API_URL || "https://healthcore-api.onrender.com";
const form = document.querySelector("#incident-upload-form");
const input = document.querySelector("#incident-file");
const result = document.querySelector("#incident-results");
const tokenField = document.querySelector("#api-token");

function showMessage(message, isError = false) {
  result.replaceChildren();
  const paragraph = document.createElement("p");
  paragraph.className = isError ? "incident-error" : "incident-message";
  paragraph.textContent = message;
  result.append(paragraph);
}

function metric(label, value) {
  const card = document.createElement("article");
  card.className = "incident-stat";
  const title = document.createElement("span");
  title.textContent = label;
  const count = document.createElement("strong");
  count.textContent = String(value);
  card.append(title, count);
  return card;
}

function renderReport(report) {
  result.replaceChildren();
  const note = document.createElement("p");
  note.className = "incident-message";
  note.textContent = "Analysis complete. Only aggregate counts and row numbers are shown; source text and identifiers are not retained.";
  const stats = document.createElement("div");
  stats.className = "incident-stats";
  stats.append(
    metric("Rows", report.total_rows),
    metric("Valid", report.valid_rows),
    metric("Invalid", report.invalid_rows),
    metric("Duplicates", report.duplicate_rows),
  );
  const breakdown = document.createElement("div");
  breakdown.className = "incident-breakdowns";
  for (const [title, values] of [["By severity", report.by_severity], ["By category", report.by_category], ["By clinic", report.by_clinic], ["By status", report.by_status]]) {
    const section = document.createElement("section");
    const heading = document.createElement("h3");
    heading.textContent = title;
    const list = document.createElement("ul");
    for (const [name, count] of Object.entries(values)) {
      const item = document.createElement("li");
      item.textContent = `${name}: ${count}`;
      list.append(item);
    }
    section.append(heading, list);
    breakdown.append(section);
  }
  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.className = "button-secondary";
  exportButton.textContent = "Download sanitized findings CSV";
  exportButton.addEventListener("click", () => submit("/incidents/export", true));
  result.append(note, stats, breakdown, exportButton);
}

async function submit(path, download = false) {
  const file = input.files?.[0];
  const token = tokenField.value.trim();
  if (!file || !token) {
    showMessage("Select a CSV file and enter an API access token.", true);
    return;
  }
  const body = new FormData();
  body.append("file", file, "incident-upload.csv");
  showMessage("Analyzing file…");
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const known = payload?.detail?.code;
      showMessage(known ? `Analysis could not be completed (${known}).` : "Analysis could not be completed. Check authorization and file format.", true);
      return;
    }
    if (download) {
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "incident-analysis-findings.csv";
      link.click();
      URL.revokeObjectURL(link.href);
      showMessage("Sanitized findings downloaded. No source identifiers or descriptions are included.");
      return;
    }
    renderReport(await response.json());
  } catch {
    showMessage("Unable to reach the analysis service. No file data was saved by this page.", true);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void submit("/incidents/analyze");
});
