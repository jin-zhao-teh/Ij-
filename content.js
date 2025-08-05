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
//send request to background to get Rank
chrome.runtime.sendMessage({ type: "getRank" }, (response) => {
  if (response && response.result) {
    Rank = response.result;
  }
});

function getToday() {
  return new Date().toISOString().slice(0, 10);
}
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

    xhr.responseType = "text"; // Default, you can change this if needed

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

function runScript(localFileName) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "injectScript", file: localFileName },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.results);
        }
      }
    );
  });
}

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
        fontFamily: "Segoe UI, sans-serif",
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
      padding: isMessage ? "20px 18px" : "14px 18px", // bigger padding for messag
      backgroundColor: "rgba(30, 30, 30, 0.4)",
      color: "#f0f0f0",
      fontSize: isMessage ? "13px" : "10px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "0px",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
      boxSizing: "border-box",
      wordBreak: "break-word",
      userSelect: "none",
      fontWeight: isMessage ? "normal" : "bold",
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
      gap: "4px",
      width: "100%",
      opacity: "0",
      transform: "translateX(100%)",
      transition: "opacity 0.3s ease, transform 0.3s ease",
      pointerEvents: "auto",
    });

    const titleBox = createBox(title, false);
    const messageBox = createBox(message, true); // true = message

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

async function maybeCheckVersion() {
  const today = getToday();

  chrome.storage.local.get([STORAGE_KEY], async (result) => {
    if (result[STORAGE_KEY] === today) {
      // Already checked today
      return;
    }

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

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function createOverlay() {
  if (document.getElementById("ij-overlay")) return;

  // === Overlay ===
  const overlay = document.createElement("div");
  overlay.id = "ij-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    backdropFilter: "blur(10px)",
    backgroundColor: "rgba(50, 50, 50, 0.4)",
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
    width: "200px",
    background: "#121212",
    color: "white",
    padding: "10px",
    fontFamily: "monospace",
    boxShadow: "0 0 10px rgba(0,0,0,0.5)",
    userSelect: "none",
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
  let activeTab = null;

  tabs.forEach((tab) => {
    const tabBtn = document.createElement("div");
    tabBtn.textContent = tab;
    tabBtn.className = "ij-tab-button";
    Object.assign(tabBtn.style, {
      padding: "8px",
      margin: "4px 0",
      background: "#1e1e1e",
      color: "#ccc",
      cursor: "pointer",
      transition: "0.2s",
    });

    tabBtn.addEventListener("mouseover", () => {
      if (tabBtn !== activeTab) tabBtn.style.background = "#2a2a2a";
    });
    tabBtn.addEventListener("mouseout", () => {
      if (tabBtn !== activeTab) tabBtn.style.background = "#1e1e1e";
    });
    tabBtn.addEventListener("click", () => {
      if (activeTab)
        Object.assign(activeTab.style, {
          background: "#1e1e1e",
          color: "#ccc",
        });
      Object.assign(tabBtn.style, {
        background: "#2e86de",
        color: "#fff",
      });
      activeTab = tabBtn;
      renderContent(tab);
    });

    tabList.appendChild(tabBtn);
  });

  tabPanel.appendChild(tabList);
  overlay.appendChild(tabPanel);

  // === Content Panel ===
  const contentPanel = document.createElement("div");
  contentPanel.id = "ij-content";
  Object.assign(contentPanel.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "600px",
    height: "400px",
    transform: "translate(-50%, -50%)",
    background: "#161616",
    color: "white",
    padding: "20px",
    fontFamily: "monospace",
    boxShadow: "0 0 20px rgba(0,0,0,0.6)",
    resize: "both",
    overflow: "auto",
  });
  overlay.appendChild(contentPanel);

  // Welcome message
  contentPanel.innerHTML = `
    <div style="text-align: center; padding: 50px 20px;">
      <h2 style="color: #2e86de; font-size: 24px; margin-bottom: 20px;">Welcome to IJplus</h2>
      <p style="color: #aaa; margin-bottom: 10px;">Press <kbd style="background: #333; padding: 2px 6px; border-radius: 4px;">F8</kbd> to toggle this overlay</p>
      <p style="color: #aaa; margin-bottom: 10px;">Press <kbd style="background: #333; padding: 2px 6px; border-radius: 4px;">ESC</kbd> to close</p>
      
      <div style="margin: 30px 0; border-top: 1px solid #333; padding-top: 20px;">
        <p style="color: #888;">Available tools:</p>
        <ul style="text-align: left; display: inline-block; color: #ccc; margin-top: 10px; width: 80%;">
          <li><strong style="color: #2e86de;">Executor</strong> - Run custom JavaScript code</li>
          <li><strong style="color: #2e86de;">Console</strong> - View system messages and logs</li>
          <li><strong style="color: #2e86de;">Settings</strong> - Configure your experience</li>
        </ul>
      </div>
      
      <div style="color: #666; margin-top: 30px; font-size: 0.9em;">
        <p>Drag windows by their headers • Resize using bottom-right corner</p>
        <p>Made with ❤️ for educational purposes</p>
      </div>
    </div>
  `;

  function renderContent(tab) {
    contentPanel.innerHTML = "";

    if (tab === "Executor") {
      const title = document.createElement("div");
      title.textContent = "IJplus Executor";
      Object.assign(title.style, {
        fontSize: "16px",
        color: "#0f0",
        marginBottom: "10px",
      });

      const codeArea = document.createElement("textarea");
      Object.assign(codeArea.style, {
        width: "100%",
        height: "250px",
        background: "#000",
        color: "#0f0",
        border: "1px solid #444",
        fontFamily: "monospace",
        fontSize: "14px",
        padding: "10px",
        resize: "vertical",
        boxSizing: "border-box",
      });
      codeArea.placeholder = "// write your JS here";

      const runBtn = document.createElement("button");
      runBtn.textContent = "Run";
      Object.assign(runBtn.style, buttonStyle("#2ecc71"));
      runBtn.onclick = () => {
        try {
          const script = document.createElement("script");
          script.innerHTML = codeArea.value;
          document.body.append(script);
          showNotification({
            title: "Executor",
            message: "Executed successfully",
          });
          console.log("%c[IJplus Eval Output]", "color:lime;", result);
        } catch (e) {
          showNotification({ title: "Executor Error", message: e.toString() });
        }
      };

      const clearBtn = document.createElement("button");
      clearBtn.textContent = "Clear";
      Object.assign(clearBtn.style, buttonStyle("#e74c3c"));
      clearBtn.onclick = () => (codeArea.value = "");

      const buttonRow = document.createElement("div");
      Object.assign(buttonRow.style, {
        display: "flex",
        gap: "10px",
        marginTop: "10px",
        justifyContent: "flex-end",
      });
      buttonRow.appendChild(clearBtn);
      buttonRow.appendChild(runBtn);

      contentPanel.appendChild(title);
      contentPanel.appendChild(codeArea);
      contentPanel.appendChild(buttonRow);
    } else if (tab === "Console") {
      const title = document.createElement("div");
      title.textContent = "System Console";
      title.style.fontSize = "16px";
      title.style.color = "#0f0";
      title.style.marginBottom = "10px";

      const consoleOutput = document.createElement("div");
      consoleOutput.id = "ij-console-output";
      Object.assign(consoleOutput.style, {
        backgroundColor: "#000",
        color: "#0f0",
        height: "300px",
        padding: "10px",
        overflowY: "auto",
        fontFamily: "monospace",
        whiteSpace: "pre-wrap",
      });

      const clearBtn = document.createElement("button");
      clearBtn.textContent = "Clear Console";
      Object.assign(clearBtn.style, buttonStyle("#e74c3c"));
      clearBtn.onclick = () => (consoleOutput.innerHTML = "");

      contentPanel.appendChild(title);
      contentPanel.appendChild(consoleOutput);
      contentPanel.appendChild(clearBtn);
    } else if (tab === "Reading Plus") {
      // Create main title
      const title = document.createElement("h2");
      title.textContent = "Reading Plus Tools";
      title.style.color = "#2e86de";
      title.style.marginBottom = "20px";
      contentPanel.appendChild(title);

      // Create rank indicator
      const rankIndicator = document.createElement("div");
      rankIndicator.textContent = `Your Rank: ${Rank}`;
      rankIndicator.style.color = "#aaa";
      rankIndicator.style.marginBottom = "15px";
      contentPanel.appendChild(rankIndicator);

      // Create sections container
      const sectionsContainer = document.createElement("div");
      sectionsContainer.style.display = "flex";
      sectionsContainer.style.flexDirection = "column";
      sectionsContainer.style.gap = "25px";
      contentPanel.appendChild(sectionsContainer);

      // Helper function to create buttons
      function createButton(text, color, onClick) {
        const button = document.createElement("button");
        button.textContent = text;
        Object.assign(button.style, {
          backgroundColor: color,
          color: "white",
          border: "none",
          padding: "8px 16px",
          fontSize: "14px",
          cursor: "pointer",
          borderRadius: "4px",
          transition: "all 0.2s",
          minWidth: "150px",
        });
        button.addEventListener("mouseover", () => {
          button.style.opacity = "0.9";
          button.style.transform = "translateY(-2px)";
        });
        button.addEventListener("mouseout", () => {
          button.style.opacity = "1";
          button.style.transform = "translateY(0)";
        });
        button.addEventListener("click", onClick);
        return button;
      }

      // Helper function to create sections
      function createSection(title, subtitle = null) {
        const section = document.createElement("div");

        const sectionTitle = document.createElement("h3");
        sectionTitle.textContent = title;
        sectionTitle.style.color = "#2ecc71";
        sectionTitle.style.marginBottom = "8px";
        section.appendChild(sectionTitle);

        if (subtitle) {
          const sectionSubtitle = document.createElement("div");
          sectionSubtitle.textContent = subtitle;
          sectionSubtitle.style.color = "#aaa";
          sectionSubtitle.style.fontSize = "12px";
          sectionSubtitle.style.marginBottom = "12px";
          section.appendChild(sectionSubtitle);
        }

        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.flexWrap = "wrap";
        buttonContainer.style.gap = "10px";
        section.appendChild(buttonContainer);

        return { section, buttonContainer };
      }

      // SeeReader Section (available for all ranks)
      const { section: seeReaderSection, buttonContainer: seeReaderButtons } =
        createSection("SeeReader");
      sectionsContainer.appendChild(seeReaderSection);

      // Copy Question button (all ranks)
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
                message: "Failed to run script:" + error,
              });
            });
        })
      );

      // Copy Story button (emerald+)
      if (["emerald", "diamond", "platinum"].includes(Rank.toLowerCase())) {
        seeReaderButtons.appendChild(
          createButton("Copy Story", "#3498db", () => {
            showNotification({
              title: "SeeReader",
              message: "Story copied to clipboard",
            });
            runScript("scripts/ReadingPlus/CopyStory.js")
              .then((result) => {
                showNotification({
                  title: "SeeReader",
                  message: "Copied Story to Clipboard",
                });
              })
              .catch((error) => {
                showNotification({
                  title: "IjPlus",
                  message: "Failed to run script:" + error,
                });
              });
          })
        );
      }

      // Ibalance Section (silver+)
      if (!["bronze"].includes(Rank.toLowerCase())) {
        const { section: ibalanceSection, buttonContainer: ibalanceButtons } =
          createSection("Ibalance", "Flash");
        sectionsContainer.appendChild(ibalanceSection);

        ibalanceButtons.appendChild(
          createButton("Complete Flash", "#e67e22", () => {
            runScript("scripts/ReadingPlus/CompleteFlash.js")
              .then((result) => {
                showNotification({
                  title: "Ibalance - Flash",
                  message: "Completing Flash, Press the Space key twice",
                });
              })
              .catch((error) => {
                showNotification({
                  title: "IjPlus",
                  message: "Failed to run script:" + error,
                });
              });
          })
        );
      }

      // Scan Section (gold+)
      if (
        ["gold", "emerald", "diamond", "platinum"].includes(Rank.toLowerCase())
      ) {
        const { section: scanSection, buttonContainer: scanButtons } =
          createSection("Scan");
        sectionsContainer.appendChild(scanSection);

        scanButtons.appendChild(
          createButton("Complete Scan", "#9b59b6", () => {
            showNotification({ title: "Scan", message: "Scan completed" });
            // Actual implementation would go here
          })
        );
      }

      // Complete All button (platinum only)
      if (["platinum"].includes(Rank.toLowerCase())) {
        const completeAllSection = document.createElement("div");
        completeAllSection.style.marginTop = "20px";
        completeAllSection.style.paddingTop = "20px";
        completeAllSection.style.borderTop = "1px solid #333";

        const completeAllButton = createButton(
          "Complete All",
          "#e74c3c",
          () => {
            showNotification({
              title: "Reading Plus",
              message: "All activities completed",
            });
            // Actual implementation would go here
          }
        );
        completeAllButton.style.width = "100%";
        completeAllButton.style.padding = "12px";
        completeAllButton.style.fontSize = "16px";

        completeAllSection.appendChild(completeAllButton);
        sectionsContainer.appendChild(completeAllSection);
      }

      // Info message for unsupported ranks
      if (["bronze"].includes(Rank.toLowerCase())) {
        const info = document.createElement("div");
        info.innerHTML = `<div style="color:#888; margin-top:20px; font-size:12px;">
                Upgrade to higher rank for more features:
                <ul style="margin-top:8px; padding-left:20px;">
                    <li>Silver: Ibalance tools</li>
                    <li>Gold: Scan tools</li>
                    <li>Emerald: Copy Story</li>
                    <li>Platinum: Complete All</li>
                </ul>
            </div>`;
        sectionsContainer.appendChild(info);
      }
    } else {
      const title = document.createElement("div");
      title.textContent = tab;
      title.style.fontSize = "16px";
      title.style.color = "#fff";

      const msg = document.createElement("div");
      msg.textContent = `This is the ${tab} tab. Feature coming soon!`;
      msg.style.color = "#aaa";
      msg.style.marginTop = "10px";

      contentPanel.appendChild(title);
      contentPanel.appendChild(msg);
    }
  }

  function buttonStyle(bg) {
    return {
      backgroundColor: bg,
      color: "white",
      border: "none",
      padding: "8px 14px",
      fontSize: "14px",
      cursor: "pointer",
      borderRadius: "4px",
    };
  }

  makeDraggable(tabPanel);
  makeDraggable(contentPanel);

  // === F8 toggle ===
  window.addEventListener("keydown", (e) => {
    if (e.key === "F8") {
      if (!Rank) {
        showNotification({ title: "IjPlus", message: "No Subsription" });
        return;
      }
      overlay.style.display =
        overlay.style.display === "none" ? "block" : "none";
    }
    if (e.key === "Escape") {
      overlay.style.display = "none";
    }
  });

  // === Draggable Windows ===
  function makeDraggable(el) {
    let isDragging = false,
      offsetX = 0,
      offsetY = 0;

    el.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "BUTTON")
        return;
      isDragging = true;
      offsetX = e.clientX - el.offsetLeft;
      offsetY = e.clientY - el.offsetTop;
      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        el.style.left = e.clientX - offsetX + "px";
        el.style.top = e.clientY - offsetY + "px";
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      document.body.style.userSelect = "";
    });
  }

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
      gap: "10px",
      zIndex: "100000",
    });
    document.body.appendChild(notifContainer);
  }

  window.showNotification = function ({ title = "IJplus", message = "" }) {
    const notif = document.createElement("div");
    Object.assign(notif.style, {
      background: "#000",
      color: "#0f0",
      padding: "10px 14px",
      border: "1px solid #0f0",
      fontFamily: "monospace",
      maxWidth: "300px",
      whiteSpace: "pre-wrap",
      borderRadius: "4px",
      boxShadow: "0 0 10px rgba(0,255,0,0.2)",
    });

    notif.innerHTML = `<b>${title}</b><br>${message}`;
    notifContainer.appendChild(notif);

    setTimeout(() => {
      notif.style.opacity = "0";
      setTimeout(() => notif.remove(), 300);
    }, 4000);
  };
  window.overlay = overlay;
}

// Run version check and initialize overlay + notification
maybeCheckVersion();
showNotification({
  title: "Ijplus",
  message: `IJplus is up to date, version: ${LOCAL_VERSION}`,
});
createOverlay();
showNotification({ title: "Ijplus", message: "Loading Scripts" });
if (Rank) {
  showNotification({
    title: "Ijplus",
    message: "IJplus Overlay initialized. Press F8 to toggle.",
  });
}
