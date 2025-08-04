// Open Google login in new tab
document.getElementById("loginButton").addEventListener("click", () => {
  window.open("https://jin-zh.github.io/IjPlus/Login", "_blank");
});

// Assuming KeyInput is a form that contains an input with id "keyInputField"
document.addEventListener("keyPress", (event) => {
  // Check if the key pressed is Enter
  if (event.key === "Enter") {
    // get the value from input inside the form
    const key = document.getElementById("keyInputField").value.trim();

    fetch(
      `https://raw.githubusercontent.com/jin-zhao-teh/jin-zhao-teh.github.io/main/IjPlus/Data/Keys/${key}.json`
    )
      .then((response) => {
        if (!response.ok) throw new Error("Key not found");
        response.json();
      })
      .then((data) => {
        // assuming data.rank exists
        if (data.rank) {
          // Example of saving to chrome extension storage (if relevant)
          chrome.storage.local.set({ userRank: data.rank }, () => {
            alert("Rank saved:" + data.rank);
          });
        } else {
          console.log("Rank not found in data");
        }
      })
      .catch((error) => {
        console.error("Error fetching key:", error);
        // show error to user
      });
  }
});
document.getElementById("SubmitButton").addEventListener("click", () => {
  // get the value from input inside the form
  const key = document.getElementById("KeyInput").value.trim();

  fetch(
    `https://raw.githubusercontent.com/jin-zhao-teh/jin-zhao-teh.github.io/main/IjPlus/Data/Keys/${key}.json`
  )
    .then((response) => {
      if (!response.ok) throw new Error("Key not found");
      return response.json();
    })
    .then((data) => {
      // assuming data.rank exists
      console.log(data.rank);
      if (data.rank) {
        // Example of saving to chrome extension storage (if relevant)
        chrome.storage.local.set({ userRank: data.rank }, () => {
          alert("Rank saved:" + data.rank);
        });
      } else {
        console.log("Rank not found in data");
      }
    })
    .catch((error) => {
      console.error("Error fetching key:", error);
      // show error to user
    });
});
