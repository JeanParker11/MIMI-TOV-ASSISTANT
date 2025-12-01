document.addEventListener('DOMContentLoaded', function() {
    fetch('/api/pending-fiches')
        .then(response => response.json())
        .then(fiches => {
            const container = document.getElementById('pending-fiches-container');
            if (fiches.length === 0) {
                container.innerHTML = '<p>Aucune fiche en attente.</p>';
                return;
            }

            fiches.forEach(fiche => {
                const ficheElement = document.createElement('div');
                ficheElement.classList.add('fiche');
                ficheElement.innerHTML = `
                    <h3>${fiche.pseudo}</h3>
                    <p><strong>Téléphone :</strong> ${fiche.tel}</p>
                    <p><strong>Faction :</strong> ${fiche.faction}</p>
                    <p><strong>Force :</strong> ${fiche.force}</p>
                    <p><strong>Esprit :</strong> ${fiche.esprit}</p>
                    <p><strong>Pouvoir :</strong> ${fiche.pouvoir}</p>
                    <button onclick="approveFiche('${fiche.id}')">Approuver</button>
                    <button onclick="rejectFiche('${fiche.id}')">Refuser</button>
                    <button onclick="editFiche('${fiche.id}')">Modifier</button>
                `;
                container.appendChild(ficheElement);
            });
        });
});

function approveFiche(id) {
    fetch(`/api/fiches/${id}/approve`, { method: 'POST' })
        .then(() => location.reload());
}

function rejectFiche(id) {
    fetch(`/api/fiches/${id}/reject`, { method: 'POST' })
        .then(() => location.reload());
}

function editFiche(id) {
    window.location.href = `/admin/edit/${id}`;
}
