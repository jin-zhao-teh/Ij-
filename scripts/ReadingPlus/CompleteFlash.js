const input = document
  .querySelector(".useranswer-wrapper")
  .getElementsByTagName("input")[0];
var i = -1;
var unlocked = false;
var used = false;
let enterEvent = new KeyboardEvent("keyup", {
  key: "Enter",
  keyCode: 13,
  which: 13,
});
let spaceEvent = new KeyboardEvent("keyup", {
  key: " ",
  keyCode: 32,
  which: 32,
});
var find = (e) => {
  if (e.key == " ") {
    if (i == -1) {
      i++;
      return;
    }
    var letter1 = document.querySelector(
      ".trigram.w" + String(i) + " .letter.l0"
    ).innerText;
    var letter2 = document.querySelector(
      ".trigram.w" + String(i) + " .letter.l1"
    ).innerText;
    var letter3 = document.querySelector(
      ".trigram.w" + String(i) + " .letter.l2"
    ).innerText;
    setTimeout(function () {
      input.value = letter1 + letter2 + letter3;
      input.dispatchEvent(enterEvent);
    }, 750);
    setTimeout(function () {
      document.dispatchEvent(spaceEvent);
      find(e.key == " ");
    }, 2750);
    i++;
  }
};
document.addEventListener("keyup", find);
