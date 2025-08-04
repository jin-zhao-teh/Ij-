document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("googleLogin").addEventListener("click", () => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        document.getElementById("result").textContent = "Login failed.";
        return;
      }

      // Fetch user profile from Google
      fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((profile) => {
          document.getElementById(
            "result"
          ).textContent = `Logged in as ${profile.email}`;
          // Here: Fetch GitHub JSON and validate user role
        })
        .catch((err) => {
          console.error("Profile fetch error:", err);
        });
    });
  });
});
