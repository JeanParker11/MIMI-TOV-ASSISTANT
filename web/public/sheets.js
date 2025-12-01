document.addEventListener('DOMContentLoaded', function() {
    fetch('/api/fiches')
        .then(response => response.json())
        .then(fiches => {
            const container = document.getElementById('fiches-container');
            if (Object.keys(fiches).length === 0) {
                container.innerHTML = '<p>Aucune fiche à afficher.</p>';
                return;
            }

            for (const tel in fiches) {
                const fiche = fiches[tel];
                const ficheElement = document.createElement('div');
                ficheElement.classList.add('fiche');
                const ficheContent = `
                    <h3>${fiche.pseudo}</h3>
                    <p><strong>Téléphone :</strong> ${fiche.tel}</p>
                    <p><strong>Faction :</strong> ${fiche.faction}</p>
                    <p><strong>Force :</strong> ${fiche.force}</p>
                    <p><strong>Esprit :</strong> ${fiche.esprit}</p>
                    <p><strong>Pouvoir :</strong> ${fiche.pouvoir}</p>
                `;
                ficheElement.innerHTML = ficheContent + '<button class="copy-btn">Copier</button>';
                container.appendChild(ficheElement);

                ficheElement.querySelector('.copy-btn').addEventListener('click', () => {
                    navigator.clipboard.writeText(ficheContent.replace(/<[^>]*>/g, ''))
                        .then(() => alert('Fiche copiée !'))
                        .catch(err => console.error('Erreur de copie:', err));
                });
            }
        });
});
