const BASE_URL = "https://hacker-news.firebaseio.com/v0";
const ITEMS_PER_PAGE = 30;
let currentStoryIds = [];
let currentPage = 0;
let currentType = "topstories";

const feedContainer = document.getElementById("feed-container");
const loadMoreBtn = document.getElementById("load-more-btn");
const navLinks = document.querySelectorAll("nav a[data-type]");

// Map UI types to API endpoints
const TYPE_MAP = {
  new: "newstories",
  past: "topstories", // HN doesn't have a direct "past" API, usually top is used
  ask: "askstories",
  show: "showstories",
  jobs: "jobstories",
};

async function fetchStoryIds(type) {
  const endpoint = TYPE_MAP[type] || "topstories";
  const response = await fetch(`${BASE_URL}/${endpoint}.json`);
  return await response.json();
}

async function fetchItem(id) {
  const response = await fetch(`${BASE_URL}/item/${id}.json`);
  return await response.json();
}

function timeAgo(timestamp) {
  const seconds = Math.floor((new Date() - timestamp * 1000) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " Y";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " M";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " D";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " H";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " M";
  return Math.floor(seconds) + " S";
}

function getDomain(url) {
  if (!url) return "";
  try {
    const domain = new URL(url).hostname;
    return `(${domain})`;
  } catch (e) {
    return "";
  }
}

function createStoryElement(story, index) {
  const absoluteIndex = currentPage * ITEMS_PER_PAGE + index + 1;
  const formattedIndex =
    absoluteIndex < 10 ? `0${absoluteIndex}` : absoluteIndex;

  const article = document.createElement("article");
  article.className =
    "group relative flex items-start py-4 px-2 rounded-lg transition-colors";

  article.innerHTML = `
    <div class="flex flex-col items-center w-8 mr-4 pt-1">
        <span class="text-base font-headline font-bold text-primary transition-colors">${formattedIndex}</span>
    </div>
    <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-baseline gap-1.5 mb-1">
            <a class="text-[15px] font-medium text-on-surface dark:text-inverse-on-surface leading-snug hover:text-primary transition-colors"
               href="${story.url || `item.html?id=${story.id}`}" ${story.url ? 'target="_blank"' : ""}>
                ${story.title}
            </a>
            <span class="text-[10px] text-secondary/60 dark:text-slate-500 font-label tracking-wide">${getDomain(story.url)}</span>
        </div>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.65rem] text-secondary font-label font-semibold tracking-wider">
            <span class="flex items-center gap-1">
            <span class="material-symbols-outlined text-[12px]">change_history</span>
            ${story.score || 0}</span>
            <span class="flex items-center gap-1">
                <span class="material-symbols-outlined text-[12px]">person</span>
                <a class="hover:text-on-surface dark:hover:text-white transition-colors underline decoration-outline-variant/30 underline-offset-2"
                   href="user.html?id=${story.by}">${story.by}</a>
            </span>
            <span class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-[12px]">schedule</span>
                ${timeAgo(story.time)}
            </span>
            <a class="flex items-center gap-1 hover:text-primary transition-colors"
               href="item.html?id=${story.id}">
                <span class="material-symbols-outlined text-[12px]">chat</span>
                ${story.descendants || 0}
            </a>
        </div>
    </div>
  `;
  return article;
}

let selectedStoryIndex = -1;

function updateActiveStory(index) {
  const stories = feedContainer.querySelectorAll("article");
  if (stories.length === 0) return;

  // Remove existing highlight
  stories.forEach((s) => s.classList.remove("active-story"));

  // Ensure index is within bounds
  selectedStoryIndex = Math.max(0, Math.min(index, stories.length - 1));

  const activeStory = stories[selectedStoryIndex];
  if (activeStory) {
    activeStory.classList.add("active-story");
    activeStory.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

async function loadStories(append = false) {
  if (!append) {
    selectedStoryIndex = -1;
    let placeholderItem = `<div class="animate-pulse flex items-start px-2 py-4 border-t border-outline-variant/10">
        <div class="w-8 h-8 bg-surface-container-highest/50 rounded mr-4"></div>
        <div class="flex-1 space-y-3">
            <div class="h-4 bg-surface-container-highest/50 rounded w-4/5"></div>
            <div class="h-3 bg-surface-container-highest/30 rounded w-1/4"></div>
        </div>
    </div>`;
    feedContainer.innerHTML = `
      <div id="feed-loader" class="space-y-4 pt-4">
          ${placeholderItem.repeat(10)}
      </div>
    `;
    currentPage = 0;
    currentStoryIds = await fetchStoryIds(currentType);
  } else {
    // Show loading state on button
    loadMoreBtn.disabled = true;
    loadMoreBtn.innerHTML = `
      <span class="flex items-center gap-2">
        <span class="material-symbols-outlined animate-spin text-[14px] uppercase">progress_activity</span>
        Loading
      </span>
    `;
  }

  const start = currentPage * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageIds = currentStoryIds.slice(start, end);

  if (pageIds.length === 0) {
    if (!append)
      feedContainer.innerHTML =
        '<div class="py-8 text-center text-secondary">No stories found.</div>';
    loadMoreBtn.classList.add("hidden");
    return;
  }

  const storyPromises = pageIds.map((id) => fetchItem(id));
  const stories = await Promise.all(storyPromises);

  // Remove loader BEFORE appending content
  const loader = document.getElementById("feed-loader");
  if (loader && !append) feedContainer.innerHTML = "";

  stories.forEach((story, index) => {
    if (story) {
      feedContainer.appendChild(createStoryElement(story, index));
    }
  });

  currentPage++;

  // Reset button state
  if (append) {
    loadMoreBtn.disabled = false;
    loadMoreBtn.innerHTML = "Load More";
  }

  if (currentPage * ITEMS_PER_PAGE >= currentStoryIds.length) {
    loadMoreBtn.classList.add("hidden");
  } else {
    loadMoreBtn.classList.remove("hidden");
  }
}

// Keyboard Navigation Event Listener
document.addEventListener("keydown", (e) => {
  // Ignore if user is typing in an input
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  const stories = feedContainer.querySelectorAll("article");
  if (stories.length === 0) return;

  switch (e.key.toLowerCase()) {
    case "k":
      updateActiveStory(selectedStoryIndex + 1);
      break;
    case "j":
      updateActiveStory(selectedStoryIndex - 1);
      break;

    case "enter":
    case "o":
      if (selectedStoryIndex !== -1) {
        const link = stories[selectedStoryIndex].querySelector("a");
        if (link) {
          if (e.shiftKey) {
            window.open(link.href, "_blank");
          } else {
            link.click();
          }
        }
      }
      break;
    case "c":
      if (selectedStoryIndex !== -1) {
        const commentsLink = stories[selectedStoryIndex].querySelector(
          'a[href^="item.html"]',
        );
        if (commentsLink) commentsLink.click();
      }
      break;
    case "u":
      if (selectedStoryIndex !== -1) {
        const userLink = stories[selectedStoryIndex].querySelector(
          'a[href^="user.html"]',
        );
        if (userLink) userLink.click();
      }
      break;
    case "?":
      if (shortcutsModal) shortcutsModal.classList.toggle("hidden");
      break;
    case "escape":
      if (shortcutsModal) shortcutsModal.classList.add("hidden");
      break;
  }
});

// Event Listeners
if (loadMoreBtn) loadMoreBtn.addEventListener("click", () => loadStories(true));

// Global variables for elements
let shortcutsModal, helpBtn, closeShortcuts;

function init() {
  // Initialize modal elements
  shortcutsModal = document.getElementById("shortcuts-modal");
  helpBtn = document.getElementById("help-btn");
  closeShortcuts = document.getElementById("close-shortcuts");

  if (helpBtn) {
    helpBtn.addEventListener("click", () => {
      shortcutsModal.classList.remove("hidden");
    });
  }

  if (closeShortcuts) {
    closeShortcuts.addEventListener("click", () => {
      shortcutsModal.classList.add("hidden");
    });
  }

  if (shortcutsModal) {
    shortcutsModal.addEventListener("click", (e) => {
      if (e.target === shortcutsModal) shortcutsModal.classList.add("hidden");
    });
  }

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const html = document.documentElement;
      const isDark = html.classList.toggle("dark");
      themeToggle.textContent = isDark ? "dark_mode" : "light_mode";
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });

    // Initialize theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      themeToggle.textContent = "light_mode";
    } else {
      document.documentElement.classList.add("dark");
      themeToggle.textContent = "dark_mode";
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const typeParam = urlParams.get("type");
  if (typeParam && TYPE_MAP[typeParam]) {
    currentType = typeParam;
    const activeLink = document.querySelector(
      `nav a[data-type="${typeParam}"]`,
    );
    if (activeLink) {
      navLinks.forEach((l) => {
        l.classList.remove(
          "text-[#2B9720]",
          "border-b-2",
          "border-[#2B9720]",
          "pb-0.5",
        );
        l.classList.add("text-slate-600", "dark:text-slate-400");
      });
      activeLink.classList.add(
        "text-[#2B9720]",
        "border-b-2",
        "border-[#2B9720]",
        "pb-0.5",
      );
      activeLink.classList.remove("text-slate-600", "dark:text-slate-400");
    }
  }
  loadStories();
}

function updateFooter() {
  const vibes = [
    'Vibe-coded with AI by <a href="https://shajanjacob.com" target="_blank" class="hover:text-primary transition-colors underline decoration-outline-variant/30">Shajan</a>',
    'AI-assisted, human-approved - <a href="https://shajanjacob.com" target="_blank" class="hover:text-primary transition-colors underline decoration-outline-variant/30">Shajan</a>',
    'Co-built with AI by <a href="https://shajanjacob.com" target="_blank" class="hover:text-primary transition-colors underline decoration-outline-variant/30">Shajan</a>',
    'Prompt → Enter → Pray - <a href="https://shajanjacob.com" target="_blank" class="hover:text-primary transition-colors underline decoration-outline-variant/30">Shajan</a>',
    '95% AI, 5% debugging - <a href="https://shajanjacob.com" target="_blank" class="hover:text-primary transition-colors underline decoration-outline-variant/30">Shajan</a>',
    'Co-authored with AI by <a href="https://shajanjacob.com" target="_blank" class="hover:text-primary transition-colors underline decoration-outline-variant/30">Shajan</a>',
  ];
  const footer = document.getElementById("footer-vibe");
  if (footer) {
    footer.innerHTML = vibes[Math.floor(Math.random() * vibes.length)];
  }
}

// Initial load
init();
updateFooter();
