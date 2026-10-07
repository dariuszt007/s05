const DATA_URL = "./teachers.json";
const APP_PASSWORD = "1234";

const loginScreen = document.getElementById("loginScreen");
const appContent = document.getElementById("appContent");
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");

const toolbar = document.getElementById("toolbar");
const toggleToolbarBtn = document.getElementById("toggleToolbarBtn");

let teachers = [];
let filteredTeachers = [];

let currentSorts = [
  { key: "grade", direction: "asc" },
  { key: "className", direction: "asc" },
  { key: "ban", direction: "asc" }
];

const DUPLICATE_COLORS = [
  "#ffe0e0",
  "#e0f0ff",
  "#e6ffe0",
  "#fff4cc",
  "#f0e0ff",
  "#ffe8cc",
  "#dfffe8",
  "#e0ecff",
  "#ffdff5",
  "#e8f7d8"
];

const teacherTableBody = document.getElementById("teacherTableBody");
const jsonOutput = document.getElementById("jsonOutput");

const exportCsvBtn = document.getElementById("exportCsvBtn");
const copyBtn = document.getElementById("copyBtn");
const addBtn = document.getElementById("addBtn");
const csvFile = document.getElementById("csvFile");
const downloadSampleCsvBtn = document.getElementById("downloadSampleCsvBtn");

const filterType = document.getElementById("filterType");
const filterGrade = document.getElementById("filterGrade");
const filterClass = document.getElementById("filterClass");
const filterDuplicate = document.getElementById("filterDuplicate");
const filterName = document.getElementById("filterName");

const teacherDialog = document.getElementById("teacherDialog");
const teacherForm = document.getElementById("teacherForm");
const dialogTitle = document.getElementById("dialogTitle");
const cancelBtn = document.getElementById("cancelBtn");

const teacherId = document.getElementById("teacherId");
const email = document.getElementById("email");
const nameField = document.getElementById("name");
const typeField = document.getElementById("type");
const grade = document.getElementById("grade");
const className = document.getElementById("className");
const ban = document.getElementById("ban");
const deviceNumber = document.getElementById("deviceNumber");
const usageStatus = document.getElementById("usageStatus");
const remarks = document.getElementById("remarks");

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  if (passwordInput.value === APP_PASSWORD) {
    loginError.hidden = true;
    loginScreen.classList.add("hidden");
    appContent.classList.remove("hidden");
    loadTeachers();
  } else {
    loginError.hidden = false;
    passwordInput.value = "";
    passwordInput.focus();
  }
});

toggleToolbarBtn.addEventListener("click", () => {
  toolbar.classList.toggle("hidden-toolbar");

  if (toolbar.classList.contains("hidden-toolbar")) {
    toggleToolbarBtn.textContent = "Pokaż przyciski";
  } else {
    toggleToolbarBtn.textContent = "Ukryj przyciski";
  }
});

async function loadTeachers() {
  try {
    const res = await fetch(DATA_URL + "?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("Nie udało się wczytać teachers.json");
    const data = await res.json();
    teachers = Array.isArray(data) ? normalizeTeachers(data) : [];
    populateFilterOptionsFromCurrentTeachers();
    applyFilters();
  } catch (err) {
    alert(err.message);
  }
}

function normalizeTeachers(data) {
  return data.map((row, index) => ({
    id: row.id || safeId(index),
    email: String(row.email || row.lgate || "").trim(),
    name: String(row.name || row["名前"] || "").trim(),
    type: String(row.type || row["タイプ"] || "児童・生徒").trim() || "児童・生徒",
    grade: String(row.grade || row["年"] || "").trim(),
    className: String(row.className || row["組"] || row.group || "").trim(),
    ban: String(row.ban || row.banName || row["番"] || "").trim(),
    deviceNumber: String(row.deviceNumber || row.deviceName || row["端末番号"] || row.role || "").trim(),
    usageStatus: String(row.usageStatus || row["使用可否"] || "使用可").trim() || "使用可",
    remarks: String(row.remarks || row["備考"] || "").trim()
  }));
}

function safeId(index = 0) {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "id_" + Date.now() + "_" + index;
}

function buildDuplicateDeviceMap(data) {
  const counts = new Map();

  data.forEach(item => {
    const value = String(item.deviceNumber || "").trim();
    if (!value) return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  const duplicateValues = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort((a, b) => a.localeCompare(b, "ja", { sensitivity: "base" }));

  const colorMap = new Map();

  duplicateValues.forEach((value, index) => {
    colorMap.set(value, DUPLICATE_COLORS[index % DUPLICATE_COLORS.length]);
  });

  return {
    counts,
    colorMap
  };
}

function getSortedTeachersForExport() {
  const data = [...teachers];

  data.sort((a, b) => {
    for (const sortRule of currentSorts) {
      const result = compareValues(
        a[sortRule.key],
        b[sortRule.key],
        sortRule.direction,
        sortRule.key
      );
      if (result !== 0) return result;
    }
    return 0;
  });

  return data;
}

function syncJsonEditor() {
  jsonOutput.value = JSON.stringify(getSortedTeachersForExport(), null, 2);
}

function populateFilterOptionsFromCurrentTeachers() {
  fillSelect(filterType, "タイプ", uniqueValues(teachers, "type"));
  fillSelect(filterGrade, "年", uniqueValues(teachers, "grade"));
  fillSelect(filterClass, "組", uniqueValues(teachers, "className"));
}

function uniqueValues(data, key) {
  const values = [...new Set(
    data
      .map(item => String(item[key] || "").trim())
      .filter(Boolean)
  )];

  if (key === "grade" || key === "ban" || key === "className") {
    return values.sort((a, b) => Number(a) - Number(b));
  }

  return values.sort((a, b) => a.localeCompare(b, "ja", { sensitivity: "base" }));
}

function fillSelect(selectEl, defaultLabel, values) {
  const currentValue = selectEl.value;
  selectEl.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = defaultLabel;
  selectEl.appendChild(defaultOption);

  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });

  if (values.includes(currentValue)) {
    selectEl.value = currentValue;
  } else {
    selectEl.value = "";
  }
}

function applyFilters() {
  const duplicateInfo = buildDuplicateDeviceMap(teachers);

  const typeVal = filterType.value.trim().toLowerCase();
  const gradeVal = filterGrade.value.trim().toLowerCase();
  const classVal = filterClass.value.trim().toLowerCase();
  const duplicateVal = filterDuplicate.value.trim().toLowerCase();
  const nameVal = filterName.value.trim().toLowerCase();

  filteredTeachers = teachers.filter(t => {
    const deviceValue = String(t.deviceNumber || "").trim();
    const isDuplicate = deviceValue && (duplicateInfo.counts.get(deviceValue) || 0) > 1;

    const typeMatch = !typeVal || String(t.type || "").toLowerCase() === typeVal;
    const gradeMatch = !gradeVal || String(t.grade || "").toLowerCase() === gradeVal;
    const classMatch = !classVal || String(t.className || "").toLowerCase() === classVal;

    const duplicateMatch =
      !duplicateVal ||
      (duplicateVal === "duplicate" && isDuplicate) ||
      (duplicateVal === "unique" && !isDuplicate);

    const textMatch =
      String(t.name || "").toLowerCase().includes(nameVal) ||
      String(t.email || "").toLowerCase().includes(nameVal) ||
      String(t.deviceNumber || "").toLowerCase().includes(nameVal) ||
      String(t.ban || "").toLowerCase().includes(nameVal) ||
      String(t.remarks || "").toLowerCase().includes(nameVal) ||
      String(t.usageStatus || "").toLowerCase().includes(nameVal) ||
      String(t.type || "").toLowerCase().includes(nameVal);

    return typeMatch && gradeMatch && classMatch && duplicateMatch && textMatch;
  });

  sortFilteredTeachers();
  renderTable();
  syncJsonEditor();
  updateSortButtonsUI();
}

function sortFilteredTeachers() {
  filteredTeachers.sort((a, b) => {
    for (const sortRule of currentSorts) {
      const result = compareValues(
        a[sortRule.key],
        b[sortRule.key],
        sortRule.direction,
        sortRule.key
      );
      if (result !== 0) return result;
    }
    return 0;
  });
}

function compareValues(aValue, bValue, direction = "asc", key = "") {
  const aVal = String(aValue || "").trim();
  const bVal = String(bValue || "").trim();

  let result;

  if (key === "grade" || key === "ban" || key === "className") {
    const aNum = Number(aVal);
    const bNum = Number(bVal);
    const bothNumeric =
      aVal !== "" &&
      bVal !== "" &&
      !Number.isNaN(aNum) &&
      !Number.isNaN(bNum);

    if (bothNumeric) {
      result = aNum - bNum;
    } else {
      result = aVal.localeCompare(bVal, "ja", { sensitivity: "base" });
    }
  } else {
    result = aVal.localeCompare(bVal, "ja", { sensitivity: "base" });
  }

  return direction === "asc" ? result : -result;
}

function setSort(key) {
  const existingIndex = currentSorts.findIndex(sort => sort.key === key);

  if (existingIndex === 0) {
    currentSorts[0].direction =
      currentSorts[0].direction === "asc" ? "desc" : "asc";
  } else if (existingIndex > 0) {
    const existing = currentSorts.splice(existingIndex, 1)[0];
    currentSorts.unshift(existing);
  } else {
    currentSorts.unshift({ key, direction: "asc" });
  }

  applyFilters();
}

function updateSortButtonsUI() {
  const buttons = document.querySelectorAll(".sort-btn");

  buttons.forEach(btn => {
    const key = btn.dataset.sort;
    const index = currentSorts.findIndex(sort => sort.key === key);

    if (index >= 0) {
      const direction = currentSorts[index].direction === "asc" ? "▲" : "▼";
      const priority = index + 1;
      btn.textContent = `${getSortLabel(key)} ${direction}${priority}`;
    } else {
      btn.textContent = getSortLabel(key);
    }
  });
}

function getSortLabel(key) {
  const labels = {
    email: "Email",
    name: "名前",
    type: "タイプ",
    grade: "年",
    className: "組",
    ban: "番",
    deviceNumber: "端末番号",
    usageStatus: "使用可否",
    remarks: "備考"
  };

  return labels[key] || key;
}

function renderTable() {
  teacherTableBody.innerHTML = "";

  const duplicateInfo = buildDuplicateDeviceMap(filteredTeachers);

  filteredTeachers.forEach(t => {
    const tr = document.createElement("tr");
    const deviceValue = String(t.deviceNumber || "").trim();
    const isDuplicate =
      deviceValue && (duplicateInfo.counts.get(deviceValue) || 0) > 1;
    const duplicateColor = isDuplicate
      ? duplicateInfo.colorMap.get(deviceValue)
      : "";

    const typeClass =
      t.type === "予備機" ? "type-spare" : "type-student";

    tr.innerHTML = `
      <td>${escapeHtml(t.email || "")}</td>
      <td>${escapeHtml(t.name || "")}</td>
      <td>
        <span class="type-badge ${typeClass}">
          ${escapeHtml(t.type || "")}
        </span>
      </td>
      <td>${escapeHtml(t.grade || "")}</td>
      <td>${escapeHtml(t.className || "")}</td>
      <td>${escapeHtml(t.ban || "")}</td>
      <td class="device-cell ${isDuplicate ? "duplicate-device" : ""}" style="${isDuplicate ? `background:${duplicateColor}; font-weight:600;` : ""}">
        ${escapeHtml(deviceValue)}
      </td>
      <td>
        <span class="usage-badge ${t.usageStatus === "使用不可" ? "status-unavailable" : "status-available"}">
          ${escapeHtml(t.usageStatus || "")}
        </span>
      </td>
      <td>${escapeHtml(t.remarks || "")}</td>
      <td>
        <button type="button" class="action-btn" data-edit="${t.id}">Edytuj</button>
        <button type="button" class="action-btn delete-btn" data-delete="${t.id}">Usuń</button>
      </td>
    `;

    teacherTableBody.appendChild(tr);
  });

  document.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => openEditDialog(btn.dataset.edit));
  });

  document.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteTeacher(btn.dataset.delete));
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openAddDialog() {
  dialogTitle.textContent = "Dodaj nauczyciela";
  teacherId.value = "";
  email.value = "";
  nameField.value = "";
  typeField.value = "児童・生徒";
  grade.value = "";
  className.value = "";
  ban.value = "";
  deviceNumber.value = "";
  usageStatus.value = "使用可";
  remarks.value = "";
  teacherDialog.showModal();
}

function openEditDialog(id) {
  const t = teachers.find(x => String(x.id) === String(id));
  if (!t) return;

  dialogTitle.textContent = "Edytuj nauczyciela";
  teacherId.value = t.id || "";
  email.value = t.email || "";
  nameField.value = t.name || "";
  typeField.value = t.type || "児童・生徒";
  grade.value = t.grade || "";
  className.value = t.className || "";
  ban.value = t.ban || "";
  deviceNumber.value = t.deviceNumber || "";
  usageStatus.value = t.usageStatus || "使用可";
  remarks.value = t.remarks || "";
  teacherDialog.showModal();
}

function deleteTeacher(id) {
  if (!confirm("Na pewno usunąć ten wpis?")) return;
  teachers = teachers.filter(t => String(t.id) !== String(id));
  populateFilterOptionsFromCurrentTeachers();
  applyFilters();
}

teacherForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const payload = {
    id: teacherId.value || safeId(),
    email: email.value.trim(),
    name: nameField.value.trim(),
    type: typeField.value.trim(),
    grade: grade.value.trim(),
    className: className.value.trim(),
    ban: ban.value.trim(),
    deviceNumber: deviceNumber.value.trim(),
    usageStatus: usageStatus.value.trim(),
    remarks: remarks.value.trim()
  };

  const index = teachers.findIndex(t => String(t.id) === String(payload.id));

  if (index >= 0) {
    teachers[index] = payload;
  } else {
    teachers.push(payload);
  }

  teacherDialog.close();
  populateFilterOptionsFromCurrentTeachers();
  applyFilters();
});

cancelBtn.addEventListener("click", () => teacherDialog.close());
addBtn.addEventListener("click", openAddDialog);

[filterType, filterGrade, filterClass, filterDuplicate].forEach(select => {
  select.addEventListener("change", applyFilters);
});

filterName.addEventListener("input", applyFilters);

document.querySelectorAll(".sort-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    setSort(btn.dataset.sort);
  });
});

exportCsvBtn.addEventListener("click", () => {
  const sortedData = getSortedTeachersForExport();
  const csv = toCSV(sortedData);
  downloadTextFile("teachers.csv", csv, "text/csv;charset=utf-8");
});

downloadSampleCsvBtn.addEventListener("click", () => {
  const sampleRows = [
    ["email", "name", "type", "grade", "className", "banName", "deviceNumber", "usageStatus", "remarks"],
    ["fujiwara758@o365.suita.ed.jp", "藤原 光矢", "児童・生徒", "3", "1", "1", "0012", "使用可", ""],
    ["aoyama090@o365.suita.ed.jp", "青山 正道", "予備機", "3", "2", "2", "0012", "使用不可", "画面不良"],
    ["ruh302@o365.suita.ed.jp", "安食 葵", "児童・生徒", "2", "1", "3", "0045", "使用可", ""]
  ];

  const csv =
    "\uFEFF" + sampleRows.map(row => row.map(csvEscape).join(",")).join("\n");
  downloadTextFile("sample_teachers.csv", csv, "text/csv;charset=utf-8");
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(getSortedTeachersForExport(), null, 2));
    alert("JSON skopiowany do schowka.");
  } catch {
    alert("Nie udało się skopiować. Skopiuj ręcznie z pola poniżej.");
  }
});

jsonOutput.addEventListener("change", () => {
  try {
    const parsed = JSON.parse(jsonOutput.value);
    if (!Array.isArray(parsed)) throw new Error();
    teachers = normalizeTeachers(parsed);
    populateFilterOptionsFromCurrentTeachers();
    applyFilters();
  } catch {
    alert("Niepoprawny JSON.");
    syncJsonEditor();
  }
});

csvFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const rows = parseCSV(text);

    teachers = rows.map((row, index) => ({
      id: row.id || safeId(index),
      email: String(row.email || row.lgate || "").trim(),
      name: String(row.name || row["名前"] || "").trim(),
      type: String(row.type || row["タイプ"] || "児童・生徒").trim() || "児童・生徒",
      grade: String(row.grade || row["年"] || "").trim(),
      className: String(row.className || row["組"] || row.group || "").trim(),
      ban: String(row.ban || row.banName || row["番"] || "").trim(),
      deviceNumber: String(row.deviceNumber || row.deviceName || row["端末番号"] || row.role || "").trim(),
      usageStatus: String(row.usageStatus || row["使用可否"] || "使用可").trim() || "使用可",
      remarks: String(row.remarks || row["備考"] || "").trim()
    }));

    populateFilterOptionsFromCurrentTeachers();
    applyFilters();
    alert("CSV został zaimportowany.");
  } catch (err) {
    alert("Nie udało się odczytać CSV.");
  }

  e.target.value = "";
});

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const headers = splitCSVLine(lines[0]).map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = (values[i] || "").trim();
    });
    return obj;
  });
}

function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

function toCSV(data) {
  const headers = [
    "email",
    "name",
    "type",
    "grade",
    "className",
    "banName",
    "deviceNumber",
    "usageStatus",
    "remarks"
  ];

  const rows = [
    headers,
    ...data.map(item => [
      item.email ?? "",
      item.name ?? "",
      item.type ?? "",
      item.grade ?? "",
      item.className ?? "",
      item.ban ?? "",
      item.deviceNumber ?? "",
      item.usageStatus ?? "",
      item.remarks ?? ""
    ])
  ];

  return "\uFEFF" + rows.map(row => row.map(csvEscape).join(",")).join("\n");
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
