let assignments = document.getElementsByClassName("assignments");
let counts = [];

Array.from(assignments).forEach((assignment, index) => {
  const liCount = assignment.querySelectorAll("li").length;
  counts.push(liCount);
  console.log(`Assignment ${index + 1} has ${liCount} <li> elements`);
});

window.localStorage.setItem("completingAll", true);
window.localStorage.setItem("Progress", counts.toString());
window.localStorage.setItem("CurrentActivity", "");

if (counts[0] != 0) {
  //do seereaders
  window.localStorage.setItem("CurrentActivity", "SR");
} else if (counts[1] != 0) {
  // do vocabulary
  window.localStorage.setItem("CurrentActivity", "RA");
} else if (counts[2] != 0) {
  window.location.replace(
    "https://student.readingplus.com/seereader/api/ibalance/home"
  );
  window.localStorage.setItem("CurrentActivity", "Flash");
}
let storyId, lastScreenIndex, rate;

const xhr = new XMLHttpRequest();
xhr.open(
  "GET",
  "https://student.readingplus.com/seereader/api/ibalance/getScanDisplay.json",
  true
);
xhr.withCredentials = true;

xhr.setRequestHeader(
  "accept",
  "application/json, text/javascript, */*; q=0.01"
);
xhr.setRequestHeader("accept-language", "en-US,en;q=0.9");
xhr.setRequestHeader("priority", "u=1, i");
xhr.setRequestHeader(
  "sec-ch-ua",
  '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"'
);
xhr.setRequestHeader("sec-ch-ua-mobile", "?0");
xhr.setRequestHeader("sec-ch-ua-platform", '"Windows"');
xhr.setRequestHeader("sec-fetch-dest", "empty");
xhr.setRequestHeader("sec-fetch-mode", "cors");
xhr.setRequestHeader("sec-fetch-site", "same-origin");
xhr.setRequestHeader("x-requested-with", "XMLHttpRequest");

xhr.onreadystatechange = function () {
  if (xhr.readyState === XMLHttpRequest.DONE) {
    if (xhr.status === 200) {
      try {
        const response = JSON.parse(xhr.responseText);
        storyId = response.storyId;
        lastScreenIndex = response.lastScreenIndex;
        rate = response.storyformat?.[0]?.rate;

        console.log("Story ID:", storyId);
        console.log("Last Screen Index:", lastScreenIndex);
        console.log("Rate:", rate);
      } catch (e) {
        console.error("Failed to parse JSON:", e);
      }
    } else {
      console.error("Request failed:", xhr.status, xhr.statusText);
    }
  }
};

xhr.send();
function parseTargets(storyData) {
  const targets = [];
  let targetCount = 0;

  // Loop through each segment
  storyData.segmentList.forEach((segment) => {
    // Check if segment has paragraphs
    if (segment.paragraphList) {
      segment.paragraphList.forEach((paragraph) => {
        // Check if paragraph has words
        if (paragraph.words) {
          paragraph.words.forEach((word, index) => {
            // Identify targets (adjust condition if needed)
            if (word === "o7o" || word === "ooo7ooo") {
              targets.push({
                position: targetCount + 1,
                segmentIndex: storyData.segmentList.indexOf(segment),
                paragraphIndex: segment.paragraphList.indexOf(paragraph),
                wordIndex: index,
                word: word, // The target marker (could be replaced later)
              });
              targetCount++;
            }
          });
        }
      });
    }
  });

  return {
    totalTargets: targetCount,
    targets: targets,
  };
}
const xhr = new XMLHttpRequest();
xhr.open(
  "GET",
  "https://content.readingplus.com/rp-content/ssr/landholz/10023045",
  true
);

xhr.setRequestHeader(
  "accept",
  "application/json, text/javascript, */*; q=0.01"
);
xhr.setRequestHeader("accept-language", "en-US,en;q=0.9");
xhr.setRequestHeader("priority", "u=1, i");
xhr.setRequestHeader(
  "sec-ch-ua",
  '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"'
);
xhr.setRequestHeader("sec-ch-ua-mobile", "?0");
xhr.setRequestHeader("sec-ch-ua-platform", '"Windows"');
xhr.setRequestHeader("sec-fetch-dest", "empty");
xhr.setRequestHeader("sec-fetch-mode", "cors");
xhr.setRequestHeader("sec-fetch-site", "same-site");

xhr.onreadystatechange = function () {
  if (xhr.readyState === XMLHttpRequest.DONE) {
    if (xhr.status === 200) {
      try {
        const Result = JSON.parse(xhr.responseText);
        let targets = parseTargets(Result); // 👈 Pass into your function
        console.log("Targets:", targets);
      } catch (e) {
        console.error("Failed to parse JSON:", e);
      }
    } else {
      console.error("Request failed:", xhr.status, xhr.statusText);
    }
  }
};

xhr.send(); // No body because it's a GET request

fetch("https://student.readingplus.com/seereader/api/ibalance/scanSave.json", {
  headers: {
    accept: "application/json, text/javascript, */*; q=0.01",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json; charset=UTF-8",
    priority: "u=1, i",
    "sec-ch-ua":
      '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-requested-with": "XMLHttpRequest",
  },
  referrer: "https://student.readingplus.com/seereader/api/ibalance/scanStart",
  body: `{\"storyId\":${storyId},\"screenIndex\":${lastScreenIndex},\"targets\":${targets},\"correct\":${targets},\"incorrect\":0,\"secondsTaken\":28}`,
  method: "POST",
  mode: "cors",
  credentials: "include",
});
