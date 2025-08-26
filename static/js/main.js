document.addEventListener('DOMContentLoaded', function () {
    // --- ELEMENT REFERENCES ---
    const elements = {
        team1Input: document.getElementById('team1-input'),
        team2Input: document.getElementById('team2-input'),
        venueInput: document.getElementById('venue-input'),
        battingFirstSelect: document.getElementById('batting-first-select'),
        firstInningsTotalInput: document.getElementById('first-innings-total-input'),
        team1PlayerSearch: document.getElementById('team1-player-search'),
        team2PlayerSearch: document.getElementById('team2-player-search'),
        team1SquadDiv: document.getElementById('team1-squad'),
        team2SquadDiv: document.getElementById('team2-squad'),
        team1PlayerCount: document.getElementById('team1-player-count'),
        team2PlayerCount: document.getElementById('team2-player-count'),
        team1SquadLabel: document.getElementById('team1-squad-label'),
        team2SquadLabel: document.getElementById('team2-squad-label'),
        predictBtn: document.getElementById('predict-btn'),
        dashboard: document.getElementById('prediction-dashboard'),
        spinner: document.getElementById('spinner'),
        predictionContent: document.getElementById('prediction-content'),
        finalPredictionText: document.getElementById('final-prediction-text'),
        predictionSummary: document.getElementById('prediction-summary'),
        factorList: document.getElementById('factor-analysis-list'),
        modelList: document.getElementById('model-predictions-list'),
        csrfToken: document.querySelector('[name=csrfmiddlewaretoken]').value,
        playersData: JSON.parse(document.getElementById('players-data').textContent),
    };

    // --- EVENT LISTENERS ---
    elements.team1Input.addEventListener('change', handleTeamChange);
    elements.team2Input.addEventListener('change', handleTeamChange);
    elements.battingFirstSelect.addEventListener('change', () => {
        elements.firstInningsTotalInput.disabled = !elements.battingFirstSelect.value;
    });
    elements.team1PlayerSearch.addEventListener('change', (e) => addPlayer(e.target, 1));
    elements.team2PlayerSearch.addEventListener('change', (e) => addPlayer(e.target, 2));
    elements.predictBtn.addEventListener('click', handlePrediction);

    // --- FUNCTIONS ---
    function handleTeamChange() {
        const team1 = elements.team1Input.value;
        const team2 = elements.team2Input.value;

        // Update batting first dropdown
        elements.battingFirstSelect.innerHTML = '<option value="" selected>Select Team...</option>';
        if (team1) elements.battingFirstSelect.add(new Option(team1, team1));
        if (team2) elements.battingFirstSelect.add(new Option(team2, team2));
        elements.battingFirstSelect.disabled = !(team1 && team2);

        // Update player selection UI
        updatePlayerSelectionUI(1, team1);
        updatePlayerSelectionUI(2, team2);
    }

    function updatePlayerSelectionUI(teamNum, teamName) {
        const searchInput = elements[`team${teamNum}PlayerSearch`];
        const squadLabel = elements[`team${teamNum}SquadLabel`];
        const squadDiv = elements[`team${teamNum}SquadDiv`];
        const playerCount = elements[`team${teamNum}PlayerCount`];
        const datalistId = `team${teamNum}-players-datalist`;

        squadLabel.textContent = teamName ? `${teamName} Squad` : `Team ${teamNum} Squad`;
        squadDiv.innerHTML = ''; // Clear squad on team change
        playerCount.textContent = '0/11 Players';
        
        if (teamName && elements.playersData[teamName]) {
            searchInput.disabled = false;
            populateDatalist(datalistId, elements.playersData[teamName]);
        } else {
            searchInput.disabled = true;
            populateDatalist(datalistId, []);
        }
    }
    
    function populateDatalist(id, items) {
        const datalist = document.getElementById(id);
        if (!datalist) return;
        datalist.innerHTML = '';
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            datalist.appendChild(option);
        });
    }

    function addPlayer(inputElement, teamNum) {
        const playerName = inputElement.value;
        const squadDiv = elements[`team${teamNum}SquadDiv`];
        
        if (!playerName || squadDiv.children.length >= 11) {
            inputElement.value = '';
            return;
        }

        // Check for duplicates
        const currentPlayers = Array.from(squadDiv.children).map(tag => tag.dataset.playerName);
        if (currentPlayers.includes(playerName)) {
            inputElement.value = '';
            return; // Don't add duplicates
        }

        const tag = document.createElement('span');
        tag.className = `player-tag badge d-flex align-items-center p-2 text-dark-emphasis bg-light-subtle border border-dark-subtle rounded-pill`;
        tag.dataset.playerName = playerName;
        tag.innerHTML = `${playerName} <button type="button" class="btn-close ms-2" aria-label="Close"></button>`;
        
        tag.querySelector('.btn-close').addEventListener('click', () => {
            tag.remove();
            updatePlayerCount(teamNum);
        });

        squadDiv.appendChild(tag);
        updatePlayerCount(teamNum);
        inputElement.value = '';
    }

    function updatePlayerCount(teamNum) {
        const squadDiv = elements[`team${teamNum}SquadDiv`];
        const playerCountEl = elements[`team${teamNum}PlayerCount`];
        const count = squadDiv.children.length;
        playerCountEl.textContent = `${count}/11 Players`;
        playerCountEl.className = count === 11 ? 'text-end text-success mt-1 fw-bold' : 'text-end text-muted mt-1';
    }

    function handlePrediction() {
        const team1 = elements.team1Input.value;
        const team2 = elements.team2Input.value;

        if (!team1 || !team2) {
            alert("Please select both teams to start the analysis.");
            return;
        }
        if (team1 === team2) {
            alert("Team 1 and Team 2 cannot be the same.");
            return;
        }

        elements.dashboard.classList.remove('d-none');
        elements.spinner.classList.remove('d-none');
        elements.predictionContent.classList.add('d-none');

        const formData = new FormData();
        formData.append('csrfmiddlewaretoken', elements.csrfToken);
        formData.append('team1', team1);
        formData.append('team2', team2);
        formData.append('venue', elements.venueInput.value);
        formData.append('batting_first', elements.battingFirstSelect.value);
        formData.append('first_innings_total', elements.firstInningsTotalInput.value);
        
        elements.team1SquadDiv.querySelectorAll('.player-tag').forEach(tag => formData.append('team1_players[]', tag.dataset.playerName));
        elements.team2SquadDiv.querySelectorAll('.player-tag').forEach(tag => formData.append('team2_players[]', tag.dataset.playerName));

        fetch('/predict/', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            elements.spinner.classList.add('d-none');
            elements.predictionContent.classList.remove('d-none');
            if (data.error) {
                alert(`An error occurred: ${data.error}`);
            } else {
                displayPredictionResults(data);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            elements.spinner.classList.add('d-none');
            alert('A critical error occurred while fetching the prediction.');
        });
    }

    function displayPredictionResults(data) {
        const { final_prediction, statistical_factors, ml_models } = data;
        
        // Final Prediction
        elements.finalPredictionText.innerHTML = `${final_prediction.winner} to Win <span class="text-success">(${final_prediction.probability}%)</span>`;
        elements.predictionSummary.textContent = `Prediction based on a weighted analysis of ${statistical_factors.length} statistical factors and ${ml_models.length} machine learning models.`;

        // Statistical Factors
        elements.factorList.innerHTML = '';
        statistical_factors.forEach(factor => {
            let advantageClass = 'advantage-neutral';
            if (factor.advantage === final_prediction.winner && final_prediction.winner !== 'Toss-up') {
                advantageClass = 'advantage-green';
            } else if (factor.advantage !== 'Neutral') {
                advantageClass = 'advantage-red';
            }
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-start';
            li.innerHTML = `
                <div class="ms-2 me-auto">
                    <div class="fw-bold">${factor.name}</div>
                    <small class="text-muted">${factor.detail}</small>
                </div>
                <span class="badge rounded-pill ${advantageClass}">${factor.advantage}</span>
            `;
            elements.factorList.appendChild(li);
        });

        // ML Models
        elements.modelList.innerHTML = '';
        if (ml_models.length > 0) {
            ml_models.forEach(model => {
                const div = document.createElement('div');
                div.className = 'mb-3';
                div.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold">${model.name}</span>
                        <span>${model.prediction} (${model.confidence}%)</span>
                    </div>
                    <div class="progress" role="progressbar" aria-valuenow="${model.confidence}" aria-valuemin="0" aria-valuemax="100">
                        <div class="progress-bar" style="width: ${model.confidence}%"></div>
                    </div>
                `;
                elements.modelList.appendChild(div);
            });
        } else {
            elements.modelList.innerHTML = `<p class="text-muted">ML model predictions require a venue to be selected.</p>`;
        }
    }
});
