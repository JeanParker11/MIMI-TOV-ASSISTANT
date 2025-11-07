const socket = io();

const pairingCodeElement = document.getElementById('pairing-code');
const statusElement = document.getElementById('status');
const getCodeBtn = document.getElementById('get-code-btn');
const phoneNumberInput = document.getElementById('phone-number');
const phoneInputContainer = document.getElementById('phone-input-container');
const pairingContainer = document.getElementById('pairing-container');

getCodeBtn.addEventListener('click', () => {
    const phoneNumber = phoneNumberInput.value;
    if (phoneNumber) {
        socket.emit('request-pairing-code', { phoneNumber });
        phoneInputContainer.style.display = 'none';
        pairingContainer.style.display = 'block';
    }
});

socket.on('pairing-code', (data) => {
    pairingCodeElement.textContent = data.code;
});

socket.on('status', (message) => {
    statusElement.textContent = `Statut: ${message}`;
});

socket.on('error', (message) => {
    pairingCodeElement.textContent = message;
    pairingCodeElement.style.color = 'red';
});
