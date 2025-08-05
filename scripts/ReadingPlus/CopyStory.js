(function () {
  var xhr = new XMLHttpRequest();
  xhr.open(
    "GET",
    "https://student.readingplus.com/seereader/api/sr/getNext.json",
    true
  );
  xhr.setRequestHeader("accept", "*/*");
  xhr.setRequestHeader("accept-language", "en-US,en;q=0.9");
  xhr.setRequestHeader("cache-control", "no-cache");
  xhr.setRequestHeader("pragma", "no-cache");
  xhr.setRequestHeader("priority", "u=1, i");
  xhr.setRequestHeader(
    "sec-ch-ua",
    '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"'
  );
  xhr.setRequestHeader("sec-ch-ua-mobile", "?0");
  xhr.setRequestHeader("sec-ch-ua-platform", '"Windows"');
  xhr.withCredentials = true;

  xhr.onload = function () {
    if (xhr.status === 200) {
      var data = JSON.parse(xhr.responseText);
      if (data.section && data.section.data) {
        var storyId = data.section.data.storyId;
        navigator.clipboard.writeText(storyId);

        var storyXhr = new XMLHttpRequest();
        storyXhr.open(
          "GET",
          `https://content.readingplus.com/rp-content/ssr/${storyId}.json`,
          true
        );

        storyXhr.onload = function () {
          if (storyXhr.status === 200) {
            var storyData = JSON.parse(storyXhr.responseText);

            const compileStory = function (data) {
              if (!data || !data.segmentList) {
                return "No story data available to compile.";
              }
              const { segmentList } = data;
              let compiledText = "";
              segmentList.forEach((segment) => {
                segment.paragraphList.forEach((paragraph) => {
                  compiledText += paragraph.words.join(" ") + "\n";
                });
                compiledText += "\n";
              });
              return compiledText.trim();
            };

            var compiledText = compileStory(storyData);

            if (compiledText) {
              console.log("Compiled Story Text:\n", compiledText);
              navigator.clipboard.writeText(
                compiledText +
                  " Use this selection to answer the questions I am going to give you. DO NOT USE OTHER RESOURCES"
              );
              alert("Compiled Story Text:\n" + compiledText);
            }
          } else {
            alert("Error fetching story content: " + storyXhr.status);
          }
        };

        storyXhr.onerror = function () {
          alert("Request failed while fetching story content.");
        };

        storyXhr.send();
      } else {
        alert("Story ID not found in the response.");
      }
    } else {
      alert("Error fetching data: " + xhr.status);
    }
  };

  xhr.onerror = function () {
    alert("Request failed.");
  };

  xhr.send();
})();
