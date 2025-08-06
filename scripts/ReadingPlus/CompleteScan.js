(function () {
  const originalSend = XMLHttpRequest.prototype.send;

  const stored = window.localStorage.getItem("correctPercentage");
  const correctPercentage = stored ? parseFloat(stored) : 100;

  XMLHttpRequest.prototype.send = function (body) {
    try {
      const parsed = JSON.parse(body);
      const keys = Object.keys(parsed);
      const expectedKeys = [
        "storyId",
        "screenIndex",
        "targets",
        "correct",
        "incorrect",
        "secondsTaken",
      ];

      const matchesStructure =
        expectedKeys.every((k) => k in parsed) &&
        keys.length === expectedKeys.length;

      if (matchesStructure) {
        console.log("✅ Intercepted matching request body");

        const total = parsed.targets;
        const correct = Math.round((total * correctPercentage) / 100);
        const incorrect = 0;

        parsed.correct = correct;
        parsed.incorrect = incorrect;

        body = JSON.stringify(parsed);
      }
    } catch (err) {
      // ignore invalid JSON
    }

    return originalSend.call(this, body);
  };

  console.log(
    `🔗 Patched XMLHttpRequest.send with ${correctPercentage}% correct`
  );
})();
