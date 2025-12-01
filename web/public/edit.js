const forceInput = document.getElementById('force');
const espritInput = document.getElementById('esprit');
const pouvoirInput = document.getElementById('pouvoir');
const statsTotal = document.getElementById('stats-total');
const form = document.getElementById('edit-form');
const ficheId = window.location.pathname.split('/')[3];

document.addEventListener('DOMContentLoaded', function() {
    fetch(`/api/pending-fiches/${ficheId}`)
        .then(response => response.json())
        .then(fiche => {
            document.getElementById('pseudo').value = fiche.pseudo;
            document.getElementById('tel').value = fiche.tel;
            document.getElementById('faction').value = fiche.faction;
            forceInput.value = fiche.force;
            espritInput.value = fiche.esprit;
            pouvoirInput.value = fiche.pouvoir;
            updateTotal();
        });
});

function updateTotal() {
    const force = parseInt(forceInput.value) || 0;
    const esprit = parseInt(espritInput.value) || 0;
    const pouvoir = parseInt(pouvoirInput.value) || 0;
    const total = force + esprit + pouvoir;
    statsTotal.textContent = `Total des stats : ${total} / 150`;

    if (total === 150) {
        statsTotal.style.color = '#7CFC00';
    } else {
        statsTotal.style.color = '#FF6347';
    }
}

forceInput.addEventListener('input', updateTotal);
espritInput.addEventListener('input', updateTotal);
pouvoirInput.addEventListener('input', updateTotal);

form.addEventListener('submit', function(event) {
    event.preventDefault();
    const force = parseInt(forceInput.value) || 0;
    const esprit = parseInt(espritInput.value) || 0;
    const pouvoir = parseInt(pouvoirInput.value) || 0;
    const total = force + esprit + pouvoir;

    if (total !== 150) {
        alert('La somme des statistiques (force, esprit, pouvoir) doit être égale à 150.');
        return;
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    fetch(`/api/fiches/${ficheId}/edit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(() => {
        window.location.href = '/admin';
    });
});
