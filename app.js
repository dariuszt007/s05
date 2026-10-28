const MOBILE_WIDTH = 520;
const STORAGE_KEY = `teachersData_${location.host}_${location.pathname}`;
const JSON_SOURCE_URL = "teachers.json";

// Usunięto stare elementy loginForm, passwordInput, loginError, ponieważ ich obsługą zajmuje się teraz Auth0 w pliku index.html
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
let sortState = [];
let draggedTeacherIndex = null;
let justAddedTeacher = null;

function isMobileView() {
 return window.innerWidth <= MOBILE_WIDTH;
}
function setSyncStatus(message, isError = false) {
 if (!syncStatus) return;
 syncStatus.textContent = message;
 syncStatus.style.color = isError ? "#c62828" : "";
}
function normalizeText(value) {
 return String(value ?? "").trim().toLowerCase();
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
 sortState = [];
 justAddedTeacher = null;
 saveTeachersToLocal();
 populateFilters();
 updateSortButtons();
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
 sortState = [];
 justAddedTeacher = null;
 populateFilters();
 updateSortButtons();
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
function compareStudentOrder(a, b) {
 const gradeResult = compareValues(a.grade, b.grade);
 if (gradeResult !== 0) return gradeResult;
 const classResult = compareValues(a.className, b.className);
 if (classResult !== 0) return classResult;
 return compareValues(a.ban, b.ban);
}
function insertTeacherByTypeRules(teacher) {
 if (teacher.type === "予備機") {
 teachers.unshift(teacher);
 return;
 }
 if (teacher.type === "児童・生徒") {
 let insertIndex = teachers.length;
 for (let i = 0; i < teachers.length; i += 1) {
 const current = teachers[i];
 if (current.type === "予備機") {
 continue;
 }
 if (current.type !== "児童・生徒") {
 insertIndex = i;
 break;
 }
 if (compareStudentOrder(teacher, current) < 0) {
 insertIndex = i;
 break;
 }
 }
 teachers.splice(insertIndex, 0, teacher);
 return;
 }
 teachers.push(teacher);
}
function sortTeachers(items) {
 if (!sortState.length) return [...items];
 return [...items].sort((a, b) => {
 for (const rule of sortState) {
 const result = compareValues(a[rule.key], b[rule.key]);
 if (result !== 0) {
 return rule.direction === "asc" ? result : -result;
 }
 }
 return 0;
 });
}
function hasActiveFilters() {
 return Boolean(
 filterType.value ||
 filterGrade.value ||
 filterClass.value ||
 filterDuplicate.value ||
 normalizeText(filterName.value)
 );
}
function hasActiveSorting() {
 return sortState.length > 0;
}
function canDragRows() {
 return !hasActiveSorting() && !hasActiveFilters();
}
function getDragBlockReason() {
 if (hasActiveSorting()) {
 return "Przeciąganie działa tylko przy wyłączonym sortowaniu.";
 }
 if (hasActiveFilters()) {
 return "Przeciąganie działa tylko bez aktywnych filtrów i wyszukiwania.";
 }
 return "";
}
function updateSortButtons() {
 const buttons = document.querySelectorAll(".sort-btn");
 buttons.forEach(btn => {
 const baseLabel = btn.dataset.label || btn.textContent.replace(/\s*[▲▼]\d*$/, "").trim();
