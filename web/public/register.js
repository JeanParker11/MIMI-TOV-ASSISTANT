const forceInput = document.getElementById('force');
const espritInput = document.getElementById('esprit');
const pouvoirInput = document.getElementById('pouvoir');
const statsTotal = document.getElementById('stats-total');
const form = document.getElementById('register-form');

function updateTotal() {
    const force = parseInt(forceInput.value) || 0;
    const esprit = parseInt(espritInput.value) || 0;
    const pouvoir = parseInt(pouvoirInput.value) || 0;
    const total = force + esprit + pouvoir;
    statsTotal.textContent = `Total des stats : ${total} / 150`;

    if (total === 150) {
        statsTotal.style.color = '#7CFC00'; // Vert
    } else {
        statsTotal.style.color = '#FF6347'; // Rouge
    }
}

forceInput.addEventListener('input', updateTotal);
espritInput.addEventListener('input', updateTotal);
pouvoirInput.addEventListener('input', updateTotal);

form.addEventListener('submit', function(event) {
    const force = parseInt(forceInput.value) || 0;
    const esprit = parseInt(espritInput.value) || 0;
    const pouvoir = parseInt(pouvoirInput.value) || 0;
    const total = force + esprit + pouvoir;

    if (total !== 150) {
        event.preventDefault();
        alert('La somme des statistiques (force, esprit, pouvoir) doit être égale à 150.');
    }
});
