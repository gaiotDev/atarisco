const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const messageContainer = document.getElementById('message-container');

// Configurações do Jogo
canvas.width = 800;
canvas.height = 600;

let score = 0;
let gameOver = false;
let animationId;

// Estado das Teclas
const keys = {
    a: false,
    d: false,
    ArrowLeft: false,
    ArrowRight: false,
    ' ': false
};

// Player (Nave)
const player = {
    width: 50,
    height: 30,
    x: canvas.width / 2 - 25,
    y: canvas.height - 50,
    speed: 7,
    color: '#00ff00'
};

// Tiros
let projectiles = [];
const projectileSpeed = 8;

// Inimigos (Aliens)
let enemies = [];
const enemyRows = 5;
const enemyCols = 10;
const enemyWidth = 40;
const enemyHeight = 30;
const enemyPadding = 15;
const enemyOffsetTop = 50;
const enemyOffsetLeft = 30;
let enemyDirection = 1; // 1 para direita, -1 para esquerda
let enemyMoveDown = false;
let enemySpeed = 1;

// Inicializar Inimigos
function initEnemies() {
    enemies = [];
    for (let r = 0; r < enemyRows; r++) {
        for (let c = 0; c < enemyCols; c++) {
            enemies.push({
                x: c * (enemyWidth + enemyPadding) + enemyOffsetLeft,
                y: r * (enemyHeight + enemyPadding) + enemyOffsetTop,
                width: enemyWidth,
                height: enemyHeight,
                alive: true
            });
        }
    }
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    if (e.key.toLowerCase() === 'a') keys['a'] = true;
    if (e.key.toLowerCase() === 'd') keys['d'] = true;
    
    if (gameOver && (e.key === 'r' || e.key === 'R')) {
        restartGame();
    }
    
    if (e.key === ' ' && !gameOver) {
        shoot();
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (e.key.toLowerCase() === 'a') keys['a'] = false;
    if (e.key.toLowerCase() === 'd') keys['d'] = false;
});

function shoot() {
    projectiles.push({
        x: player.x + player.width / 2 - 2.5,
        y: player.y,
        width: 5,
        height: 15,
        color: '#ff0'
    });
}

function update() {
    if (gameOver) return;

    // Mover Jogador
    if ((keys.a || keys.ArrowLeft) && player.x > 0) {
        player.x -= player.speed;
    }
    if ((keys.d || keys.ArrowRight) && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }

    // Mover Tiros
    projectiles.forEach((p, index) => {
        p.y -= projectileSpeed;
        if (p.y + p.height < 0) {
            projectiles.splice(index, 1);
        }
    });

    // Mover Inimigos
    let hitWall = false;
    enemies.forEach(enemy => {
        if (!enemy.alive) return;
        enemy.x += enemySpeed * enemyDirection;
        
        if (enemy.x + enemy.width >= canvas.width || enemy.x <= 0) {
            hitWall = true;
        }

        // Checar Game Over (encostou no jogador ou passou do limite inferior)
        if (enemy.y + enemy.height >= player.y) {
            endGame();
        }
    });

    if (hitWall) {
        enemyDirection *= -1;
        enemies.forEach(enemy => {
            enemy.y += 20;
        });
        // Aumentar velocidade levemente a cada descida
        enemySpeed += 0.1;
    }

    // Detecção de Colisão: Tiro vs Inimigo
    projectiles.forEach((p, pIndex) => {
        enemies.forEach((enemy) => {
            if (enemy.alive && 
                p.x < enemy.x + enemy.width &&
                p.x + p.width > enemy.x &&
                p.y < enemy.y + enemy.height &&
                p.y + p.height > enemy.y) {
                
                enemy.alive = false;
                projectiles.splice(pIndex, 1);
                score += 10;
                scoreElement.textContent = score;

                // Checar se todos foram destruídos
                if (enemies.every(e => !e.alive)) {
                    // Resetar horda com mais velocidade
                    initEnemies();
                    enemySpeed += 0.5;
                }
            }
        });
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar Jogador (Forma de nave Atari)
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y + 10, player.width, player.height - 10);
    ctx.fillRect(player.x + 20, player.y, 10, 10);

    // Desenhar Tiros
    projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    // Desenhar Inimigos
    enemies.forEach(enemy => {
        if (enemy.alive) {
            ctx.fillStyle = '#ff00ff';
            // Desenho simples de alien
            ctx.fillRect(enemy.x + 5, enemy.y, enemy.width - 10, enemy.height - 10);
            ctx.fillRect(enemy.x, enemy.y + 10, 5, 10);
            ctx.fillRect(enemy.x + enemy.width - 5, enemy.y + 10, 5, 10);
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(enemy.x + 10, enemy.y + 5, 5, 5);
            ctx.fillRect(enemy.x + enemy.width - 15, enemy.y + 5, 5, 5);
        }
    });
}

function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

function endGame() {
    gameOver = true;
    messageContainer.classList.remove('hidden');
}

function restartGame() {
    score = 0;
    scoreElement.textContent = score;
    gameOver = false;
    enemySpeed = 1;
    enemyDirection = 1;
    projectiles = [];
    messageContainer.classList.add('hidden');
    player.x = canvas.width / 2 - 25;
    initEnemies();
}

// Iniciar
initEnemies();
gameLoop();
