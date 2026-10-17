const clearBtn = document.querySelector("#clear-btn");
const themeBtn = document.querySelector("#theme-toggle");
const text = document.querySelector("#note-text");
const characterShown = document.querySelector("#char-count");
const wordShown = document.querySelector("#word-count");

const STORAGE_KEY = "quicknotes-draft";

const saved = localStorage.getItem(STORAGE_KEY);
text.value = saved || "";

function wordCount() {
  const value = text.value.trim();
  const count = value ? value.split(/\s+/).length : 0;

  wordShown.textContent = `${count} words`;
  return count;
}

function characterCount() {
  const value = text.value;
  const count = value.length;

  characterShown.textContent = `${count} / 200 characters`;
  return count;
}

function updateCounts() {
  const character = characterCount();
  wordCount();

  characterShown.classList.toggle(
    "warning",
    character > 180 && character <= 200,
  );
  characterShown.classList.toggle("over", character > 200);
}

text.addEventListener("input", () => {
  updateCounts();
  localStorage.setItem(STORAGE_KEY, text.value);
});

clearBtn.addEventListener("click", () => {
  text.value = "";
  updateCounts();
  localStorage.setItem(STORAGE_KEY, text.value);
});

text.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    text.value = "";
    localStorage.setItem(STORAGE_KEY, text.value);
    updateCounts();
  }
});
const THEME_KEY = "quicknotes-theme";
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === "dark") {
  document.body.classList.add("dark");
}

function updateThemeButtonLabel() {
  const isDark = document.body.classList.contains("dark");
  themeBtn.textContent = isDark ? "Light Theme" : "Dark Theme";
}

updateThemeButtonLabel();

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const currentTheme = document.body.classList.contains("dark") ? "dark" : "light";
  localStorage.setItem(THEME_KEY, currentTheme);
  updateThemeButtonLabel();
});

updateCounts();