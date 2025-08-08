(async function fetchAndSolve() {
  const url = window.localStorage.getItem("ludiUrl");

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include", // Ensures cookies are sent
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

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    console.log("Received data:", data);

    if (!("questions" in data)) {
      throw new Error("Invalid response structure");
    }

    let results = [];

    if ("operation" in data.questions[0]) {
      results = data.questions.map((q) => {
        switch (q.operation) {
          case "+":
            return q.left + q.right;
          case "-":
            return q.left - q.right;
          case "*":
            return q.left * q.right;
          case "/":
            return q.right !== 0 ? q.left / q.right : "Error: Division by zero";
          case "^":
            if (q.right < 0) {
              if (q.right == -2) {
                return Math.sqrt(q.left);
              } else if (q.right == -3) {
                return Math.cbrt(q.left);
              }
            } else {
              return Math.pow(q.left, q.right);
            }
          default:
            return "Unknown operation" + q.operation;
        }
      });
    } else {
      console.log("Processing 'non-normal' mode...");
      results = data.questions.map((q) => {
        const [left, operation, right] = q;
        switch (operation) {
          case "+":
            return left + right;
          case "-":
            return left - right;
          case "*":
            return left * right;
          case "/":
            return right !== 0 ? left / right : "Error: Division by zero";
          case "^":
            return Math.pow(left, right);
          default:
            return "Unknown operation";
        }
      });
    }

    console.log("Computed results:", results);
  } catch (error) {
    console.error("Error:", error);
  }
})();
