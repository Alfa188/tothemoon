// Phase 1 greeting — always "f" or "F" to signal female presence
function getGreeting() {
  return Math.random() < 0.5 ? "f" : "F";
}

// Phase 2 — bot declares its age
const ageMessages = ["im 18", "im 19", "im 18 btw", "im 19 btw"];

function getAgeMessage() {
  return ageMessages[Math.floor(Math.random() * ageMessages.length)];
}

// Promo messages pool — A/B test versions
const promoMessages = [
  "dont waste ur cum here.. come play with me rn 👉 http://bit.ly/4tEdF1f",
  "If ur horny, hold ur cum and come play together rn 👉 http://bit.ly/4tEdF1f",
  "im live rn and waiting for u 😏 → http://bit.ly/4tEdF1f",
  "stop skipping, im right here waiting for u 😈 → http://bit.ly/4tEdF1f",
  "u seem fun.. come find me on here instead 👉 http://bit.ly/4tEdF1f",
  "come watch me rn, way more fun than this 😏 👉 http://bit.ly/4tEdF1f",
  "dont leave yet.. im live rn just for u 👉 http://bit.ly/4tEdF1f",
  "im on cam rn if u wanna join 😉 → http://bit.ly/4tEdF1f",
  "bored here too ngl.. come play with me instead 👉 http://bit.ly/4tEdF1f",
  "ur missing out, im literally live rn 😏 👉 http://bit.ly/4tEdF1f",
  "i'd rather play with u on here → http://bit.ly/4tEdF1f",
  "come keep me company rn 😈 👉 http://bit.ly/4tEdF1f",
];

function getPromoMessage() {
  return promoMessages[Math.floor(Math.random() * promoMessages.length)];
}

module.exports = { getGreeting, getAgeMessage, getPromoMessage };
