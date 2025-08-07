const STORAGE_KEY = "IJplus-version-check-date";
const LOCAL_VERSION = chrome.runtime.getManifest().version;
const LOCAL_KEY = "";
const OVERLAY_ID = "ijplus-steam-overlay";
let Rank = "";
function isNewerVersion(latest, current) {
  const a = latest.split(".").map(Number);
  const b = current.split(".").map(Number);
  for (let i = 0; i < a.length; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

// Get user rank
chrome.runtime.sendMessage({ type: "getRank" }, (response) => {
  if (response && response.result) {
    Rank = response.result;
  }
});

function getToday() {
  return new Date().toISOString().slice(0, 10);
}
// Custom fetch implementation
window.fetch = function (url, options = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const method = options.method || "GET";

    xhr.open(method, url, true);

    // Set headers if provided
    if (options.headers) {
      for (const key in options.headers) {
        xhr.setRequestHeader(key, options.headers[key]);
      }
    }

    xhr.responseType = "text";

    xhr.onload = function () {
      const response = {
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText,
        text: () => Promise.resolve(xhr.responseText),
        json: () => {
          try {
            return Promise.resolve(JSON.parse(xhr.responseText));
          } catch (err) {
            return Promise.reject(err);
          }
        },
      };
      resolve(response);
    };

    xhr.onerror = function () {
      reject(new TypeError("Network request failed"));
    };

    xhr.ontimeout = function () {
      reject(new TypeError("Network request timed out"));
    };

    xhr.send(options.body || null);
  });
};

// Version checking
function checkVersionWithXHR() {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url =
      "https://raw.githubusercontent.com/jin-zhao-teh/jin-zhao-teh.github.io/refs/heads/main/IJplus/Version/.txt";

    xhr.open("GET", url, true);

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(xhr.responseText.trim());
        } else {
          reject(new Error("Failed to fetch latest version: " + xhr.status));
        }
      }
    };

    xhr.send();
  });
}

// Script runner
function runScript(file) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "injectScript",
        file,
      },
      (response) => {
        // Check if we should close the overlay
        chrome.storage.local.get(["ijplus-close-on-execute"], (result) => {
          if (result["ijplus-close-on-execute"] !== false) {
            // Defaults to true
            overlay.style.display = "none";
          }

          // Handle response
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError.message);
          } else if (response?.error) {
            reject(response.error);
          } else {
            resolve(response.results);
          }
        });
      }
    );
  });
}

// Notification system
const showNotification = (() => {
  const queue = [];
  let isShowing = false;

  function getContainer() {
    if (!window._notifContainer) {
      const container = document.createElement("div");
      container.id = "sharp-glassy-container";
      Object.assign(container.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column-reverse",
        alignItems: "flex-end",
        gap: "10px",
        pointerEvents: "none",
        maxWidth: "300px",
        fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
      });
      document.body.appendChild(container);
      window._notifContainer = container;
    }
    return window._notifContainer;
  }

  function createBox(content, isMessage = false) {
    const box = document.createElement("div");
    box.innerHTML = content;
    Object.assign(box.style, {
      width: "100%",
      padding: isMessage ? "16px 18px" : "12px 16px",
      backgroundColor: "rgba(30, 30, 30, 0.6)",
      color: "#f0f0f0",
      fontSize: isMessage ? "14px" : "12px",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      borderRadius: "8px",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
      boxSizing: "border-box",
      wordBreak: "break-word",
      userSelect: "none",
      fontWeight: isMessage ? "normal" : "600",
      lineHeight: "1.5",
    });
    return box;
  }

  async function showNext() {
    if (isShowing || queue.length === 0) return;
    isShowing = true;

    const { title, message, duration = 5000 } = queue.shift();
    const container = getContainer();

    const notif = document.createElement("div");
    Object.assign(notif.style, {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      width: "100%",
      opacity: "0",
      transform: "translateX(100%)",
      transition: "opacity 0.3s ease, transform 0.3s ease",
      pointerEvents: "auto",
    });

    const titleBox = createBox(title, false);
    const messageBox = createBox(message, true);

    notif.appendChild(titleBox);
    notif.appendChild(messageBox);
    container.appendChild(notif);

    notif.getBoundingClientRect(); // force reflow
    notif.style.opacity = "1";
    notif.style.transform = "translateX(0)";

    await new Promise((res) => setTimeout(res, duration));

    notif.style.opacity = "0";
    notif.style.transform = "translateX(100%)";
    notif.addEventListener(
      "transitionend",
      () => {
        notif.remove();
        if (!container.hasChildNodes()) {
          container.remove();
          window._notifContainer = null;
        }
        isShowing = false;
        showNext();
      },
      { once: true }
    );
  }

  return function (...notifications) {
    notifications.forEach((n) => {
      if (typeof n === "string") {
        queue.push({ title: "Notification", message: n });
      } else {
        queue.push(n);
      }
    });
    showNext();
  };
})();
// Version check
async function maybeCheckVersion() {
  const today = getToday();

  chrome.storage.local.get([STORAGE_KEY], async (result) => {
    if (result[STORAGE_KEY] === today) return;

    try {
      const latestVersion = await checkVersionWithXHR();

      if (isNewerVersion(latestVersion, LOCAL_VERSION)) {
        showNotification(`🔄 New IJplus version available: ${latestVersion}`);
      } else {
        console.log("IJplus is up to date");
      }

      chrome.storage.local.set({ [STORAGE_KEY]: today });
    } catch (err) {
      console.error(err);
    }
  });
}

// Create the overlay
function createOverlay() {
  if (document.getElementById("ij-overlay")) return;

  // === Overlay Container ===
  const overlay = document.createElement("div");
  overlay.id = "ij-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    backdropFilter: "blur(10px)",
    backgroundColor: "rgba(35, 35, 35, 0.45)",
    zIndex: "99999",
    display: "none",
  });
  document.body.appendChild(overlay);

  // === Tabs Panel ===
  const tabPanel = document.createElement("div");
  tabPanel.id = "ij-tabs";
  Object.assign(tabPanel.style, {
    position: "absolute",
    top: "20px",
    left: "20px",
    width: "220px",
    background: "#121212",
    color: "white",
    fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
    boxShadow: "0 5px 25px rgba(0,0,0,0.7)",
    userSelect: "none",
    borderRadius: "10px",
    overflow: "hidden",
  });

  // Tab Panel Header
  const tabPanelHeader = document.createElement("div");
  tabPanelHeader.textContent = "IJplus Tools";
  Object.assign(tabPanelHeader.style, {
    background: "linear-gradient(to right, #1a1a1a, #2a2a2a)",
    padding: "14px 18px",
    fontSize: "15px",
    fontWeight: "600",
    borderBottom: "1px solid #333",
    cursor: "move",
  });

  const tabs = [
    "Reading Plus",
    "Math Buddy",
    "Ludi",
    "Executor",
    "Console",
    "Settings",
  ];
  const tabList = document.createElement("div");
  Object.assign(tabList.style, {
    padding: "12px 10px",
  });
  let activeTab = null;

  tabs.forEach((tab) => {
    const tabBtn = document.createElement("div");
    tabBtn.textContent = tab;
    Object.assign(tabBtn.style, {
      padding: "12px 14px",
      margin: "8px 0",
      background: "#1e1e1e",
      color: "#ccc",
      cursor: "pointer",
      transition: "all 0.25s ease",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "500",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    });

    tabBtn.addEventListener("mouseover", () => {
      if (tabBtn !== activeTab) tabBtn.style.background = "#252525";
    });
    tabBtn.addEventListener("mouseout", () => {
      if (tabBtn !== activeTab) tabBtn.style.background = "#1e1e1e";
    });
    tabBtn.addEventListener("click", () => {
      if (activeTab) {
        activeTab.style.background = "#1e1e1e";
        activeTab.style.color = "#ccc";
      }
      Object.assign(tabBtn.style, {
        background: "linear-gradient(to right, #2e86de, #1e6ec7)",
        color: "#fff",
      });
      activeTab = tabBtn;
      renderContent(tab);
    });

    tabList.appendChild(tabBtn);
  });

  tabPanel.appendChild(tabPanelHeader);
  tabPanel.appendChild(tabList);
  overlay.appendChild(tabPanel);

  // === Content Panel ===
  const contentPanel = document.createElement("div");
  contentPanel.id = "ij-content";
  Object.assign(contentPanel.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "680px",
    height: "480px",
    transform: "translate(-50%, -50%)",
    background: "#161616",
    color: "white",
    fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
    boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
    resize: "both",
    overflow: "hidden",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
  });

  // Content Panel Header
  const contentHeader = document.createElement("div");
  Object.assign(contentHeader.style, {
    background: "linear-gradient(to right, #1a1a1a, #2a2a2a)",
    padding: "16px 20px",
    fontSize: "16px",
    fontWeight: "600",
    borderBottom: "1px solid #333",
    cursor: "move",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  });

  const contentTitle = document.createElement("div");
  contentTitle.textContent = "IJplus Dashboard";
  contentHeader.appendChild(contentTitle);

  // Close button
  const closeButton = document.createElement("div");
  closeButton.innerHTML = "&times;";
  Object.assign(closeButton.style, {
    cursor: "pointer",
    fontSize: "22px",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
    transition: "all 0.2s",
    color: "#aaa",
  });
  closeButton.addEventListener("mouseover", () => {
    closeButton.style.background = "#333";
    closeButton.style.color = "#fff";
  });
  closeButton.addEventListener("mouseout", () => {
    closeButton.style.background = "transparent";
    closeButton.style.color = "#aaa";
  });
  closeButton.addEventListener("click", () => {
    overlay.style.display = "none";
  });
  contentHeader.appendChild(closeButton);

  // Content body
  const contentBody = document.createElement("div");
  Object.assign(contentBody.style, {
    padding: "20px",
    overflow: "auto",
    flex: "1",
    background: "radial-gradient(circle at center, #1a1a1a 0%, #121212 100%)",
  });

  contentPanel.appendChild(contentHeader);
  contentPanel.appendChild(contentBody);
  overlay.appendChild(contentPanel);

  // Welcome message
  contentBody.innerHTML = `
    <div style="text-align: center; padding: 40px 20px;">
      <div style="display: flex; justify-content: center; margin-bottom: 30px;">
        <div style="background: linear-gradient(135deg, #2e86de, #1e6ec7); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
        </div>
      </div>
      
      <h2 style="color: #2e86de; font-size: 28px; margin-bottom: 25px; font-weight: 700;">Welcome to IJplus</h2>
      
      <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 40px; flex-wrap: wrap;">
        <div style="background: rgba(30, 30, 30, 0.7); padding: 16px 24px; border-radius: 12px; min-width: 200px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);">
          <div style="font-size: 14px; color: #aaa; margin-bottom: 10px;">Shortcut</div>
          <kbd style="background: rgba(42, 42, 42, 0.8); padding: 8px 16px; border-radius: 8px; font-size: 15px; display: inline-block; min-width: 60px;">F8</kbd>
          <div style="font-size: 14px; color: #ccc; margin-top: 12px;">Toggle Overlay</div>
        </div>
        <div style="background: rgba(30, 30, 30, 0.7); padding: 16px 24px; border-radius: 12px; min-width: 200px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);">
          <div style="font-size: 14px; color: #aaa; margin-bottom: 10px;">Shortcut</div>
          <kbd style="background: rgba(42, 42, 42, 0.8); padding: 8px 16px; border-radius: 8px; font-size: 15px; display: inline-block; min-width: 60px;">ESC</kbd>
          <div style="font-size: 14px; color: #ccc; margin-top: 12px;">Close Overlay</div>
        </div>
      </div>
      
      <div style="margin: 40px 0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 30px;">
        <p style="color: #888; margin-bottom: 25px; font-size: 16px; letter-spacing: 0.5px;">AVAILABLE TOOLS</p>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; max-width: 600px; margin: 0 auto;">
          <div style="background: rgba(26, 26, 26, 0.7); padding: 20px; border-radius: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);">
            <div style="color: #2e86de; font-weight: 600; margin-bottom: 12px; font-size: 16px;">Executor</div>
            <div style="color: #aaa; font-size: 14px; line-height: 1.6;">Run custom JavaScript code with our sandboxed environment</div>
          </div>
          <div style="background: rgba(26, 26, 26, 0.7); padding: 20px; border-radius: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);">
            <div style="color: #2e86de; font-weight: 600; margin-bottom: 12px; font-size: 16px;">Console</div>
            <div style="color: #aaa; font-size: 14px; line-height: 1.6;">View system messages and debug logs in real-time</div>
          </div>
          <div style="background: rgba(26, 26, 26, 0.7); padding: 20px; border-radius: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);">
            <div style="color: #2e86de; font-weight: 600; margin-bottom: 12px; font-size: 16px;">Settings</div>
            <div style="color: #aaa; font-size: 14px; line-height: 1.6;">Configure preferences and extension behavior</div>
          </div>
          <div style="background: rgba(26, 26, 26, 0.7); padding: 20px; border-radius: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);">
            <div style="color: #2e86de; font-weight: 600; margin-bottom: 12px; font-size: 16px;">Reading Plus</div>
            <div style="color: #aaa; font-size: 14px; line-height: 1.6;">Educational tools for enhanced learning experience</div>
          </div>
        </div>
      </div>
      
      <div style="color: #666; margin-top: 40px; font-size: 13px;">
        <p>Drag windows by their headers • Resize using bottom-right corner</p>
        <p style="margin-top: 15px; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span>Made with</span>
          <span style="color: #e74c3c;">❤️</span>
          <span>for educational purposes</span>
        </p>
      </div>
    </div>
  `;

  // Render content for each tab
  function renderContent(tab) {
    contentBody.innerHTML = "";

    if (tab === "Executor") {
      const title = document.createElement("div");
      title.textContent = "IJplus Executor";
      Object.assign(title.style, {
        fontSize: "20px",
        color: "#2ecc71",
        marginBottom: "20px",
        fontWeight: "600",
      });

      const codeArea = document.createElement("textarea");
      Object.assign(codeArea.style, {
        width: "100%",
        height: "280px",
        background: "rgba(0, 0, 0, 0.5)",
        color: "#0f0",
        border: "1px solid rgba(255,255,255,0.1)",
        fontFamily: "'Fira Code', 'Consolas', monospace",
        fontSize: "14px",
        padding: "15px",
        resize: "vertical",
        boxSizing: "border-box",
        borderRadius: "8px",
        backdropFilter: "blur(5px)",
      });
      codeArea.placeholder = "// Write your JavaScript code here...";

      const runBtn = document.createElement("button");
      runBtn.textContent = "Run Code";
      Object.assign(runBtn.style, {
        background: "linear-gradient(to right, #2ecc71, #27ae60)",
        color: "white",
        border: "none",
        padding: "12px 24px",
        fontSize: "15px",
        cursor: "pointer",
        borderRadius: "8px",
        fontWeight: "600",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        transition: "all 0.2s",
      });
      runBtn.addEventListener("mouseover", () => {
        runBtn.style.transform = "translateY(-2px)";
        runBtn.style.boxShadow = "0 6px 15px rgba(0,0,0,0.4)";
      });
      runBtn.addEventListener("mouseout", () => {
        runBtn.style.transform = "translateY(0)";
        runBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
      });
      runBtn.onclick = () => {
        try {
          const script = document.createElement("script");
          script.innerHTML = codeArea.value;
          document.body.append(script);
          showNotification({
            title: "Executor",
            message: "Code executed successfully",
          });
        } catch (e) {
          showNotification({ title: "Executor Error", message: e.toString() });
        }
      };

      const clearBtn = document.createElement("button");
      clearBtn.textContent = "Clear";
      Object.assign(clearBtn.style, {
        background: "rgba(231, 76, 60, 0.8)",
        color: "white",
        border: "none",
        padding: "12px 24px",
        fontSize: "15px",
        cursor: "pointer",
        borderRadius: "8px",
        fontWeight: "600",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        transition: "all 0.2s",
      });
      clearBtn.addEventListener("mouseover", () => {
        clearBtn.style.transform = "translateY(-2px)";
        clearBtn.style.boxShadow = "0 6px 15px rgba(0,0,0,0.4)";
      });
      clearBtn.addEventListener("mouseout", () => {
        clearBtn.style.transform = "translateY(0)";
        clearBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
      });
      clearBtn.onclick = () => (codeArea.value = "");

      const buttonRow = document.createElement("div");
      Object.assign(buttonRow.style, {
        display: "flex",
        gap: "15px",
        marginTop: "20px",
        justifyContent: "flex-end",
      });
      buttonRow.appendChild(clearBtn);
      buttonRow.appendChild(runBtn);

      contentBody.appendChild(title);
      contentBody.appendChild(codeArea);
      contentBody.appendChild(buttonRow);
    } else if (tab === "Console") {
      const title = document.createElement("div");
      title.textContent = "System Console";
      Object.assign(title.style, {
        fontSize: "20px",
        color: "#2ecc71",
        marginBottom: "20px",
        fontWeight: "600",
      });

      const consoleOutput = document.createElement("div");
      consoleOutput.id = "ij-console-output";
      Object.assign(consoleOutput.style, {
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        color: "#0f0",
        height: "340px",
        padding: "15px",
        overflowY: "auto",
        fontFamily: "'Fira Code', 'Consolas', monospace",
        whiteSpace: "pre-wrap",
        borderRadius: "8px",
        backdropFilter: "blur(5px)",
        border: "1px solid rgba(255,255,255,0.1)",
      });

      const clearBtn = document.createElement("button");
      clearBtn.textContent = "Clear Console";
      Object.assign(clearBtn.style, {
        background: "rgba(231, 76, 60, 0.8)",
        color: "white",
        border: "none",
        padding: "12px 24px",
        fontSize: "15px",
        cursor: "pointer",
        borderRadius: "8px",
        fontWeight: "600",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        transition: "all 0.2s",
        marginTop: "20px",
      });
      clearBtn.addEventListener("mouseover", () => {
        clearBtn.style.transform = "translateY(-2px)";
        clearBtn.style.boxShadow = "0 6px 15px rgba(0,0,0,0.4)";
      });
      clearBtn.addEventListener("mouseout", () => {
        clearBtn.style.transform = "translateY(0)";
        clearBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
      });
      clearBtn.onclick = () => (consoleOutput.innerHTML = "");

      contentBody.appendChild(title);
      contentBody.appendChild(consoleOutput);
      contentBody.appendChild(clearBtn);
    } else if (tab === "Reading Plus") {
      // Create main title
      const title = document.createElement("h2");
      title.textContent = "Reading Plus Tools";
      Object.assign(title.style, {
        color: "#2e86de",
        marginBottom: "20px",
        fontSize: "22px",
        fontWeight: "700",
      });
      contentBody.appendChild(title);

      // Create rank indicator
      const rankContainer = document.createElement("div");
      Object.assign(rankContainer.style, {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "25px",
        padding: "12px 16px",
        background: "rgba(26, 26, 26, 0.7)",
        borderRadius: "10px",
        backdropFilter: "blur(5px)",
        border: "1px solid rgba(255,255,255,0.1)",
      });

      const rankLabel = document.createElement("div");
      rankLabel.textContent = "Your Plan:";
      rankLabel.style.color = "#aaa";
      rankLabel.style.fontSize = "15px";

      const rankIndicator = document.createElement("div");
      rankIndicator.textContent = Rank;
      Object.assign(rankIndicator.style, {
        color: "#ffcc00",
        fontWeight: "700",
        padding: "6px 16px",
        background: "rgba(42, 42, 42, 0.8)",
        borderRadius: "20px",
        fontSize: "14px",
        letterSpacing: "0.5px",
      });

      rankContainer.appendChild(rankLabel);
      rankContainer.appendChild(rankIndicator);
      contentBody.appendChild(rankContainer);

      // Create sections container
      const sectionsContainer = document.createElement("div");
      sectionsContainer.style.display = "flex";
      sectionsContainer.style.flexDirection = "column";
      sectionsContainer.style.gap = "30px";
      contentBody.appendChild(sectionsContainer);

      // Helper function to create buttons
      function createButton(text, color, onClick) {
        const button = document.createElement("button");
        button.textContent = text;
        Object.assign(button.style, {
          background: `linear-gradient(to right, ${color}, ${adjustColor(
            color,
            -20
          )})`,
          color: "white",
          border: "none",
          padding: "12px 20px",
          fontSize: "15px",
          cursor: "pointer",
          borderRadius: "8px",
          transition: "all 0.2s",
          minWidth: "180px",
          fontWeight: "600",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        });
        button.addEventListener("mouseover", () => {
          button.style.transform = "translateY(-3px)";
          button.style.boxShadow = "0 6px 15px rgba(0,0,0,0.4)";
        });
        button.addEventListener("mouseout", () => {
          button.style.transform = "translateY(0)";
          button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
        });
        button.addEventListener("click", onClick);
        return button;
      }

      // Helper to adjust color for gradients
      function adjustColor(color, amount) {
        const clamp = (val) => Math.min(Math.max(val, 0), 255);
        let r = parseInt(color.substring(1, 3), 16);
        let g = parseInt(color.substring(3, 5), 16);
        let b = parseInt(color.substring(5, 7), 16);

        return `#${clamp(r + amount)
          .toString(16)
          .padStart(2, "0")}${clamp(g + amount)
          .toString(16)
          .padStart(2, "0")}${clamp(b + amount)
          .toString(16)
          .padStart(2, "0")}`;
      }

      // Helper function to create sections
      function createSection(title, subtitle = null) {
        const section = document.createElement("div");

        const sectionTitle = document.createElement("h3");
        sectionTitle.textContent = title;
        Object.assign(sectionTitle.style, {
          color: "#2ecc71",
          marginBottom: "10px",
          fontSize: "18px",
          fontWeight: "600",
        });
        section.appendChild(sectionTitle);

        if (subtitle) {
          const sectionSubtitle = document.createElement("div");
          sectionSubtitle.textContent = subtitle;
          sectionSubtitle.style.color = "#aaa";
          sectionSubtitle.style.fontSize = "14px";
          sectionSubtitle.style.marginBottom = "15px";
          section.appendChild(sectionSubtitle);
        }

        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.flexWrap = "wrap";
        buttonContainer.style.gap = "15px";
        section.appendChild(buttonContainer);

        return { section, buttonContainer };
      }
      function createSubtitle(text, parentElement, options = {}) {
        const subtitle = document.createElement("div");
        subtitle.textContent = text;

        // Default styling
        Object.assign(subtitle.style, {
          color: "#aaa",
          fontSize: "14px",
          marginBottom: "15px",
          fontWeight: "500",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        });

        // Override with any custom styles
        if (options.styles) {
          Object.assign(subtitle.style, options.styles);
        }

        // Add any custom classes
        if (options.className) {
          subtitle.className = options.className;
        }

        parentElement.appendChild(subtitle);
        return subtitle;
      }

      // SeeReader Section
      const { section: seeReaderSection, buttonContainer: seeReaderButtons } =
        createSection("SeeReader");
      sectionsContainer.appendChild(seeReaderSection);

      // Copy Question button
      seeReaderButtons.appendChild(
        createButton("Copy Question", "#3498db", () => {
          runScript("scripts/ReadingPlus/CopyQuestion.js")
            .then((result) => {
              showNotification({
                title: "SeeReader",
                message: "Question copied to clipboard",
              });
            })
            .catch((error) => {
              showNotification({
                title: "IjPlus",
                message: "Failed to run script: " + error,
              });
            });
        })
      );

      // Copy Story button (emerald+)
      if (["emerald", "diamond", "platinum"].includes(Rank.toLowerCase())) {
        seeReaderButtons.appendChild(
          createButton("Copy Story", "#3498db", () => {
            runScript("scripts/ReadingPlus/CopyStory.js")
              .then((result) => {
                showNotification({
                  title: "SeeReader",
                  message: "Story copied to clipboard",
                });
              })
              .catch((error) => {
                showNotification({
                  title: "IjPlus",
                  message: "Failed to run script: " + error,
                });
              });
          })
        );
      }

      // Ibalance Section (silver+)
      if (!["bronze"].includes(Rank.toLowerCase())) {
        // ===== IBALANCE SECTION (SILVER+ USERS) =====
        const { section: ibalanceSection, buttonContainer: ibalanceButtons } =
          createSection("Ibalance");
        sectionsContainer.appendChild(ibalanceSection);

        // ---- Flash Button (Silver+) ----
        ibalanceButtons.appendChild(
          createButton("Complete Flash", "#e67e22", () => {
            runScript("scripts/ReadingPlus/CompleteFlash.js")
              .then(() => {
                showNotification({
                  title: "Ibalance - Flash",
                  message: "Completing Flash, press Space twice when ready",
                });
              })
              .catch((error) => {
                showNotification({
                  title: "IjPlus",
                  message: "Failed to run script: " + error,
                });
              });
          })
        );

        // ===== SCAN SUBTITLE & CONTROLS (GOLD+ USERS) =====
        if (
          ["gold", "emerald", "diamond", "platinum"].includes(
            Rank.toLowerCase()
          )
        ) {
          // ---- Scan Subtitle ----
          createSubtitle("Scan", ibalanceButtons, {
            color: "#9b59b6",
            icon: "🔍", // Optional magnifying glass icon
            iconColor: "#9b59b6", // Matches purple theme
            borderLeft: "3px solid #9b59b6", // Accent bar
          });

          // ---- Scan Controls Container ----
          const scanControls = document.createElement("div");
          Object.assign(scanControls.style, {
            background: "rgba(26, 26, 26, 0.7)",
            borderRadius: "10px",
            padding: "15px",
            marginBottom: "15px",
            border: "1px solid rgba(155, 89, 182, 0.2)",
          });

          // ---- Percentage Input ----
          const inputContainer = document.createElement("div");
          inputContainer.style.display = "flex";
          inputContainer.style.justifyContent = "space-between";
          inputContainer.style.alignItems = "center";
          inputContainer.style.marginBottom = "10px";

          const percentageLabel = document.createElement("label");
          percentageLabel.textContent = "Correct Percentage:";
          percentageLabel.style.color = "#aaa";

          const percentageInput = document.createElement("input");
          percentageInput.type = "number";
          percentageInput.min = "0";
          percentageInput.max = "100";
          percentageInput.value = "100";
          Object.assign(percentageInput.style, {
            width: "70px",
            padding: "8px",
            background: "rgba(34, 34, 34, 0.8)",
            color: "#9b59b6",
            border: "1px solid rgba(155, 89, 182, 0.5)",
            borderRadius: "6px",
            fontWeight: "600",
            textAlign: "center",
          });

          inputContainer.appendChild(percentageLabel);
          inputContainer.appendChild(percentageInput);
          scanControls.appendChild(inputContainer);

          // ---- Slider ----
          const slider = document.createElement("input");
          slider.type = "range";
          slider.min = "0";
          slider.max = "100";
          slider.value = "100";
          Object.assign(slider.style, {
            width: "100%",
            height: "8px",
            background:
              "linear-gradient(to right, #9b59b6 0%, #9b59b6 100%, #333 100%, #333 100%)",
            borderRadius: "4px",
            marginBottom: "15px",
            WebkitAppearance: "none",
          });
          function updateSliderBackground(slider) {
            const value = slider.value;
            slider.style.background = `linear-gradient(to right, #9b59b6 0%, #9b59b6 ${value}%, #333 ${value}%, #333 100%)`;
          }

          // Link slider and input
          percentageInput.addEventListener("input", () => {
            slider.value = percentageInput.value;
            updateSliderBackground(slider);
          });
          slider.addEventListener("input", () => {
            percentageInput.value = slider.value;
            updateSliderBackground(slider);
          });
          scanControls.appendChild(slider);

          // ---- Scan Button ----
          const scanButton = createButton("Complete Scan", "#9b59b6", () => {
            const percentage = parseInt(percentageInput.value);
            showNotification({
              title: "Scan",
              message: `Scan completed with ${percentage}% accuracy`,
            });
            window.localStorage.setItem("correctPercentage", percentage);
            runScript("scripts/ReadingPlus/CompleteScan.js");
          });
          scanControls.appendChild(scanButton);

          ibalanceButtons.appendChild(scanControls);
        }
      }

      // Complete All button (platinum only)
      if (["platinum"].includes(Rank.toLowerCase())) {
        const completeAllSection = document.createElement("div");
        Object.assign(completeAllSection.style, {
          marginTop: "30px",
          paddingTop: "30px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        });

        const completeAllButton = createButton(
          "Complete All Activities",
          "#e74c3c",
          () => {
            showNotification({
              title: "Reading Plus",
              message: "Completing all activities",
            });
          }
        );
        Object.assign(completeAllButton.style, {
          width: "100%",
          padding: "16px",
          fontSize: "16px",
          fontWeight: "700",
        });

        completeAllSection.appendChild(completeAllButton);
        sectionsContainer.appendChild(completeAllSection);
      }

      // Info message for unsupported ranks
      if (["bronze"].includes(Rank.toLowerCase())) {
        const info = document.createElement("div");
        info.innerHTML = `
          <div style="color:#888; margin-top:30px; font-size:14px; padding:20px; background: rgba(26, 26, 26, 0.7); border-radius:10px; backdrop-filter: blur(5px); border: 1px solid rgba(255,255,255,0.1);">
            <div style="color:#2e86de; font-weight:600; margin-bottom:15px; font-size:16px;">Upgrade for Premium Features</div>
            <ul style="margin-top:15px; padding-left:0; list-style-type: none;">
              <li style="margin-bottom:12px; display: flex; align-items: center; gap: 10px;">
                <span style="display: inline-block; width: 24px; height: 24px; background: rgba(230, 126, 34, 0.2); border-radius: 50%; text-align: center; line-height: 24px; color: #e67e22;">S</span>
                <span><strong style="color:#e67e22">Silver:</strong> Ibalance tools</span>
              </li>
              <li style="margin-bottom:12px; display: flex; align-items: center; gap: 10px;">
                <span style="display: inline-block; width: 24px; height: 24px; background: rgba(155, 89, 182, 0.2); border-radius: 50%; text-align: center; line-height: 24px; color: #9b59b6;">G</span>
                <span><strong style="color:#9b59b6">Gold:</strong> Scan tools</span>
              </li>
              <li style="margin-bottom:12px; display: flex; align-items: center; gap: 10px;">
                <span style="display: inline-block; width: 24px; height: 24px; background: rgba(46, 204, 113, 0.2); border-radius: 50%; text-align: center; line-height: 24px; color: #2ecc71;">E</span>
                <span><strong style="color:#2ecc71">Emerald:</strong> Copy Story</span>
              </li>
              <li style="display: flex; align-items: center; gap: 10px;">
                <span style="display: inline-block; width: 24px; height: 24px; background: rgba(231, 76, 60, 0.2); border-radius: 50%; text-align: center; line-height: 24px; color: #e74c3c;">P</span>
                <span><strong style="color:#e74c3c">Platinum:</strong> Complete All</span>
              </li>
            </ul>
          </div>
        `;
        sectionsContainer.appendChild(info);
      }
    } else if (tab === "Settings") {
      // Clear existing content
      contentBody.innerHTML = "";

      // Title
      const title = document.createElement("h2");
      title.textContent = "IJplus Settings";
      Object.assign(title.style, {
        fontSize: "22px",
        color: "#2e86de",
        marginBottom: "25px",
        fontWeight: "700",
      });
      contentBody.appendChild(title);

      // === Toggle Switch: Close Overlay on Execution ===
      const toggleContainer = document.createElement("div");
      Object.assign(toggleContainer.style, {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "15px",
        background: "rgba(30, 30, 30, 0.7)",
        borderRadius: "10px",
        marginBottom: "20px",
        border: "1px solid rgba(255,255,255,0.1)",
      });

      const toggleLabel = document.createElement("span");
      toggleLabel.textContent = "Close overlay when script is executed";
      toggleLabel.style.color = "#eee";
      toggleLabel.style.fontSize = "15px";

      const toggleSwitch = document.createElement("label");
      toggleSwitch.className = "ijplus-switch";
      Object.assign(toggleSwitch.style, {
        position: "relative",
        display: "inline-block",
        width: "50px",
        height: "24px",
      });

      const toggleSlider = document.createElement("span");
      toggleSlider.className = "ijplus-slider";
      Object.assign(toggleSlider.style, {
        position: "absolute",
        cursor: "pointer",
        top: "0",
        left: "0",
        right: "0",
        bottom: "0",
        backgroundColor: "#444",
        transition: "0.4s",
        borderRadius: "24px",
      });

      const toggleInput = document.createElement("input");
      toggleInput.type = "checkbox";
      toggleInput.checked = true; // Default enabled
      Object.assign(toggleInput.style, {
        opacity: "0",
        width: "0",
        height: "0",
      });

      // Custom slider knob
      const toggleKnob = document.createElement("span");
      toggleKnob.className = "ijplus-knob";
      Object.assign(toggleKnob.style, {
        position: "absolute",
        content: "''",
        height: "16px",
        width: "16px",
        left: "4px",
        bottom: "4px",
        backgroundColor: "#fff",
        transition: "0.4s",
        borderRadius: "50%",
      });

      // Toggle animation
      toggleInput.addEventListener("change", function () {
        if (this.checked) {
          toggleSlider.style.backgroundColor = "#2e86de";
          toggleKnob.style.transform = "translateX(26px)";
        } else {
          toggleSlider.style.backgroundColor = "#444";
          toggleKnob.style.transform = "translateX(0)";
        }
        // Save to storage
        chrome.storage.local.set({ "ijplus-close-on-execute": this.checked });
      });

      // Load saved preference
      chrome.storage.local.get(["ijplus-close-on-execute"], (result) => {
        const isEnabled = result["ijplus-close-on-execute"] !== false; // Default true
        toggleInput.checked = isEnabled;
        if (isEnabled) {
          toggleSlider.style.backgroundColor = "#2e86de";
          toggleKnob.style.transform = "translateX(26px)";
        }
      });

      // Assemble toggle
      toggleSwitch.appendChild(toggleInput);
      toggleSwitch.appendChild(toggleSlider);
      toggleSlider.appendChild(toggleKnob);
      toggleContainer.appendChild(toggleLabel);
      toggleContainer.appendChild(toggleSwitch);
      contentBody.appendChild(toggleContainer);

      // === Version Info ===
      const versionInfo = document.createElement("div");
      Object.assign(versionInfo.style, {
        padding: "15px",
        background: "rgba(30, 30, 30, 0.5)",
        borderRadius: "10px",
        marginTop: "30px",
        textAlign: "center",
        fontSize: "13px",
        color: "#888",
      });

      versionInfo.innerHTML = `
    <div>IJplus v${LOCAL_VERSION}</div>
    <div style="margin-top: 8px;">&copy; ${new Date().getFullYear()} IJplus Tools</div>
  `;
      contentBody.appendChild(versionInfo);
    } else if (tab === "Ludi") {
      contentBody.innerHTML = ""; // Clear existing content

      // Title
      const title = document.createElement("h2");
      title.textContent = "Ludi Tools";
      title.style.cssText = `
    font-size: 22px;
    color: #2e86de;
    margin-bottom: 25px;
    font-weight: 700;
  `;
      contentBody.appendChild(title);

      // Main container
      const container = document.createElement("div");
      container.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 20px;
  `;

      // Mode selection dropdown
      const modeLabel = document.createElement("label");
      modeLabel.textContent = "Mode:";
      modeLabel.style.cssText = `
    color: #eee;
    font-size: 15px;
  `;

      const modeSelect = document.createElement("select");
      modeSelect.id = "ludi-mode";
      modeSelect.style.cssText = `
    padding: 10px;
    border-radius: 6px;
    background: #1e1e1e;
    color: #fff;
    border: 1px solid #333;
    font-size: 14px;
    width: 100%;
    margin-bottom: 15px;
  `;

      // Mode options
      const modes = [
        { value: "normal", text: "Normal" },
        { value: "playground", text: "Playground" },
      ];

      modes.forEach((mode) => {
        const option = document.createElement("option");
        option.value = mode.value;
        option.textContent = mode.text;
        modeSelect.appendChild(option);
      });

      // Subtype container
      const subtypeContainer = document.createElement("div");
      subtypeContainer.id = "ludi-subtype-container";
      subtypeContainer.style.cssText = `
    display: none;
    flex-direction: column;
    gap: 10px;
  `;

      // Subtype label
      const subtypeLabel = document.createElement("label");
      subtypeLabel.textContent = "Type:";
      subtypeLabel.style.cssText = `
    color: #eee;
    font-size: 15px;
  `;

      // Subtype dropdown
      const subtypeSelect = document.createElement("select");
      subtypeSelect.id = "ludi-subtype";
      subtypeSelect.style.cssText = `
    padding: 10px;
    border-radius: 6px;
    background: #1e1e1e;
    color: #fff;
    border: 1px solid #333;
    font-size: 14px;
    width: 100%;
  `;

      // Show Answer button
      const showAnswerBtn = document.createElement("button");
      showAnswerBtn.textContent = "Show Answer";
      showAnswerBtn.style.cssText = `
    background: linear-gradient(to right, #2ecc71, #27ae60);
    color: white;
    border: none;
    padding: 12px 24px;
    font-size: 15px;
    cursor: pointer;
    border-radius: 8px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.2s;
    margin-top: 20px;
  `;
      showAnswerBtn.addEventListener("mouseover", () => {
        showAnswerBtn.style.transform = "translateY(-2px)";
        showAnswerBtn.style.boxShadow = "0 6px 15px rgba(0,0,0,0.4)";
      });
      showAnswerBtn.addEventListener("mouseout", () => {
        showAnswerBtn.style.transform = "translateY(0)";
        showAnswerBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
      });
      showAnswerBtn.onclick = () => {
        const mode = modeSelect.value;
        const subtype = subtypeSelect.value;
        showNotification({
          title: "Ludi",
          message: `Showing answer for ${mode} mode (${subtype})`,
        });
        const stageMapping = {
          emerging: "emg",
          developing: "dev",
          growing: "gro",
          progressing: "pro",
          advancing: "avc",
          excelling: "exc",
        };
        if (mode == "normal") {
          const ludiUrl = `https://api.ludi.nz/rest/basicfacts/result/set?stage=${
            stageMapping[subtype.toLowerCase()]
          }`;
          window.localStorage.setItem("ludiUrl", ludiUrl);
        } else {
        }
        runScript("scripts/Ludi/ShowAnswers.js")
        // Add your actual answer logic here
      };

      // Mode change handler
      modeSelect.addEventListener("change", () => {
        const mode = modeSelect.value;
        subtypeContainer.style.display = "flex";

        // Clear existing options
        subtypeSelect.innerHTML = "";

        // Add new options based on mode
        if (mode === "normal") {
          const levels = [
            "Emerging",
            "Developing",
            "Growing",
            "Progressing",
            "Advancing",
            "Excelling",
          ];
          levels.forEach((level) => {
            const option = document.createElement("option");
            option.value = level.toLowerCase();
            option.textContent = level;
            subtypeSelect.appendChild(option);
          });
        } else if (mode === "playground") {
          const operations = [
            "Addition",
            "Subtraction",
            "Multiplication",
            "Division",
          ];
          operations.forEach((op) => {
            const option = document.createElement("option");
            option.value = op.toLowerCase();
            option.textContent = op;
            subtypeSelect.appendChild(option);
          });
        }
      });

      // Trigger initial mode change
      modeSelect.dispatchEvent(new Event("change"));

      // Assemble the UI
      subtypeContainer.appendChild(subtypeLabel);
      subtypeContainer.appendChild(subtypeSelect);

      container.appendChild(modeLabel);
      container.appendChild(modeSelect);
      container.appendChild(subtypeContainer);
      container.appendChild(showAnswerBtn);

      contentBody.appendChild(container);
    } else {
      // Other tabs
      const title = document.createElement("div");
      title.textContent = tab;
      Object.assign(title.style, {
        fontSize: "22px",
        color: "#2e86de",
        marginBottom: "20px",
        fontWeight: "700",
      });

      const msg = document.createElement("div");
      msg.textContent = `The ${tab} features are currently in development.`;
      msg.style.color = "#aaa";
      msg.style.marginTop = "10px";
      msg.style.fontSize = "16px";

      contentBody.appendChild(title);
      contentBody.appendChild(msg);
    }
  }

  // Make only headers draggable
  makeDraggable(tabPanelHeader, tabPanel);
  makeDraggable(contentHeader, contentPanel);

  // === F8 toggle ===
  window.addEventListener("keydown", (e) => {
    if (e.key === "F8") {
      if (!Rank) {
        showNotification({
          title: "IJplus",
          message: "No active subscription",
        });
        return;
      }
      overlay.style.display =
        overlay.style.display === "none" ? "block" : "none";
    }
    if (e.key === "Escape") {
      overlay.style.display = "none";
    }
  });

  // === Improved Draggable Windows ===
  function makeDraggable(handle, element) {
    let isDragging = false;
    let offsetX, offsetY;

    handle.addEventListener("mousedown", (e) => {
      isDragging = true;
      offsetX = e.clientX - element.offsetLeft;
      offsetY = e.clientY - element.offsetTop;
      document.body.style.userSelect = "none";
      element.style.cursor = "grabbing";
      handle.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      element.style.left = `${e.clientX - offsetX}px`;
      element.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      document.body.style.userSelect = "";
      element.style.cursor = "";
      handle.style.cursor = "";
    });
  }

  // === Resize Handles ===
  function addResizeHandle(element) {
    const handle = document.createElement("div");
    Object.assign(handle.style, {
      position: "absolute",
      bottom: "0",
      right: "0",
      width: "20px",
      height: "20px",
      cursor: "nwse-resize",
      zIndex: "10",
    });
    element.appendChild(handle);

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    handle.addEventListener("mousedown", (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = parseInt(
        document.defaultView.getComputedStyle(element).width,
        10
      );
      startHeight = parseInt(
        document.defaultView.getComputedStyle(element).height,
        10
      );
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;

      const newWidth = startWidth + (e.clientX - startX);
      const newHeight = startHeight + (e.clientY - startY);

      if (newWidth > 400) element.style.width = `${newWidth}px`;
      if (newHeight > 300) element.style.height = `${newHeight}px`;
    });

    document.addEventListener("mouseup", () => {
      isResizing = false;
    });
  }

  // Add resize handles
  addResizeHandle(tabPanel);
  addResizeHandle(contentPanel);

  // === Notification System ===
  let notifContainer = document.getElementById("ij-notif-container");
  if (!notifContainer) {
    notifContainer = document.createElement("div");
    notifContainer.id = "ij-notif-container";
    Object.assign(notifContainer.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "15px",
      zIndex: "100000",
    });
    document.body.appendChild(notifContainer);
  }

  window.showNotification = function ({ title = "IJplus", message = "" }) {
    const notif = document.createElement("div");
    Object.assign(notif.style, {
      background: "rgba(20, 20, 20, 0.8)",
      color: "#9b59b6",
      padding: "14px 18px",
      border: "1px solid rgba(155, 89, 182, 0.3)",
      fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
      maxWidth: "320px",
      whiteSpace: "pre-wrap",
      borderRadius: "10px",
      boxShadow: "0 8px 25px rgba(0,0,0,0.5)",
      backdropFilter: "blur(10px)",
      fontSize: "14px",
      lineHeight: "1.6",
    });

    notif.innerHTML = `<b style="font-size:15px; color:#2e86de;">${title}</b><br>${message}`;
    notifContainer.appendChild(notif);

    setTimeout(() => {
      notif.style.opacity = "0";
      notif.style.transform = "translateY(20px)";
      setTimeout(() => notif.remove(), 300);
    }, 4500);
  };

  window.overlay = overlay;
}

// Initialize
maybeCheckVersion();
showNotification({
  title: "IJplus",
  message: `IJplus v${LOCAL_VERSION} initialized`,
});
createOverlay();
showNotification({ title: "IJplus", message: "Loading scripts..." });
if (Rank) {
  showNotification({
    title: "IJplus",
    message: "Press F8 to toggle overlay • ESC to close",
  });
}
