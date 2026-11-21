(() => {
  const root = document.getElementById("root");
  if (!root) return;

  const hijriMonths = {
    "Muharram": "Muharram",
    "Safar": "Safar",
    "Rabi I": "Rabi' al-Awwal",
    "Rabi II": "Rabi' al-Thani",
    "Jumada I": "Jumada al-Awwal",
    "Jumada II": "Jumada al-Thani",
    "Rajab": "Rajab",
    "Sha'ban": "Sha'ban",
    "Ramadan": "Ramadan",
    "Shawwal": "Shawwal",
    "Dhu al-Qi'dah": "Dhu al-Qi'dah",
    "Dhu al-Hijjah": "Dhu al-Hijjah"
  };
  const forecastIcon = '<path d="M20 16.2A4.5 4.5 0 0 0 17 8h-1.3A7 7 0 1 0 8 18h8.5a3.5 3.5 0 0 0 3.5-1.8Z"></path>';
  let forecastMode = false;
  let openingForecast = false;
  let pendingForecastScroll = false;
  let refreshQueued = false;

  const getHijriDate = (date = new Date()) => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        calendar: "islamic-umalqura",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).formatToParts(date);
      const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
      if (values.day && values.month && values.year) {
        return `${values.day} ${hijriMonths[values.month] || values.month} ${values.year} AH`;
      }
    } catch (error) {
      console.warn("[ATMOS] Unable to format today's Hijri date:", error);
    }
    return "Hijri date unavailable";
  };

  const getTodayLabel = (date = new Date()) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric"
    }).format(date);

  const leaveForecast = () => {
    forecastMode = false;
    pendingForecastScroll = false;
    root.querySelectorAll(".atmos-forecast-view").forEach((dashboard) =>
      dashboard.classList.remove("atmos-forecast-view")
    );
    root.querySelectorAll(".atmos-forecast-active").forEach((button) => {
      button.classList.remove("atmos-forecast-active");
      button.setAttribute("aria-current", "false");
    });
  };

  const updateDateLabels = (tools) => {
    const today = tools.querySelector(".atmos-today-label");
    const hijri = tools.querySelector(".atmos-hijri-date");
    if (today) today.textContent = `TODAY · ${getTodayLabel()}`;
    if (hijri) hijri.textContent = getHijriDate();
  };

  const getDashboard = () => {
    const main = root.querySelector("main");
    const dashboard = main?.firstElementChild?.firstElementChild;
    return dashboard?.innerText.toLowerCase().includes("selected station") ? dashboard : null;
  };

  const addSearchBar = (dashboard) => {
    let tools = dashboard.querySelector(":scope > [data-atmos-dashboard-tools]");
    if (tools) {
      updateDateLabels(tools);
      return;
    }

    tools = document.createElement("div");
    tools.className = "atmos-home-tools";
    tools.dataset.atmosDashboardTools = "";
    tools.innerHTML = `
      <div class="atmos-today-context" aria-label="Today's date">
        <span class="atmos-today-label"></span>
        <span class="atmos-hijri-date"></span>
      </div>
      <form class="atmos-home-search" role="search" aria-label="Search weather locations">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7"></circle>
          <path d="m20 20-4-4"></path>
        </svg>
        <input type="search" name="location" autocomplete="off" enterkeyhint="search"
          aria-label="Search for a city or airport" placeholder="Search a city or airport">
        <button type="submit">Search</button>
      </form>`;
    dashboard.insertBefore(tools, dashboard.firstElementChild);
    updateDateLabels(tools);
    tools.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const query = tools.querySelector("input").value.trim();
      if (!query) {
        tools.querySelector("input").focus();
        return;
      }

      const header = root.querySelector("header");
      const searchButton = [...(header?.querySelectorAll("button") || [])].find((button) =>
        !button.innerText.trim() &&
        button.querySelector("svg") &&
        !button.className.includes("md:hidden")
      );
      if (!searchButton) {
        console.error("[ATMOS] Location search control is unavailable.");
        return;
      }
      forecastMode = false;
      searchButton.click();
      window.setTimeout(() => {
        const searchInput = [...root.querySelectorAll("main input")].find((input) =>
          input.placeholder.toLowerCase().includes("city")
        );
        if (!searchInput) {
          console.error("[ATMOS] Location search field did not open.");
          return;
        }
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        if (!setter) {
          console.error("[ATMOS] Unable to populate the location search field.");
          return;
        }
        setter.call(searchInput, query);
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        searchInput.focus();
      }, 120);
    });
  };

  const updateNavigation = () => {
    root.querySelectorAll("button").forEach((button) => {
      const label = [...button.querySelectorAll("span")].find((span) =>
        ["Saved", "Forecast", "Search"].includes(span.textContent.trim())
      );
      if (!label) return;

      if (label.textContent.trim() === "Search") {
        button.hidden = true;
        button.setAttribute("aria-hidden", "true");
        button.tabIndex = -1;
        return;
      }

      label.textContent = "Forecast";
      button.dataset.atmosForecastTab = "";
      const icon = button.querySelector("svg");
      if (icon && icon.innerHTML !== forecastIcon) icon.innerHTML = forecastIcon;
      button.setAttribute("aria-current", forecastMode ? "page" : "false");
      button.classList.toggle("atmos-forecast-active", forecastMode);
    });
  };

  const updateDashboard = () => {
    const dashboard = getDashboard();
    if (!dashboard) {
      updateNavigation();
      return;
    }

    dashboard.classList.add("atmos-dashboard-root");
    addSearchBar(dashboard);
    const sections = [...dashboard.children].filter((child) =>
      !child.hasAttribute("data-atmos-dashboard-tools")
    );
    sections.forEach((section, index) => {
      section.dataset.atmosDashboardIndex = String(index);
      section.removeAttribute("data-atmos-forecast-card");
    });

    const forecastSection = sections.find((section) =>
      /16-day|15-day|chronological projections|weather forecast/i.test(section.innerText)
    );
    if (forecastSection) {
      forecastSection.dataset.atmosForecastCard = "";
      const title = [...forecastSection.querySelectorAll("span")].find((span) =>
        /16-day|15-day|chronological projections|weather forecast/i.test(span.textContent)
      );
      if (title) title.textContent = "15-DAY WEATHER FORECAST";
      const forecastDays = forecastSection.querySelector(".overflow-x-auto");
      [...(forecastDays?.children || [])].forEach((day, index) => {
        day.hidden = index >= 15;
      });
    }

    dashboard.classList.toggle("atmos-forecast-view", forecastMode);
    updateNavigation();

    document.body.classList.toggle("atmos-hour-modal-open", Boolean(root.querySelector(".theme-pill-modal")));
    if (forecastMode && forecastSection && pendingForecastScroll) {
      pendingForecastScroll = false;
      window.requestAnimationFrame(() =>
        forecastSection.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    }
  };

  const scheduleRefresh = () => {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
      refreshQueued = false;
      document.body.classList.toggle("atmos-hour-modal-open", Boolean(root.querySelector(".theme-pill-modal")));
      updateDashboard();
    });
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button?.hasAttribute("data-atmos-forecast-tab")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      forecastMode = true;
      pendingForecastScroll = true;
      updateDashboard();
      openingForecast = true;
      const brand = [...root.querySelectorAll("header span")].find((span) =>
        span.textContent.trim() === "ATMOS"
      );
      if (!brand) {
        openingForecast = false;
        console.error("[ATMOS] Unable to return to the dashboard for the forecast.");
        return;
      }
      brand.click();
      const menu = root.querySelector('[class*="animate-slide-in-right"]');
      if (menu?.getClientRects().length) {
        menu.querySelector("button")?.click();
      }
      openingForecast = false;
      window.setTimeout(scheduleRefresh, 80);
      return;
    }

    const brand = event.target.closest("header span");
    if (forecastMode && !openingForecast && brand?.textContent.trim() === "ATMOS") {
      leaveForecast();
    }

    if (forecastMode && button && !openingForecast) leaveForecast();
    scheduleRefresh();
  }, true);

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(root, { childList: true, characterData: true, subtree: true });
  scheduleRefresh();
  window.setInterval(() => {
    const tools = root.querySelector("[data-atmos-dashboard-tools]");
    if (tools) updateDateLabels(tools);
  }, 60_000);
})();
