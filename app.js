const MOBILE_WIDTH = 520;
const PASSWORD = "1234";
const STORAGE_KEY = `teachersData_${location.host}_${location.pathname}`;

// Jeśli chcesz używać pełnego adresu RAW z GitHub, wklej go tutaj.
// Jeśli chcesz lokalny plik obok strony, zostaw "teachers.json".
const JSON_SOURCE_URL = "teachers.json";
// przykład:
// const JSON_SOURCE_URL = "https://raw.githubusercontent.com/TWOJ_LOGIN/TWOJE_REPO/main/teachers.json";

const loginScreen = document.getElementById("loginScreen");
const appContent = document.getElementById("appContent");
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");

const toolbar = document.getElementById("toolbar");
const toggleToolbarBtn = document.getElementById("toggleToolbarBtn");
const syncStatus = document.getElementById("syncStatus");

const csvFileInput = document.getElementById("csvFile");
const downloadSampleCsvBtn = document.getElementById("downloadSampleCsvBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const copyBtn = document.getElementById("copyBtn");
const reloadJsonBtn = document.getElementById("reloadJsonBtn");
const clearLocalBtn = document.getElementById("clearLocalBtn");
const addBtn = document.getElementById("addBtn");

const filterType = document.getElementById("filterType");
const filterGrade = document.getElementById("filterGrade");
const filterClass = document.getElementById("filterClass");
const filterDuplicate = document.getElementById("filterDuplicate");
const filterName = document.getElementById("filterName");

const teacherTableBody = document.getElementById("teacherTableBody");
const jsonOutput = document.getElementById("jsonOutput");

const teacherDialog = document.getElementById("teacherDialog");
const teacherForm = document.getElementById("teacherForm");
const dialogTitle = document.getElementById("dialogTitle");
const cancelBtn = document.getElementById("cancelBtn");

const teacherIdInput = document.getElementById("teacherId");
const emailInput = document.getElementById("email");
const nameInput = document.getElementById("name");
const typeInput = document.getElementById("type");
const gradeInput = document.getElementById("grade");
const classNameInput = document.getElementById("className");
const banInput = document.getElementById("ban");
const deviceNumberInput = document.getElementById("deviceNumber");
const usageStatusInput = document.getElementById("usageStatus");
const remarksInput = document.getElementById("remarks");

const tableHead = document.querySelector(".table-wrap thead");

let teachers = [];
let sortState = {
  key: "",
  direction: "asc"
};

function isMobileView() {
  return window.innerWidth <= MOBILE_WIDTH;
}

function setSyncStatus(message, isError = false) {
  if (!syncStatus) return;
  syncStatus.textContent = message;
  syncStatus.style.color = isError ? "#c62828" : "";
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeNumberLike(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTypeBadgeClass(type) {
  return type === "予備機" ? "type-spare" : "type-student";
}

function getUsageBadgeClass(status) {
  return status === "使用可" ? "status-available" : "status-unavailable";
}

function updateJsonOutput() {
  if (jsonOutput) {
    jsonOutput.value = JSON.stringify(teachers, null, 2);
  }
}

function saveTeachersToLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teachers));
}

function clearTeachersLocal() {
  localStorage.removeItem(STORAGE_KEY);
}

function loadTeachersFromLocal() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return false;

  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      teachers = parsed;
      return true;
    }
  } catch (error) {
    console.error("Błąd odczytu localStorage:", error);
  }

  return false;
}

async function fetchTeachersJson(useCacheBuster = false) {
  const url = useCacheBuster
    ? `${JSON_SOURCE_URL}${JSON_SOURCE_URL.includes("?") ? "&" : "?"}t=${Date.now()}`
    : JSON_SOURCE_URL;

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("teachers.json nie zawiera tablicy");
  }

  return data;
}

async function loadTeachersFromJson() {
  try {
    const data = await fetchTeachersJson(false);
    teachers = data;
    saveTeachersToLocal();
    return true;
  } catch (error) {
    console.error("Błąd wczytywania teachers.json:", error);
    return false;
  }
}

async function reloadTeachersFromJson() {
  try {
    setSyncStatus("Ładowanie danych z JSON...");
    const data = await fetchTeachersJson(true);

    clearTeachersLocal();
    teachers = data;
    saveTeachersToLocal();
    populateFilters();
    renderTable();

    setSyncStatus("Dane z teachers.json zostały odświeżone.");
    alert("Dane z teachers.json zostały odświeżone.");
  } catch (error) {
    console.error("Błąd odświeżania teachers.json:", error);
    setSyncStatus("Nie udało się odświeżyć danych z JSON.", true);
    alert("Nie udało się odświeżyć danych z teachers.json.");
  }
}

function clearLocalStorageData() {
  const confirmed = window.confirm("Czy na pewno chcesz wyczyścić localStorage dla tej strony?");
  if (!confirmed) return;

  clearTeachersLocal();
  teachers = [];
  populateFilters();
  renderTable();
  setSyncStatus("Wyczyszczono localStorage.");
  alert("Wyczyszczono localStorage.");
}

function getUniqueSortedValues(key) {
  const values = [...new Set(teachers.map(item => String(item[key] ?? "").trim()).filter(Boolean))];
  return values.sort((a, b) => a.localeCompare(b, "pl", { numeric: true, sensitivity: "base" }));
}

function refillSelect(selectElement, values, defaultLabel) {
  const currentValue = selectElement.value;

  selectElement.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = defaultLabel;
  selectElement.appendChild(defaultOption);

  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });

  selectElement.value = values.includes(currentValue) ? currentValue : "";
}

function populateFilters() {
  refillSelect(filterType, getUniqueSortedValues("type"), "タイプ");
  refillSelect(filterGrade, getUniqueSortedValues("grade"), "年");
  refillSelect(filterClass, getUniqueSortedValues("className"), "組");
}

function getDuplicateDeviceNumbers() {
  const counts = new Map();

  teachers.forEach(item => {
    const key = normalizeNumberLike(item.deviceNumber);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const duplicates = new Set();
  counts.forEach((count, key) => {
    if (count > 1) duplicates.add(key);
  });

  return duplicates;
}

function getFilteredTeachers() {
  const selectedType = filterType.value;
  const selectedGrade = filterGrade.value;
  const selectedClass = filterClass.value;
  const selectedDuplicate = filterDuplicate.value;
  const searchText = normalizeText(filterName.value);
  const duplicates = getDuplicateDeviceNumbers();

  return teachers.filter(item => {
    if (selectedType && String(item.type ?? "") !== selectedType) return false;
    if (selectedGrade && String(item.grade ?? "") !== selectedGrade) return false;
    if (selectedClass && String(item.className ?? "") !== selectedClass) return false;

    const deviceNumber = normalizeNumberLike(item.deviceNumber);
    const isDuplicate = duplicates.has(deviceNumber);

    if (selectedDuplicate === "duplicate" && !isDuplicate) return false;
    if (selectedDuplicate === "unique" && isDuplicate) return false;

    if (searchText) {
      const haystack = [
        item.email,
        item.name,
        item.type,
        item.grade,
        item.className,
        item.ban,
        item.deviceNumber,
        item.usageStatus,
        item.remarks
      ]
        .map(value => String(value ?? ""))
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(searchText)) return false;
    }

    return true;
  });
}

function compareValues(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), "pl", {
    numeric: true,
    sensitivity: "base"
  });
}

function sortTeachers(items) {
  if (!sortState.key) return [...items];

  const sorted = [...items].sort((a, b) => {
    const result = compareValues(a[sortState.key], b[sortState.key]);
    return sortState.direction === "asc" ? result : -result;
  });

  return sorted;
}

function renderEmptyState() {
  teacherTableBody.innerHTML = `
    <tr>
      <td colspan="10">Brak danych do wyświetlenia.</td>
    </tr>
  `;
}

function renderTable() {
  const duplicates = getDuplicateDeviceNumbers();
  const filtered = sortTeachers(getFilteredTeachers());

  teacherTableBody.innerHTML = "";

  if (filtered.length === 0) {
    renderEmptyState();
    updateJsonOutput();
    return;
  }

  filtered.forEach((teacher, index) => {
    const tr = document.createElement("tr");
    const deviceValue = normalizeNumberLike(teacher.deviceNumber);
    const isDuplicate = duplicates.has(deviceValue);

    tr.innerHTML = `
      <td>${escapeHtml(teacher.email)}</td>
      <td>${escapeHtml(teacher.name)}</td>
      <td>
        <span class="type-badge ${getTypeBadgeClass(teacher.type)}">
          ${escapeHtml(teacher.type)}
        </span>
      </td>
      <td>${escapeHtml(teacher.grade)}</td>
      <td>${escapeHtml(teacher.className)}</td>
      <td>${escapeHtml(teacher.ban)}</td>
      <td class="device-cell ${isDuplicate ? "duplicate-device" : ""}">
        ${escapeHtml(teacher.deviceNumber)}
      </td>
      <td>
        <span class="usage-badge ${getUsageBadgeClass(teacher.usageStatus)}">
          ${escapeHtml(teacher.usageStatus)}
        </span>
      </td>
      <td>${escapeHtml(teacher.remarks)}</td>
      <td>
        <button type="button" class="action-btn edit-btn" data-index="${index}">Edytuj</button>
        <button type="button" class="action-btn delete-btn" data-index="${index}">Usuń</button>
      </td>
    `;

    teacherTableBody.appendChild(tr);
  });

  updateJsonOutput();
}

function resetForm() {
  teacherIdInput.value = "";
  emailInput.value = "";
  nameInput.value = "";
  typeInput.value = "予備機";
  gradeInput.value = "";
  classNameInput.value = "";
  banInput.value = "";
  deviceNumberInput.value = "";
  usageStatusInput.value = "使用可";
  remarksInput.value = "";
}

function openAddDialog() {
  resetForm();
  dialogTitle.textContent = "Dodaj nauczyciela";
  teacherDialog.showModal();
}

function openEditDialog(filteredIndex) {
  const filtered = sortTeachers(getFilteredTeachers());
  const teacher = filtered[filteredIndex];
  if (!teacher) return;

  const realIndex = teachers.indexOf(teacher);
  if (realIndex === -1) return;

  teacherIdInput.value = String(realIndex);
  emailInput.value = teacher.email ?? "";
  nameInput.value = teacher.name ?? "";
  typeInput.value = teacher.type ?? "予備機";
  gradeInput.value = teacher.grade ?? "";
  classNameInput.value = teacher.className ?? "";
  banInput.value = teacher.ban ?? "";
  deviceNumberInput.value = teacher.deviceNumber ?? "";
  usageStatusInput.value = teacher.usageStatus ?? "使用可";
  remarksInput.value = teacher.remarks ?? "";

  dialogTitle.textContent = "Edytuj nauczyciela";
  teacherDialog.showModal();
}

function upsertTeacherFromForm() {
  const teacher = {
    email: emailInput.value.trim(),
    name: nameInput.value.trim(),
    type: typeInput.value,
    grade: gradeInput.value.trim(),
    className: classNameInput.value.trim(),
    ban: banInput.value.trim(),
    deviceNumber: deviceNumberInput.value.trim(),
    usageStatus: usageStatusInput.value,
    remarks: remarksInput.value.trim()
  };

  const editIndex = teacherIdInput.value;

  if (editIndex === "") {
    teachers.push(teacher);
  } else {
    teachers[Number(editIndex)] = teacher;
  }

  saveTeachersToLocal();
  populateFilters();
  renderTable();
  setSyncStatus("Zapisano lokalne zmiany.");
}

function deleteTeacher(filteredIndex) {
  const filtered = sortTeachers(getFilteredTeachers());
  const teacher = filtered[filteredIndex];
  if (!teacher) return;

  const realIndex = teachers.indexOf(teacher);
  if (realIndex === -1) return;

  const confirmed = window.confirm(`Usunąć wpis: ${teacher.name || teacher.email || "bez nazwy"}?`);
  if (!confirmed) return;

  teachers.splice(realIndex, 1);
  saveTeachersToLocal();
  populateFilters();
  renderTable();
  setSyncStatus("Usunięto wpis i zapisano lokalnie.");
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map(value => value.trim());
}

function toCsvValue(value) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function importCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    alert("Plik CSV nie zawiera danych.");
    return;
  }

  const header = parseCsvLine(lines[0]).map(item => item.toLowerCase());
  const mapIndex = name => header.indexOf(name.toLowerCase());

  const imported = lines.slice(1).map(line => {
    const cols = parseCsvLine(line);

    return {
      email: cols[mapIndex("email")] ?? "",
      name: cols[mapIndex("name")] ?? "",
      type: cols[mapIndex("type")] ?? "予備機",
      grade: cols[mapIndex("grade")] ?? "",
      className: cols[mapIndex("className")] ?? "",
      ban: cols[mapIndex("ban")] ?? "",
      deviceNumber: cols[mapIndex("deviceNumber")] ?? "",
      usageStatus: cols[mapIndex("usageStatus")] ?? "使用可",
      remarks: cols[mapIndex("remarks")] ?? ""
    };
  });

  teachers = imported;
  saveTeachersToLocal();
  populateFilters();
  renderTable();
  setSyncStatus("Zaimportowano dane z CSV.");
}

function exportCsv() {
  const rows = [
    ["email", "name", "type", "grade", "className", "ban", "deviceNumber", "usageStatus", "remarks"],
    ...teachers.map(item => [
      item.email,
      item.name,
      item.type,
      item.grade,
      item.className,
      item.ban,
      item.deviceNumber,
      item.usageStatus,
      item.remarks
    ])
  ];

  const csv = rows.map(row => row.map(toCsvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "teachers.csv";
  link.click();

  URL.revokeObjectURL(url);
  setSyncStatus("Wyeksportowano CSV.");
}

function downloadSampleCsv() {
  const sampleRows = [
    ["email", "name", "type", "grade", "className", "ban", "deviceNumber", "usageStatus", "remarks"],
    ["sample1@example.com", "山田 太郎", "児童・生徒", "1", "A", "1", "1001", "使用可", "サンプル"],
    ["sample2@example.com", "佐藤 花子", "予備機", "", "", "", "2001", "使用不可", "予備"]
  ];

  const csv = sampleRows.map(row => row.map(toCsvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "teachers_sample.csv";
  link.click();

  URL.revokeObjectURL(url);
  setSyncStatus("Pobrano przykładowy CSV.");
}

async function copyJsonToClipboard() {
  const text = JSON.stringify(teachers, null, 2);

  try {
    await navigator.clipboard.writeText(text);
    setSyncStatus("JSON skopiowany.");
    alert("JSON skopiowany.");
  } catch (error) {
    console.error("Błąd kopiowania:", error);
    setSyncStatus("Nie udało się skopiować JSON.", true);
    alert("Nie udało się skopiować JSON.");
  }
}

function updateToolbarButtonLabel() {
  if (!toggleToolbarBtn || !toolbar) return;

  if (!isMobileView()) {
    toggleToolbarBtn.textContent = "Ukryj przyciski";
    return;
  }

  toggleToolbarBtn.textContent = toolbar.classList.contains("hidden-toolbar")
    ? "Pokaż przyciski"
    : "Ukryj przyciski";
}

function applyResponsiveToolbarState() {
  if (!toolbar) return;

  if (isMobileView()) {
    toolbar.classList.add("hidden-toolbar");
  } else {
    toolbar.classList.remove("hidden-toolbar");
  }

  updateToolbarButtonLabel();
}

function toggleToolbar() {
  if (!toolbar) return;

  toolbar.classList.toggle("hidden-toolbar");
  updateToolbarButtonLabel();
}

function handleSortClick(event) {
  const btn = event.target.closest(".sort-btn");
  if (!btn) return;

  const key = btn.dataset.sort;
  if (!key) return;

  if (sortState.key === key) {
    sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
  } else {
    sortState.key = key;
    sortState.direction = "asc";
  }

  renderTable();
}

function handleTableClick(event) {
  const editBtn = event.target.closest(".edit-btn");
  if (editBtn) {
    openEditDialog(Number(editBtn.dataset.index));
    return;
  }

  const deleteBtn = event.target.closest(".delete-btn");
  if (deleteBtn) {
    deleteTeacher(Number(deleteBtn.dataset.index));
  }
}

function handleLogin(event) {
  event.preventDefault();

  if (passwordInput.value === PASSWORD) {
    loginScreen.classList.add("hidden");
    appContent.classList.remove("hidden");
    loginError.hidden = true;
    passwordInput.value = "";
    return;
  }

  loginError.hidden = false;
}

async function init() {
  setSyncStatus("Uruchamianie...");

  const loadedLocal = loadTeachersFromLocal();

  if (loadedLocal) {
    populateFilters();
    renderTable();
    setSyncStatus("Wczytano dane lokalne.");
  }

  const loadedRemote = await loadTeachersFromJson();

  if (loadedRemote) {
    populateFilters();
    renderTable();
    setSyncStatus("Wczytano najnowsze dane z JSON.");
  } else if (!loadedLocal) {
    teachers = [];
    populateFilters();
    renderTable();
    setSyncStatus("Nie udało się wczytać danych.", true);
  }

  applyResponsiveToolbarState();
}

loginForm.addEventListener("submit", handleLogin);

toggleToolbarBtn.addEventListener("click", toggleToolbar);

downloadSampleCsvBtn.addEventListener("click", downloadSampleCsv);
exportCsvBtn.addEventListener("click", exportCsv);
copyBtn.addEventListener("click", copyJsonToClipboard);
reloadJsonBtn.addEventListener("click", reloadTeachersFromJson);
clearLocalBtn.addEventListener("click", clearLocalStorageData);
addBtn.addEventListener("click", openAddDialog);

csvFileInput.addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    importCsv(String(e.target?.result ?? ""));
    csvFileInput.value = "";
  };
  reader.readAsText(file, "utf-8");
});

[filterType, filterGrade, filterClass, filterDuplicate, filterName].forEach(element => {
  element.addEventListener("input", renderTable);
  element.addEventListener("change", renderTable);
});

teacherTableBody.addEventListener("click", handleTableClick);
tableHead?.addEventListener("click", handleSortClick);

teacherForm.addEventListener("submit", event => {
  event.preventDefault();
  upsertTeacherFromForm();
  teacherDialog.close();
});

cancelBtn.addEventListener("click", () => {
  teacherDialog.close();
});

window.addEventListener("resize", applyResponsiveToolbarState);

init();
