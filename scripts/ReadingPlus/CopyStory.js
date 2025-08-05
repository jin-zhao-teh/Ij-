(function () {
  var _0x4a3c = [
    "GET",
    "https://student.readingplus.com/seereader/api/sr/getNext.json",
    "accept",
    "*/*",
    "accept-language",
    "en-US,en;q=0.9",
    "cache-control",
    "no-cache",
    "pragma",
    "no-cache",
    "priority",
    "u=1, i",
    "sec-ch-ua",
    '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
    "sec-ch-ua-mobile",
    "?0",
    "sec-ch-ua-platform",
    '"Windows"',
    "withCredentials",
    "onload",
    "status",
    "responseText",
    "section",
    "data",
    "storyId",
    "writeText",
    "GET",
    "https://content.readingplus.com/rp-content/ssr/",
    "json",
    "Compiled Story Text:\n",
    "alert",
    "Error fetching story content: ",
    "onerror",
    "Request failed while fetching story content.",
    "send",
    "Error fetching data: ",
    "Request failed.",
    "No story data available to compile.",
    "segmentList",
    "forEach",
    "paragraphList",
    "words",
    "join",
    "trim",
    "log",
  ];

  function _0x21bf(_0x1053, _0x3489) {
    _0x1053 = _0x1053 - 0x0;
    return _0x4a3c[_0x1053];
  }

  var xhr = new XMLHttpRequest();
  xhr[_0x21bf(0x0)](_0x21bf(0x1), _0x21bf(0x2), true);
  xhr.setRequestHeader(_0x21bf(0x3), _0x21bf(0x4));
  xhr.setRequestHeader(_0x21bf(0x5), _0x21bf(0x6));
  xhr.setRequestHeader(_0x21bf(0x7), _0x21bf(0x8));
  xhr.setRequestHeader(_0x21bf(0x9), _0x21bf(0xa));
  xhr.setRequestHeader(_0x21bf(0xb), _0x21bf(0xc));
  xhr.setRequestHeader(_0x21bf(0xd), _0x21bf(0xe));
  xhr.setRequestHeader(_0x21bf(0xf), _0x21bf(0x10));
  xhr.setRequestHeader(_0x21bf(0x11), _0x21bf(0x12));
  xhr[_0x21bf(0x13)] = true;
  xhr[_0x21bf(0x14)] = function () {
    if (xhr[_0x21bf(0x15)] === 200) {
      var data = JSON.parse(xhr[_0x21bf(0x16)]);
      if (data[_0x21bf(0x17)] && data[_0x21bf(0x17)][_0x21bf(0x18)]) {
        var storyId = data[_0x21bf(0x17)][_0x21bf(0x18)][_0x21bf(0x19)];
        navigator[_0x21bf(0x1a)][storyId];
        var storyXhr = new XMLHttpRequest();
        storyXhr[_0x21bf(0x0)](
          _0x21bf(0x1b) + storyId + "." + _0x21bf(0x1c),
          true
        );
        storyXhr[_0x21bf(0x14)] = function () {
          if (storyXhr[_0x21bf(0x15)] === 200) {
            var storyData = JSON.parse(storyXhr[_0x21bf(0x16)]);
            const compileStory = function (data) {
              if (!data || !data[_0x21bf(0x23)]) {
                return _0x21bf(0x26);
              }
              const segmentList = data[_0x21bf(0x23)];
              let compiledText = "";
              segmentList[_0x21bf(0x27)]((segment) => {
                segment[_0x21bf(0x28)][_0x21bf(0x27)]((paragraph) => {
                  compiledText += paragraph[_0x21bf(0x29)].join(" ") + "\n";
                });
                compiledText += "\n";
              });
              return compiledText.trim();
            };
            var compiledText = compileStory(storyData);
            if (compiledText) {
              console[_0x21bf(0x2a)](_0x21bf(0x1d) + compiledText);
              navigator[_0x21bf(0x1a)][
                compiledText +
                  " Use this selection to answer the questions I am going to give you. DO NOT USE OTHER RESOURCES"
              ];
              alert(_0x21bf(0x1d) + compiledText);
            }
          } else {
            alert(_0x21bf(0x1e) + storyXhr.status);
          }
        };
        storyXhr[_0x21bf(0x1f)] = function () {
          alert(_0x21bf(0x20));
        };
        storyXhr[_0x21bf(0x21)]();
      } else {
        alert("Story ID not found in the response.");
      }
    } else {
      alert(_0x21bf(0x22) + xhr.status);
    }
  };
  xhr[_0x21bf(0x1f)] = function () {
    alert(_0x21bf(0x24));
  };
  xhr[_0x21bf(0x21)]();
})();
