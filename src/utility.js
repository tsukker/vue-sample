"use strict";

export function generateRandomRoomId(charSet = "0123456789", len = 5) {
  let cl = charSet.length;
  let r = "";
  for (let i = 0; i < len; ++i) {
    r += charSet[Math.floor(Math.random() * cl)];
  }
  return r;
}
