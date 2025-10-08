let pairingCode = null;

function setPairingCode(code) {
  pairingCode = code;
}

function getPairingCode() {
  return pairingCode;
}

module.exports = { setPairingCode, getPairingCode };
