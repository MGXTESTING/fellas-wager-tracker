const fightCounter = document.getElementById("total-fights");

const SUPABASE_URL = "https://nnonemipntcueebazevy.supabase.co";
const SUPABASE_KEY = "sb_publishable_k47fN2XUYYhPL43qzgYVLA_XpOB8RFf";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let selectedPlayerId = null;
let editingFightId = null;

let fights = [];


const GAMEMODE_ICONS = {
    sword: "assets/gamemodes/sword.png",
    axe: "assets/gamemodes/axe.png",
    crystal: "assets/gamemodes/crystal.png",
    uhc: "assets/gamemodes/uhc.png",
    pot: "assets/gamemodes/pot.png",
    mace: "assets/gamemodes/mace.gif",
    manhunt: "assets/gamemodes/manhunt.gif",
    nethpot: "assets/gamemodes/nethpot.png",
    smp: "assets/gamemodes/smp.png",
    spearmace: "assets/gamemodes/spearmace.png"
};

const PLAYER_MINECRAFT_NAMES = {
    "dreammn" : "Dreavm"
};


function normalizePlayerName(name) {
    return name.trim().toLowerCase();
}

function isSamePlayer(nameA, nameB) {
    return normalizePlayerName(nameA) === normalizePlayerName(nameB);
}

function sortFightsByDate(fightList) {
    return [...fightList].sort((a, b) => {
        if (!a.matchDate && !b.matchDate) {
            return a.id - b.id;
        }

        if (!a.matchDate) return -1;
        if (!b.matchDate) return 1;

        return (
            a.matchDate.localeCompare(b.matchDate) ||
            a.id - b.id
        );
    });
}

function formatMatchDate(dateString) {
    if (!dateString) {
        return "Date not set";
    }

    const [year, month, day] = dateString.split("-").map(Number);

    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function calculateFightScore(fight) {
    let winsA = 0;
    let winsB = 0;
    let winnerTeam = 'N';

    for (const mode of fight.gamemodes) {
        if (mode.scoreA > mode.scoreB) {
            winsA++;
        } else if (mode.scoreB > mode.scoreA) {
            winsB++;
        }
    }

    if(winsA > winsB){
       winnerTeam = 'A';
    }
       else if (winsB > winsA)
       {
       winnerTeam = 'B';}
       else{
           winnerTeam = 'N';
       }
      
    return {
        teamA: winsA,
        teamB: winsB,
        winners: winnerTeam

     };
}


function calculateFightPoints(fight) {
    const result = calculateFightScore(fight);
    const points = fight.teamA.length;

    if (result.winners === "A") {
        return {
            teamA: points,
            teamB: -points
        };
    }

    if (result.winners === "B") {
        return {
            teamA: -points,
            teamB: points
        };
    }

    return {
        teamA: 0,
        teamB: 0
    };
}


function getNextFightId() {
    return fights.reduce((highestId, fight) => {
        return Math.max(highestId, fight.id);
    }, 0) + 1;
}

function calculatePlayerStats(fights) {
    const playerStats = {};

    for (const fight of fights) {
        const players = [...fight.teamA, ...fight.teamB];
        const result = calculateFightScore(fight);
        const fightPoints = calculateFightPoints(fight);

        for (const player of players) {
            const playerId = normalizePlayerName(player);

            if (playerStats[playerId] === undefined) {
                playerStats[playerId] = {
                    displayName: player,
                    played: 0,
                    wins: 0,
                    losses: 0,
                    points: 0,
                    winRate: 0.0
                };
            }

            playerStats[playerId].played++;

            if (fight.teamA.includes(player)) {
                if (result.winners === 'A') {
                    playerStats[playerId].wins++;
                    playerStats[playerId].points += fightPoints.teamA;
                } else if (result.winners === 'B') {
                    playerStats[playerId].losses++;
                    playerStats[playerId].points += fightPoints.teamA;
                }
            } else {
                if (result.winners === 'B') {
                    playerStats[playerId].wins++;
                    playerStats[playerId].points += fightPoints.teamB;
                } else if (result.winners === 'A') {
                    playerStats[playerId].losses++;
                    playerStats[playerId].points += fightPoints.teamB;
                }
            }
        }
    }

    for (const player in playerStats) {
        playerStats[player].winRate =
            playerStats[player].wins / playerStats[player].played * 100;
    }

    return playerStats;
}


function calculatePlayerStreakStats(playerName, fights) {
    const playerId = normalizePlayerName(playerName);

    let currentStreak = 0;
    let bestStreak = 0;

    const results = [];

    const sortedFights = sortFightsByDate(fights);

    for (const fight of sortedFights) {
        const onTeamA = fight.teamA.some(name =>
            isSamePlayer(name, playerId)
        );

        const onTeamB = fight.teamB.some(name =>
            isSamePlayer(name, playerId)
        );

        if (!onTeamA && !onTeamB) continue;

        const score = calculateFightScore(fight);

        const won =
            (onTeamA && score.winners === "A") ||
            (onTeamB && score.winners === "B");

        results.push(won ? "W" : "L");

        if (won) {
            currentStreak++;

            if (currentStreak > bestStreak) {
                bestStreak = currentStreak;
            }
        } else {
            currentStreak = 0;
        }
    }

    return {
        currentStreak,
        bestStreak,
        recentForm: results.slice(-5)
    };
}


function calculatePlayerGamemodeStats(playerName, fights) {
    const modeStats = {};

    for (const fight of fights) {
        const onTeamA = fight.teamA.some(name => isSamePlayer(name, playerName));
        const onTeamB = fight.teamB.some(name => isSamePlayer(name, playerName));

        if (!onTeamA && !onTeamB) continue;

        for (const gamemode of fight.gamemodes) {
            const modeName = gamemode.name;

            if (modeStats[modeName] === undefined) {
                modeStats[modeName] = {
                    wins: 0,
                    losses: 0
                };
            }

            const wonGamemode =
                (onTeamA && gamemode.scoreA > gamemode.scoreB) ||
                (onTeamB && gamemode.scoreB > gamemode.scoreA);

            if (wonGamemode) {
                modeStats[modeName].wins++;
            } else {
                modeStats[modeName].losses++;
            }
        }
    }

    return modeStats;
}


function calculatePlayerRelationships(playerName, fights) {
    const teammates = {};
    const opponents = {};
    const playerId = normalizePlayerName(playerName);

    function recordPlayer(collection, name, won) {
        const id = normalizePlayerName(name);

        if (collection[id] === undefined) {
            collection[id] = {
                displayName: name,
                played: 0,
                wins: 0,
                losses: 0
            };
        }

        collection[id].played++;

        if (won) {
            collection[id].wins++;
        } else {
            collection[id].losses++;
        }
    }

    for (const fight of fights) {
        const onTeamA = fight.teamA.some(
            name => isSamePlayer(name, playerId)
        );

        const onTeamB = fight.teamB.some(
            name => isSamePlayer(name, playerId)
        );

        if (!onTeamA && !onTeamB) continue;

        const ownTeam = onTeamA ? fight.teamA : fight.teamB;
        const enemyTeam = onTeamA ? fight.teamB : fight.teamA;

        const result = calculateFightScore(fight);

        const won =
            (onTeamA && result.winners === "A") ||
            (onTeamB && result.winners === "B");

        for (const teammate of ownTeam) {
            if (isSamePlayer(teammate, playerId)) continue;

            recordPlayer(teammates, teammate, won);
        }

        for (const opponent of enemyTeam) {
            recordPlayer(opponents, opponent, won);
        }
    }

    return { teammates, opponents };
}




function displayLeaderboard(playerStats) {
    const tableBody = document.getElementById("leaderboard-body");
    tableBody.innerHTML = "";

    const sortedPlayers = Object.entries(playerStats);

    sortedPlayers.sort((a, b) => {
        const statsA = a[1];
        const statsB = b[1];

        return (
            statsB.points - statsA.points ||
            statsB.winRate - statsA.winRate ||
            statsB.played - statsA.played
        );
    });

    sortedPlayers.forEach(([player, stats], index) => {
        const row = document.createElement("tr");

        if (index < 3) {
            row.classList.add("top-three");
            row.classList.add(`rank-${index + 1}`);
        }

        const values = [
            index + 1,
            stats.displayName,
            stats.points,
            stats.played,
            stats.wins,
            stats.losses,
            stats.winRate.toFixed(1) + "%"
        ];

        for (const value of values) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        }

        const nameCell = row.children[1];
        nameCell.classList.add("leaderboard-player");

        const playerContent = document.createElement("div");
        playerContent.className = "leaderboard-player-content";

        const avatar = createPlayerAvatar(player, 32);

        const nameSpan = document.createElement("span");
        nameSpan.textContent = stats.displayName;

        playerContent.appendChild(avatar);
        playerContent.appendChild(nameSpan);
        nameCell.replaceChildren(playerContent);

        nameCell.addEventListener("click", function() {
            showPlayerView(player);
        });

        const pointsCell = row.children[2];

        pointsCell.textContent =
            stats.points > 0 ? `+${stats.points}` : String(stats.points);

        pointsCell.classList.add(
            stats.points > 0
                ? "points-positive"
                : stats.points < 0
                    ? "points-negative"
                    : "points-neutral"
        );

        tableBody.appendChild(row);
    });
}




function showDashboardView() {
    window.location.hash = "";
    handleRouteChange();
}

function showPlayerView(playerName) {
    const playerId = normalizePlayerName(playerName);

    window.location.hash = `player/${encodeURIComponent(playerId)}`;
    handleRouteChange();
}


function handleRouteChange() {
    const dashboardView = document.getElementById("dashboard-view");
    const playerView = document.getElementById("player-view");

    const hash = window.location.hash;

    if (!hash.startsWith("#player/")) {
        dashboardView.hidden = false;
        playerView.hidden = true;
        selectedPlayerId = null;
        window.scrollTo(0, 0);
        return;
    }

    let playerId;

    try {
        playerId = decodeURIComponent(hash.slice("#player/".length));
    } catch (error) {
        showDashboardView();
        return;
    }

    playerId = normalizePlayerName(playerId);

    const playerStats = calculatePlayerStats(fights);

    if (!playerId || !playerStats[playerId]) {
        dashboardView.hidden = false;
        playerView.hidden = true;
        selectedPlayerId = null;
        window.scrollTo(0, 0);
        return;
    }

    displayPlayerProfile(playerId, playerStats);

    dashboardView.hidden = true;
    playerView.hidden = false;

    window.scrollTo(0, 0);
}


function createMatchCard(fight) {
    const matchCard = document.createElement("div");
    matchCard.className = "match-card";

    const result = calculateFightScore(fight);
    const fightPoints = calculateFightPoints(fight);

    function createTextElement(tag, className, text) {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;
        return element;
    }

    function createPointsLabel(points) {
        const formattedPoints =
            points > 0 ? `+${points}` : String(points);

        const label = createTextElement(
            "span",
            "match-points",
            `${formattedPoints} POINTS`
        );

        label.classList.add(
            points > 0
                ? "points-positive"
                : points < 0
                    ? "points-negative"
                    : "points-neutral"
        );

        return label;
    }

    const header = document.createElement("div");
    header.className = "match-header";

    const headerInfo = document.createElement("div");
    headerInfo.className = "match-header-info";

    headerInfo.appendChild(
    createTextElement("span", "match-id", `MATCH #${fight.id}`)
    );

headerInfo.appendChild(
    createTextElement(
        "span",
        "match-date",
        formatMatchDate(fight.matchDate)
    )
);

header.appendChild(headerInfo);

    const winnerText =
        result.winners === "A" ? "TEAM A WINS" :
        result.winners === "B" ? "TEAM B WINS" :
        "NO WINNER";

    header.appendChild(
        createTextElement("span", "match-winner", winnerText)
    );

    matchCard.appendChild(header);

    const matchup = document.createElement("div");
    matchup.className = "match-matchup";

    const teamA = document.createElement("div");
    teamA.className = "match-team";

    if (result.winners === "A") {
        teamA.classList.add("winning-team");
    }

    teamA.appendChild(
        createTextElement("span", "team-label", "TEAM A")
    );

    for (const player of fight.teamA) {
        teamA.appendChild(
            createTextElement("div", "team-player", player)
        );
    }

    teamA.appendChild(createPointsLabel(fightPoints.teamA));

    const score = document.createElement("div");
    score.className = "match-score";

    const scoreA = createTextElement(
        "span",
        "score-number",
        result.teamA
    );

    const scoreB = createTextElement(
        "span",
        "score-number",
        result.teamB
    );

    if (result.winners === "A") {
        scoreA.classList.add("winning-score");
    } else if (result.winners === "B") {
        scoreB.classList.add("winning-score");
    }

    score.appendChild(scoreA);
    score.appendChild(
        createTextElement("span", "score-separator", ":")
    );
    score.appendChild(scoreB);

    const teamB = document.createElement("div");
    teamB.className = "match-team";

    if (result.winners === "B") {
        teamB.classList.add("winning-team");
    }

    teamB.appendChild(
        createTextElement("span", "team-label", "TEAM B")
    );

    for (const player of fight.teamB) {
        teamB.appendChild(
            createTextElement("div", "team-player", player)
        );
    }

    teamB.appendChild(createPointsLabel(fightPoints.teamB));

    matchup.appendChild(teamA);
    matchup.appendChild(score);
    matchup.appendChild(teamB);

    matchCard.appendChild(matchup);

    const modesContainer = document.createElement("div");
    modesContainer.className = "match-gamemodes";

    for (const gamemode of fight.gamemodes) {
        const modeRow = document.createElement("div");
        modeRow.className = "match-mode-row";

        const modeLabel = document.createElement("div");
        modeLabel.className = "mode-label";

        const modeIcon = createGamemodeIcon(gamemode.name);

        if (modeIcon) {
            modeLabel.appendChild(modeIcon);
        }

        modeLabel.appendChild(
            createTextElement("span", "mode-name", gamemode.name)
        );

        modeRow.appendChild(modeLabel);

        const modeScore = document.createElement("div");
        modeScore.className = "mode-score";

        const modeScoreA = createTextElement(
            "span",
            "mode-score-number",
            gamemode.scoreA
        );

        const modeScoreB = createTextElement(
            "span",
            "mode-score-number",
            gamemode.scoreB
        );

        if (gamemode.scoreA > gamemode.scoreB) {
            modeScoreA.classList.add("winning-score");
        } else if (gamemode.scoreB > gamemode.scoreA) {
            modeScoreB.classList.add("winning-score");
        }

        modeScore.appendChild(modeScoreA);
        modeScore.appendChild(
            createTextElement("span", "mode-separator", "–")
        );
        modeScore.appendChild(modeScoreB);

        modeRow.appendChild(modeScore);
        modesContainer.appendChild(modeRow);
    }

    matchCard.appendChild(modesContainer);

    if (isAdmin) {
        const actions = document.createElement("div");
        actions.className = "match-actions";

        const editButton = document.createElement("button");
        editButton.textContent = "Edit Match";
        editButton.className = "edit-match-button";

        editButton.addEventListener("click", function() {
            editFight(fight.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete Match";
        deleteButton.className = "delete-match-button";

        deleteButton.addEventListener("click", function() {
            deleteFight(fight.id);
        });

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        matchCard.appendChild(actions);
    }

    return matchCard;
}



function displayMatchHistory(fights) {
    const historyContainer = document.getElementById("fight-history");
    historyContainer.innerHTML = "";

    const sortedFights = sortFightsByDate(fights).reverse();

    for (const fight of sortedFights) {
        const matchCard = createMatchCard(fight);
        historyContainer.appendChild(matchCard);
    }
}

function refreshUI() {
    const updatedStats = calculatePlayerStats(fights);

    displayLeaderboard(updatedStats);
    displayMatchHistory(fights);

    fightCounter.textContent = fights.length;

    if (selectedPlayerId !== null) {
        if (updatedStats[selectedPlayerId] !== undefined) {
            displayPlayerProfile(selectedPlayerId, updatedStats);
        } else {
            document.getElementById("player-profile").textContent =
                "This player has no recorded matches.";
            selectedPlayerId = null;
        }
    }
}


async function deleteFight(id) {
    if (!isAdmin) {
        alert("Only the administrator can delete matches.");
        return;
    }

    if (!confirm("Are you sure you want to delete this match?")) {
        return;
    }

    const { error } = await db
        .from("fights")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Failed to delete match:", error);
        alert("Failed to delete match: " + error.message);
        return;
    }

    await loadFightsFromDatabase();
}



function editFight(fightId) {
    const fight = fights.find(fight => fight.id === fightId);

    if (!fight) return;

    editingFightId = fightId;

    document.getElementById("team-a").value = fight.teamA.join(", ");
    document.getElementById("team-b").value = fight.teamB.join(", ");
    document.getElementById("match-date").value = fight.matchDate || "";

    gamemodesContainer.innerHTML = "";

    for (const gamemode of fight.gamemodes) {
        addGamemodeRow(
            gamemode.name,
            gamemode.scoreA,
            gamemode.scoreB
        );
    }

    const submitButton = fightForm.querySelector('button[type="submit"]');
    submitButton.textContent = "Save Changes";

    fightForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}



function displayPlayerProfile(playerName, playerStats) {
    const profileContainer = document.getElementById("player-profile");
    const playerId = normalizePlayerName(playerName);
    selectedPlayerId = playerId;

    const selectedStats = playerStats[playerId];

    if (!selectedStats) {
        selectedPlayerId = null;
        profileContainer.textContent = "Player not found.";
        return;
    }

    const gamemodeStats = calculatePlayerGamemodeStats(playerId, fights);
    const relationshipStats = calculatePlayerRelationships(playerId, fights);
    const streakStats = calculatePlayerStreakStats(playerId, fights);

    profileContainer.innerHTML = "";

    function createTextElement(tag, className, text) {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;
        return element;
    }

    const playerHeader = document.createElement("div");
    playerHeader.className = "profile-header";

    const playerIdentity = document.createElement("div");
    playerIdentity.className = "profile-identity";

    const playerDetails = document.createElement("div");
    playerDetails.className = "profile-player-details";

    const playerAvatar = createPlayerAvatar(playerId, 80);

    playerDetails.appendChild(playerAvatar);
    playerDetails.appendChild(playerIdentity);

    playerIdentity.appendChild(
        createTextElement("span", "profile-subtitle", "PLAYER PROFILE")
    );

    playerIdentity.appendChild(
        createTextElement("h2", "profile-name", selectedStats.displayName)
    );

    const winRateBadge = createTextElement(
        "span",
        "profile-winrate",
        `${selectedStats.winRate.toFixed(1)}% WIN RATE`
    );

    playerHeader.appendChild(playerDetails);
    playerHeader.appendChild(winRateBadge);
    profileContainer.appendChild(playerHeader);

    const statsGrid = document.createElement("div");
    statsGrid.className = "profile-stats-grid";

    const summaryStats = [
        { label: "RANKING POINTS", value: selectedStats.points },
        { label: "MATCHES PLAYED", value: selectedStats.played },
        { label: "WINS", value: selectedStats.wins },
        { label: "LOSSES", value: selectedStats.losses }
    ];

    for (const stat of summaryStats) {
        const statCard = document.createElement("div");
        statCard.className = "profile-stat-card";

        if (stat.label === "WINS") {
            statCard.classList.add("profile-stat-wins");
        }

        let formattedValue = stat.value;

        if (stat.label === "RANKING POINTS") {
            statCard.classList.add("profile-stat-points");

            formattedValue =
                stat.value > 0 ? `+${stat.value}` : String(stat.value);
        }

        const valueElement = createTextElement(
            "span",
            "profile-stat-value",
            formattedValue
        );

        if (stat.label === "RANKING POINTS") {
            valueElement.classList.add(
                stat.value > 0
                    ? "points-positive"
                    : stat.value < 0
                        ? "points-negative"
                        : "points-neutral"
            );
        }

        statCard.appendChild(valueElement);

        statCard.appendChild(
            createTextElement("span", "profile-stat-label", stat.label)
        );

        statsGrid.appendChild(statCard);
    }

    profileContainer.appendChild(statsGrid);

    const streakGrid = document.createElement("div");
    streakGrid.className = "profile-streak-grid";

    const streakCards = [
        {
            label: "CURRENT WINSTREAK",
            value: streakStats.currentStreak
        },
        {
            label: "BEST WINSTREAK",
            value: streakStats.bestStreak
        }
    ];

    for (const streak of streakCards) {
        const card = document.createElement("div");
        card.className = "profile-streak-card";

        card.appendChild(
            createTextElement("span", "profile-streak-label", streak.label)
        );

        card.appendChild(
            createTextElement("span", "profile-streak-value", streak.value)
        );

        streakGrid.appendChild(card);
    }

    profileContainer.appendChild(streakGrid);

    const formSection = document.createElement("div");
    formSection.className = "profile-form-section";

    formSection.appendChild(
        createTextElement("h3", "", "Recent Form")
    );

    const formRow = document.createElement("div");
    formRow.className = "profile-form-row";

    for (const result of streakStats.recentForm) {
        const badge = createTextElement(
            "span",
            result === "W"
                ? "form-badge form-win"
                : "form-badge form-loss",
            result
        );

        formRow.appendChild(badge);
    }

    formSection.appendChild(formRow);
    profileContainer.appendChild(formSection);

    const gamemodeSection = document.createElement("section");
    gamemodeSection.className = "profile-section";

    gamemodeSection.appendChild(
        createTextElement("h3", "", "Gamemode Performance")
    );

    const gamemodeList = document.createElement("div");
    gamemodeList.className = "profile-gamemode-list";

    for (const [modeName, stats] of Object.entries(gamemodeStats)) {
        const total = stats.wins + stats.losses;
        const winRate = total > 0 ? (stats.wins / total) * 100 : 0;

        const modeItem = document.createElement("div");
        modeItem.className = "profile-gamemode-item";

        const modeInfo = document.createElement("div");
        modeInfo.className = "profile-gamemode-info";

        const modeLabel = document.createElement("div");
        modeLabel.className = "mode-label";

        const modeIcon = createGamemodeIcon(modeName);

        if (modeIcon) {
            modeLabel.appendChild(modeIcon);
        }

        modeLabel.appendChild(
            createTextElement("span", "profile-mode-name", modeName)
        );

        modeInfo.appendChild(modeLabel);

        modeInfo.appendChild(
            createTextElement(
                "span",
                "profile-mode-record",
                `${stats.wins}W / ${stats.losses}L · ${winRate.toFixed(1)}%`
            )
        );

        const progressTrack = document.createElement("div");
        progressTrack.className = "profile-progress-track";

        const progressFill = document.createElement("div");
        progressFill.className = "profile-progress-fill";
        progressFill.style.width = `${winRate}%`;

        progressTrack.appendChild(progressFill);

        modeItem.appendChild(modeInfo);
        modeItem.appendChild(progressTrack);

        gamemodeList.appendChild(modeItem);
    }

    if (gamemodeList.children.length === 0) {
        gamemodeList.appendChild(
            createTextElement("p", "", "No gamemode statistics available.")
        );
    }

    gamemodeSection.appendChild(gamemodeList);
    profileContainer.appendChild(gamemodeSection);

    const relationshipsSection = document.createElement("section");
    relationshipsSection.className = "profile-relationships";

    displayRelationshipStats(
        relationshipsSection,
        "Teammate Records",
        relationshipStats.teammates
    );

    displayRelationshipStats(
        relationshipsSection,
        "Opponent Records",
        relationshipStats.opponents
    );

    profileContainer.appendChild(relationshipsSection);

    const historySection = document.createElement("section");
    historySection.className = "profile-history";

    historySection.appendChild(
        createTextElement("h3", "", "Match History")
    );

    for (const fight of sortFightsByDate(fights).reverse()) {
        const onTeamA = fight.teamA.some(
            name => isSamePlayer(name, playerId)
        );

        const onTeamB = fight.teamB.some(
            name => isSamePlayer(name, playerId)
        );

        if (!onTeamA && !onTeamB) continue;

        const matchCard = createMatchCard(fight);
        const result = calculateFightScore(fight);
        const fightPoints = calculateFightPoints(fight);

        const wonMatch =
            (onTeamA && result.winners === "A") ||
            (onTeamB && result.winners === "B");

        const playerPoints =
            onTeamA ? fightPoints.teamA : fightPoints.teamB;

        const formattedPoints =
            playerPoints > 0
                ? `+${playerPoints}`
                : String(playerPoints);

        const outcomeLine = createTextElement(
            "span",
            wonMatch ? "profile-outcome win" : "profile-outcome loss",
            `${wonMatch ? "WIN" : "LOSS"} · ${formattedPoints} POINTS`
        );

        matchCard.appendChild(outcomeLine);
        historySection.appendChild(matchCard);
    }

    profileContainer.appendChild(historySection);
}

function displayRelationshipStats(container, title, records) {
    const heading = document.createElement("h3");
    heading.textContent = title;
    container.appendChild(heading);

    const entries = Object.values(records).sort(
        (a, b) => b.played - a.played
    );

    if (entries.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No records yet.";
        container.appendChild(emptyMessage);
        return;
    }

    const table = document.createElement("table");

    const header = document.createElement("tr");

    for (const label of ["Player", "Matches", "Wins", "Losses"]) {
        const cell = document.createElement("th");
        cell.textContent = label;
        header.appendChild(cell);
    }

    table.appendChild(header);

    for (const record of entries) {
        const row = document.createElement("tr");

        const values = [
            record.displayName,
            record.played,
            record.wins,
            record.losses
        ];

        for (const value of values) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        }

        table.appendChild(row);
    }

    container.appendChild(table);
}



function createGamemodeIcon(modeName) {
    const normalizedName = modeName.trim().toLowerCase();

    const defaultIcon = "assets/gamemodes/default.png";

    const iconPath =
        GAMEMODE_ICONS[normalizedName] || defaultIcon;

    const icon = document.createElement("img");

    icon.src = iconPath;
    icon.alt = "";
    icon.className = "gamemode-icon";
    icon.width = 24;
    icon.height = 24;

    icon.onerror = function() {
        icon.onerror = null;
        icon.src = defaultIcon;
    };

    return icon;
}



const fightForm = document.getElementById("fight-form");

fightForm.addEventListener("submit", async function(event) {
    event.preventDefault();
    if (!isAdmin) {
    alert("Only the administrator can modify matches.");
    return;
}

    const teamAInput = document.getElementById("team-a").value;
    const teamBInput = document.getElementById("team-b").value;
    const matchDate = document.getElementById("match-date").value;

    if (!matchDate) {
      alert("Please select the date when the match happened.");
      return;
    }

    const teamAArray = teamAInput
        .split(",")
        .map(name => name.trim())
        .filter(name => name !== "");

    const teamBArray = teamBInput
        .split(",")
        .map(name => name.trim())
        .filter(name => name !== "");
    
    if(teamAArray.length !== teamBArray.length || teamAArray.length === 0){
        console.log("Invalid teams!");
        return;
    }

    const allPlayers = [...teamAArray, ...teamBArray];
    const normalizedPlayers = allPlayers.map(normalizePlayerName);

    if (new Set(normalizedPlayers).size !== normalizedPlayers.length) {
       alert("A player cannot appear more than once in the same match!");
    return;
}

    const newFight = {
    teamA: teamAArray,
    teamB: teamBArray,
    gamemodes: []
};

    const modeRows = document.querySelectorAll(".gamemode-row");

    for (const row of modeRows) {
     const scoreAInput = row.querySelector(".score-a").value;
     const scoreBInput = row.querySelector(".score-b").value;
     const gamemodeName = row.querySelector(".mode-name").value.trim();

     if(scoreAInput === "" || scoreBInput === "" || gamemodeName === ""){
         console.log("Invalid gamemode!");
         return;
     }

     const firstScore = Number(scoreAInput);
     const secondScore = Number(scoreBInput);

     if (
        firstScore < 0 ||
        secondScore < 0 ||
        !Number.isInteger(firstScore) ||
        !Number.isInteger(secondScore) ||
        firstScore === secondScore
    ) {
     console.log("Invalid scores or tied gamemodes! (gamemodes cannot end in ties)");
     return;
    }

     const gamemode = {
         name: gamemodeName,
         scoreA: firstScore,
         scoreB: secondScore
};
    newFight.gamemodes.push(gamemode);

  }

  const result = calculateFightScore(newFight);

  if(newFight.gamemodes.length === 0 || result.winners === "N"){
      console.log("Invalid fight!");
      return;
  }

const submitButton = fightForm.querySelector('button[type="submit"]');

submitButton.disabled = true;
submitButton.textContent = "Saving...";

let saveSucceeded = false;

try {
    
const fightData = {
    team_a: newFight.teamA,
    team_b: newFight.teamB,
    gamemodes: newFight.gamemodes,
    match_date: matchDate
};

let error;

if (editingFightId === null) {
    const response = await db
        .from("fights")
        .insert(fightData);

    error = response.error;
} else {
    const response = await db
        .from("fights")
        .update(fightData)
        .eq("id", editingFightId)
        .select("id");

    error = response.error;

    if (!error && response.data.length === 0) {
        throw new Error("The match was not updated.");
    }
}

    if (error) {
        console.error("Failed to save match:", error);
        alert("Failed to save match: " + error.message);
        return;
    }

    saveSucceeded = true;
} catch (error) {
    console.error("Unexpected error saving match:", error);
    alert("Failed to save match: " + error.message);
} finally {
    submitButton.disabled = false;
    submitButton.textContent =
    editingFightId === null ? "Submit Fight" : "Save Changes";
}

if (!saveSucceeded) {
    return;
}

editingFightId = null;

fightForm.reset();
gamemodesContainer.innerHTML = "";

await loadFightsFromDatabase();

});

document.getElementById("back-to-dashboard")
    .addEventListener("click", showDashboardView);

const addGamemodeButton = document.getElementById("add-gamemode");
const gamemodesContainer = document.getElementById("gamemodes-container");


function addGamemodeRow(name = "", scoreA = "", scoreB = "") {
    const row = document.createElement("div");
    row.className = "gamemode-row";

    row.innerHTML = `
        <input class="mode-name" type="text" placeholder="Gamemode">
        <input class="score-a" type="number" placeholder="Team A Score">
        <input class="score-b" type="number" placeholder="Team B Score">
    `;

    row.querySelector(".mode-name").value = name;
    row.querySelector(".score-a").value = scoreA;
    row.querySelector(".score-b").value = scoreB;

    gamemodesContainer.appendChild(row);
}

addGamemodeButton.addEventListener("click", function() {
    addGamemodeRow();
});



function createPlayerAvatar(playerName, size = 40) {
    const playerId = normalizePlayerName(playerName);
    const minecraftName =
        PLAYER_MINECRAFT_NAMES[playerId] || playerName.trim();

    const avatar = document.createElement("img");

    avatar.className = "player-avatar";
    avatar.width = size;
    avatar.height = size;
    avatar.alt = `${playerName}'s Minecraft avatar`;

    avatar.src =
        `https://mc-heads.net/avatar/${encodeURIComponent(minecraftName)}/${size}`;

    avatar.onerror = function() {
        avatar.onerror = null;
        avatar.src = "assets/default-avatar.png";
    };

    return avatar;
}

window.addEventListener("hashchange", handleRouteChange);

async function testDatabaseConnection() {
    const { data, error } = await db
        .from("fights")
        .select("*");

    if (error) {
        console.error("Database connection failed:", error);
        return;
    }

    console.log("Connected to Supabase!");
    console.log("Database fights:", data);
}

async function loadFightsFromDatabase() {
    const { data, error } = await db
        .from("fights")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        console.error("Failed to load fights:", error);
        return;
    }

    fights = data.map(fight => ({
        id: fight.id,
        teamA: fight.team_a,
        teamB: fight.team_b,
        gamemodes: fight.gamemodes,
        matchDate: fight.match_date
    }));

    refreshUI();
    handleRouteChange();

    console.log("Loaded fights from Supabase:", fights);
}

const loginForm = document.getElementById("login-form");
const adminSession = document.getElementById("admin-session");
const logoutButton = document.getElementById("logout-button");
const authMessage = document.getElementById("auth-message");

let isAdmin = false;

const ADMIN_UID = "df7c60f5-16a6-4f1a-a543-3b5773c4ed9a";

function updateAuthUI() {
    loginForm.hidden = isAdmin;
    adminSession.hidden = !isAdmin;

    updateAdminControls();
    refreshUI();
}

function updateAdminControls() {
    fightForm.hidden = !isAdmin;
}

async function checkAuthSession() {
    const { data, error } = await db.auth.getUser();

    if (error) {
        console.log("No authenticated user:", error.message);
    }

    isAdmin = data.user?.id === ADMIN_UID;

    updateAuthUI();
}


loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    authMessage.textContent = "Logging in...";

    const { data, error } = await db.auth.signInWithPassword({
        email,
        password
    });

    document.getElementById("login-password").value = "";

    if (error) {
        authMessage.textContent = "Login failed: " + error.message;
        return;
    }

    isAdmin = data.user?.id === ADMIN_UID;

    if (!isAdmin) {
        await db.auth.signOut();
        authMessage.textContent = "This account is not an administrator.";
        updateAuthUI();
        return;
    }

    authMessage.textContent = "Login successful!";
    updateAuthUI();
});

logoutButton.addEventListener("click", async function() {
    const { error } = await db.auth.signOut();

    if (error) {
        authMessage.textContent = "Logout failed: " + error.message;
        return;
    }

    isAdmin = false;
    authMessage.textContent = "Logged out.";
    updateAuthUI();
});

checkAuthSession();

loadFightsFromDatabase();

