let score = 0;

export function increaseScore(points = 100) {
  score += points;
  updateScoreDisplay();
}

export function resetScore() {
  score = 0;
  updateScoreDisplay();
}

function updateScoreDisplay() {
  let hud = document.getElementById('score');
  if (!hud) {
    console.warn('[Score] #score element not found in DOM! Creating one.');
    hud = document.createElement('div');
    hud.id = 'score';
    document.body.appendChild(hud);
  }
  hud.textContent = `SCORE: ${score}`;
}