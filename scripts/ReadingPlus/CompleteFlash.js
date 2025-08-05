(function () {
  const _0x3b9a = [
    ".useranswer-wrapper",
    "getElementsByTagName",
    "input",
    "keyup",
    "key",
    " ",
    "trigram.w",
    ".letter.l0",
    ".letter.l1",
    ".letter.l2",
    "innerText",
    "value",
    "dispatchEvent",
    "Enter",
    "keyup",
    "keyCode",
    "which",
    "Enter",
    " ",
    "keyup",
    "keyup",
    "addEventListener",
  ];
  function _0x2d35(_0x3c41, _0x2d30) {
    return _0x3b9a[_0x3c41];
  }

  const input = document.querySelector(_0x2d35(0))[_0x2d35(1)](_0x2d35(2))[0];
  var i = -1;
  var unlocked = false;
  var used = false;
  let enterEvent = new KeyboardEvent(_0x2d35(3), {
    key: _0x2d35(13),
    keyCode: 13,
    which: 13,
  });
  let spaceEvent = new KeyboardEvent(_0x2d35(3), {
    key: _0x2d35(5),
    keyCode: 32,
    which: 32,
  });
  var find = (e) => {
    if (e[_0x2d35(4)] == _0x2d35(5)) {
      if (i == -1) {
        i++;
        return;
      }
      var letter1 = document.querySelector(
        _0x2d35(6) + String(i) + " " + _0x2d35(7)
      )[_0x2d35(10)];
      var letter2 = document.querySelector(
        _0x2d35(6) + String(i) + " " + _0x2d35(8)
      )[_0x2d35(10)];
      var letter3 = document.querySelector(
        _0x2d35(6) + String(i) + " " + _0x2d35(9)
      )[_0x2d35(10)];
      setTimeout(function () {
        input[_0x2d35(11)] = letter1 + letter2 + letter3;
        input[_0x2d35(12)](enterEvent);
      }, 750);
      setTimeout(function () {
        document[_0x2d35(20)](_0x2d35(3), () => {
          find({ [_0x2d35(4)]: _0x2d35(5) });
        });
        document.dispatchEvent(spaceEvent);
      }, 2750);
      i++;
    }
  };
  document[_0x2d35(20)](_0x2d35(3), find);
})();
