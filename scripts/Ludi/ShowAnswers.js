(function () {
  // Create answer window
  const answerWindow = document.createElement("div");
  answerWindow.id = "ludi-answer-window";
  answerWindow.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 300px;
    background: rgba(30, 30, 30, 0.9);
    color: #fff;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    z-index: 99999;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.1);
    display: none;
    font-family: 'Segoe UI', sans-serif;
  `;

  // Answer display
  const answerDisplay = document.createElement("div");
  answerDisplay.id = "ludi-answer";
  answerDisplay.style.cssText = `
    font-size: 24px;
    font-weight: bold;
    text-align: center;
    margin: 10px 0;
    color: #2ecc71;
  `;

  // Status display
  const statusDisplay = document.createElement("div");
  statusDisplay.id = "ludi-status";
  statusDisplay.style.cssText = `
    font-size: 14px;
    text-align: center;
    color: #aaa;
    margin-bottom: 10px;
  `;

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close (F2)";
  closeBtn.style.cssText = `
    background: rgba(231, 76, 60, 0.8);
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 6px;
    cursor: pointer;
    float: right;
  `;

  closeBtn.onclick = () => toggleAnswerWindow();

  answerWindow.appendChild(closeBtn);
  answerWindow.appendChild(statusDisplay);
  answerWindow.appendChild(answerDisplay);
  document.body.appendChild(answerWindow);

  // State management
  let currentAnswers = [];
  let currentIndex = 0;
  let isWindowVisible = false;

  // Toggle window visibility
  function toggleAnswerWindow() {
    isWindowVisible = !isWindowVisible;
    answerWindow.style.display = isWindowVisible ? "block" : "none";
    if (isWindowVisible && currentAnswers.length > 0) {
      showCurrentAnswer();
    }
  }

  // Show current answer
  function showCurrentAnswer() {
    if (currentAnswers.length === 0) return;

    answerDisplay.textContent = currentAnswers[currentIndex];
    statusDisplay.textContent = `Answer ${currentIndex + 1} of ${
      currentAnswers.length
    }`;
  }

  // Go to next answer
  function nextAnswer() {
    if (currentAnswers.length === 0) return;

    currentIndex = (currentIndex + 1) % currentAnswers.length;
    showCurrentAnswer();
  }

  // Key listeners
  document.addEventListener("keydown", (e) => {
    // F2 to toggle window
    if (e.key === "F2") {
      e.preventDefault();
      toggleAnswerWindow();
    }

    // Enter to cycle answers when window is visible
    if (e.key === "Enter" && isWindowVisible) {
      e.preventDefault();
      nextAnswer();
    }
  });

  // Add CSS animations
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(10px); }
    }
    #ludi-notification {
      position: fixed;
      bottom: 70px;
      right: 20px;
      background: rgba(30, 30, 30, 0.9);
      color: #2ecc71;
      padding: 10px 15px;
      border-radius: 6px;
      z-index: 99999;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    }
  `;
  document.head.appendChild(style);

  // Show notification function
  function showNotification(message) {
    const notification = document.createElement("div");
    notification.id = "ludi-notification";
    notification.textContent = message;
    notification.style.animation = "fadeIn 0.3s";

    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.animation = "fadeOut 0.3s";
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Main solve function
  async function fetchAndSolve() {
    const url = window.localStorage.getItem("ludiUrl");
    if (!url) {
      showNotification("No Ludi URL found in localStorage");
      return;
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "sec-ch-ua":
            '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "x-ludi-hl": "0",
          "x-ludi-sl": "0",
          "x-ludi-wd": "0",
        },
        referrer: "https://basicfacts.ludi.nz/",
        mode: "cors",
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const data = await response.json();
      console.log("Ludi data received:", data);

      if (!("questions" in data)) {
        throw new Error("Invalid response structure - no questions found");
      }

      // Reset state
      currentAnswers = [];
      currentIndex = 0;

      // Process questions
      currentAnswers = data.questions.map((q) => {
        try {
          if ("operation" in q) {
            // New format: {left, operation, right}
            const { left, operation, right } = q;
            switch (operation) {
              case "+":
                return left + right;
              case "-":
                return left - right;
              case "*":
                return left * right;
              case "/":
                return right !== 0 ? (left / right).toFixed(2) : "DIV/0";
              case "^":
                if (right < 0) {
                  if (right === -2) return Math.sqrt(left).toFixed(2);
                  if (right === -3) return Math.cbrt(left).toFixed(2);
                }
                return Math.pow(left, right);
              default:
                return "?";
            }
          } else if (Array.isArray(q)) {
            // Old format: [left, operation, right]
            const [left, operation, right] = q;
            switch (operation) {
              case "+":
                return left + right;
              case "-":
                return left - right;
              case "*":
                return left * right;
              case "/":
                return right !== 0 ? (left / right).toFixed(2) : "DIV/0";
              case "^":
                return Math.pow(left, right);
              default:
                return "?";
            }
          }
          return "Unknown question format";
        } catch (e) {
          console.error("Error processing question:", q, e);
          return "Error";
        }
      });

      console.log("Calculated answers:", currentAnswers);
      showNotification(`${currentAnswers.length} answers ready (Press F2)`);

      // Auto-show if this is the first run
      if (!localStorage.getItem("ludiFirstRunDone")) {
        localStorage.setItem("ludiFirstRunDone", "true");
        toggleAnswerWindow();
      }
    } catch (error) {
      console.error("Ludi error:", error);
      showNotification(`Error: ${error.message}`);
      answerDisplay.textContent = "Error";
      statusDisplay.textContent = error.message;
    }
  }

  // Initialize
  fetchAndSolve();
})();
