const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const waveElement = document.getElementById('wave');
const energyBar = document.getElementById('energy-bar');
const chargeBarContainer = document.getElementById('charge-bar-container');
const chargeBar = document.getElementById('charge-bar');
const messageContainer = document.getElementById('message-container');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const healthBar = document.getElementById('health-bar');
const healthText = document.getElementById('health-text');
const gameResultText = document.getElementById('game-result');
const antigravityIndicator = document.getElementById('antigravity-indicator');

// Configurações do Jogo
canvas.width = 800;
canvas.height = 600;

let score = 0;
let wave = 1;
let gameOver = false;
let gameStarted = false;
let animationId;
let frames = 0;

// Modo Antigravity
let isAntigravity = false;
let antigravityTimer = 0;

// Estado das Teclas
const keys = {
    a: false, d: false, ArrowLeft: false, ArrowRight: false, ' ': false
};

// Player (Nave) - MOCIFICADO: ENERGIA REGENERA 3X MAIS RÁPIDO E VELOCIDADE MAIOR
const player = {
    width: 50,
    height: 30,
    x: canvas.width / 2 - 25,
    y: canvas.height - 50,
    speed: 9, // Mais rápido
    color: '#00ff00',
    energy: 100,
    maxEnergy: 100,
    hp: 10,
    maxHp: 10,
    energyRecover: 0.6, // 3x mais rápido
    shootCost: 10, // Custo reduzido
    isOverheating: false,
    chargeLevel: 0,
    isCharging: false,
    multiShot: false,
    autoFire: false,
    tempShield: 0,
    speedBoost: 0
};

// Tiros
let projectiles = [];
const projectileSpeed = 10; // Tiros mais rápidos

// Escudos (Barreiras) - MODIFICADO: MAIS HP
let shields = [];
const shieldRows = 3;
const shieldCols = 4;
const totalShields = 4;

function initShields() {
    shields = [];
}

// Inimigos - MODIFICADO: VELOCIDADE INICIAL REDUZIDA
let enemies = [];
const enemyRows = 4; // Reduzido de 5 para 4 linhas para facilitar
const enemyCols = 10;
const enemyWidth = 40;
const enemyHeight = 30;
const enemyPadding = 15;
let enemyDirection = 1;
let enemySpeed = 0.6; // Reduzido de 1 para 0.6

// Power-ups - MODIFICADO: CHANCE DE DROP DOBROU
let powerups = [];
const powerupTypes = ['multiShot', 'speedBoost', 'shield', 'autoFire'];

// Boss
let boss = null;

function initEnemies() {
    enemies = [];
    if (wave % 3 === 0) {
        spawnBoss();
        return;
    }
    for (let r = 0; r < enemyRows; r++) {
        for (let c = 0; c < enemyCols; c++) {
            enemies.push({
                x: c * (enemyWidth + enemyPadding) + 30,
                y: r * (enemyHeight + enemyPadding) + 50,
                width: enemyWidth,
                height: enemyHeight,
                alive: true,
                hp: 1,
                isMutant: false,
                mutationTimer: Math.random() * 1000 + 1000, // Demora mais para mutar
                type: 'normal'
            });
        }
    }
}

function spawnBoss() {
    boss = {
        x: canvas.width / 2 - 100,
        y: -100,
        targetY: 80,
        width: 200,
        height: 100,
        hp: 30 + (wave * 10), // Boss mais fraco
        maxHp: 30 + (wave * 10),
        speed: 1.5,
        direction: 1,
        shootTimer: 0
    };
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    if (e.key.toLowerCase() === 'a') keys['a'] = true;
    if (e.key.toLowerCase() === 'd') keys['d'] = true;
    
    if (gameOver && (e.key === 'r' || e.key === 'R')) restartGame();
    
    if (e.key === ' ' && gameStarted && !gameOver && !player.isOverheating) {
        player.isCharging = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (e.key.toLowerCase() === 'a') keys['a'] = false;
    if (e.key.toLowerCase() === 'd') keys['d'] = false;
    
    if (e.key === ' ' && gameStarted && player.isCharging) {
        if (player.chargeLevel >= 50) {
            shootCharged();
        } else {
            shootNormal();
        }
        player.isCharging = false;
        player.chargeLevel = 0;
    }
});

startButton.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    gameStarted = true;
    initEnemies();
    initShields();
    gameLoop();
});

function shootNormal() {
    if (player.energy < player.shootCost) return;
    
    player.energy -= player.shootCost;
    const pX = player.x + player.width / 2 - 2.5;
    
    if (player.multiShot) {
        addProjectile(pX - 15, player.y, 5, 15, '#ff0');
        addProjectile(pX + 15, player.y, 5, 15, '#ff0');
    } else {
        addProjectile(pX, player.y, 5, 15, '#ff0');
    }
}

function shootCharged() {
    const cost = 25; // Custo reduzido
    if (player.energy < cost) return;
    player.energy -= cost;
    
    addProjectile(player.x + player.width / 2 - 12, player.y - 20, 24, 48, '#f0f', true);
}

function addProjectile(x, y, w, h, color, isCharged = false, velocityY = -projectileSpeed, owner = 'player') {
    projectiles.push({ x, y, width: w, height: h, color, isCharged, vy: velocityY, owner });
}

function update() {
    if (!gameStarted || gameOver) return;
    frames++;

    // Recover Energy - MUITO MAIS RÁPIDO
    player.energy = Math.min(player.maxEnergy, player.energy + player.energyRecover);
    if (player.isOverheating && player.energy >= player.maxEnergy) {
        player.isOverheating = false;
    }

    if (player.energy <= 0) {
        player.energy = 0;
        player.isOverheating = true;
        player.isCharging = false;
        player.chargeLevel = 0;
    }

    // Charging logic - MAIS RÁPIDO
    if (player.isCharging && !player.isOverheating) {
        player.chargeLevel = Math.min(100, player.chargeLevel + 2); 
    }

    // Antigravity logic
    if (isAntigravity) {
        antigravityTimer--;
        if (antigravityTimer <= 0) {
            isAntigravity = false;
            antigravityIndicator.classList.add('hidden');
        }
    } else if (Math.random() < 0.0005) { // Reduzida chance de ativar
        isAntigravity = true;
        antigravityTimer = 600;
        antigravityIndicator.classList.remove('hidden');
    }

    // Timers
    if (player.speedBoost > 0) player.speedBoost--;
    if (player.tempShield > 0) player.tempShield--;

    // Move Player
    const currentSpeed = player.speed + (player.speedBoost > 0 ? 5 : 0);
    if ((keys.a || keys.ArrowLeft) && player.x > 0) player.x -= currentSpeed;
    if ((keys.d || keys.ArrowRight) && player.x < canvas.width - player.width) player.x += currentSpeed;

    // Automatic Fire Power-up
    if (player.autoFire && frames % 12 === 0 && !player.isOverheating) {
        shootNormal();
    }

    // Projectiles
    projectiles.forEach((p, index) => {
        let actualVy = p.vy;
        if (isAntigravity && p.owner === 'player') {
            p.x += Math.sin(frames * 0.1) * 2.5;
        }
        p.y += actualVy;
        if (p.y < -50 || p.y > canvas.height + 50) projectiles.splice(index, 1);
    });

    if (boss) {
        updateBoss();
    } else {
        updateEnemies();
    }

    // Power-ups Movement
    powerups.forEach((pw, idx) => {
        pw.y += 2;
        if (pw.y > canvas.height) powerups.splice(idx, 1);
        if (checkCollision(pw, player)) {
            applyPowerup(pw.type);
            powerups.splice(idx, 1);
        }
    });

    checkCollisions();
    
    // Update UI
    energyBar.style.width = (player.energy / player.maxEnergy * 100) + '%';
    energyBar.style.background = player.isOverheating ? '#f00' : '#0f0';
    
    // Update Health UI
    healthBar.style.width = (player.hp / player.maxHp * 100) + '%';
    healthText.textContent = `LIFE: ${Math.ceil(player.hp)}/${player.maxHp}`;
    if (player.isCharging) {
        chargeBarContainer.classList.remove('hidden');
        chargeBarContainer.style.left = (player.x) + 'px';
        chargeBarContainer.style.top = (player.y - 15) + 'px';
        chargeBar.style.width = player.chargeLevel + '%';
    } else {
        chargeBarContainer.classList.add('hidden');
    }
}

function updateEnemies() {
    let hitWall = false;
    enemies.forEach(enemy => {
        if (!enemy.alive) return;
        
        // Mutation - MAIS LENTO
        if (!enemy.isMutant) {
            enemy.mutationTimer--;
            if (enemy.mutationTimer <= 0) {
                enemy.isMutant = true;
                enemy.hp = 2; // Mutante mais fraco
                enemy.color = '#f00';
            }
        }

        let speedMult = enemy.isMutant ? 1.3 : 1;
        let moveX = enemySpeed * enemyDirection * speedMult;
        
        if (isAntigravity) {
            enemy.y += Math.sin(frames * 0.05) * 0.8;
        }

        enemy.x += moveX;
        
        if (enemy.x + enemy.width >= canvas.width || enemy.x <= 0) hitWall = true;
        if (enemy.y + enemy.height >= player.y) endGame("INVASÃO!");

        // Mutant disparam menos
        if (enemy.isMutant && frames % 180 === 0 && Math.random() < 0.05) {
            addProjectile(enemy.x + enemy.width / 2, enemy.y + enemy.height, 4, 12, '#f00', false, 4, 'enemy');
        }
    });

    if (hitWall) {
        enemyDirection *= -1;
        enemies.forEach(e => e.y += 15); // Descem menos por vez
        enemySpeed += 0.03; // Aceleração menor
    }
}

function updateBoss() {
    if (boss.y < boss.targetY) {
        boss.y += 1.5;
    } else {
        boss.x += boss.speed * boss.direction;
        if (boss.x <= 0 || boss.x + boss.width >= canvas.width) boss.direction *= -1;
        
        boss.shootTimer++;
        if (boss.shootTimer > 90) { // Demora mais para atirar
            const centerX = boss.x + boss.width / 2;
            for(let i = -1; i <= 1; i++) { // Atira 3 em vez de 5
                addProjectile(centerX + (i * 40), boss.y + boss.height, 8, 20, '#ff00ff', false, 3.5, 'enemy');
            }
            boss.shootTimer = 0;
        }
    }
}

function checkCollisions() {
    projectiles.forEach((p, pIdx) => {
        if (p.owner === 'player') {
            if (boss && checkCollision(p, boss)) {
                boss.hp -= (p.isCharged ? 10 : 1);
                if (!p.isCharged) projectiles.splice(pIdx, 1);
                if (boss.hp <= 0) {
                    score += 2000 * wave; // Mais pontos!
                    boss = null;
                    nextWave();
                }
            }
            enemies.forEach(e => {
                if (e.alive && checkCollision(p, e)) {
                    e.hp -= (p.isCharged ? 5 : 1);
                    if (!p.isCharged) projectiles.splice(pIdx, 1);
                    if (e.hp <= 0) {
                        e.alive = false;
                        score += (e.isMutant ? 100 : 25);
                        scoreElement.textContent = score;
                        if (Math.random() < 0.3) spawnPowerup(e.x, e.y); // Chance de drop aumentada!
                    }
                }
            });
        }
        
        if (p.owner === 'enemy' && checkCollision(p, player)) {
            projectiles.splice(pIdx, 1);
            if (player.tempShield <= 0) {
                player.hp -= 1;
                if (player.hp <= 0) {
                    player.hp = 0;
                    endGame("DESTRUÍDO!");
                }
            }
        }

        shields.forEach((s, sIdx) => {
            if (s.hp > 0 && checkCollision(p, s)) {
                s.hp -= (p.isCharged && p.owner === 'player' ? 0 : 1); // Jogador não destrói o próprio escudo com tiro carregado tão fácil
                projectiles.splice(pIdx, 1);
            }
        });
    });

    if (!boss && enemies.every(e => !e.alive)) nextWave();
}

function checkCollision(r1, r2) {
    return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
}

function spawnPowerup(x, y) {
    const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
    powerups.push({ x, y, width: 20, height: 20, type });
}

function applyPowerup(type) {
    switch(type) {
        case 'multiShot': player.multiShot = true; break;
        case 'speedBoost': player.speedBoost = 800; break;
        case 'shield': player.tempShield = 800; break;
        case 'autoFire': player.autoFire = true; break;
    }
}

function nextWave() {
    wave++;
    waveElement.textContent = wave;
    enemySpeed += 0.1;
    initEnemies();
    initShields();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!gameStarted) return;

    shields.forEach(s => {
        if (s.hp > 0) {
            const alpha = s.hp / s.maxHp;
            ctx.fillStyle = `rgba(100, 100, 255, ${alpha})`;
            ctx.fillRect(s.x, s.y, s.width, s.height);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(s.x, s.y, s.width, s.height);
        }
    });

    ctx.fillStyle = player.tempShield > 0 ? '#0ff' : player.color;
    if (player.isOverheating) ctx.fillStyle = '#555';
    ctx.fillRect(player.x, player.y + 10, player.width, player.height - 10);
    ctx.fillRect(player.x + 20, player.y, 10, 10);
    if (player.tempShield > 0) {
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(player.x - 5, player.y - 5, player.width + 10, player.height + 10);
    }

    if (boss) {
        ctx.fillStyle = '#f0f';
        ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(boss.x, boss.y - 10, boss.width, 5);
        ctx.fillStyle = '#f00';
        ctx.fillRect(boss.x, boss.y - 10, (boss.hp / boss.maxHp) * boss.width, 5);
    }

    projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        if (p.isCharged) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = p.color;
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(p.x, p.y, p.width, p.height);
            ctx.shadowBlur = 0;
        }
    });

    enemies.forEach(e => {
        if (e.alive) {
            ctx.fillStyle = e.isMutant ? '#ff0000' : '#ff00ff';
            ctx.fillRect(e.x + 5, e.y, e.width - 10, e.height - 10);
            if (e.isMutant) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(e.x + 10, e.y + 5, 20, 2);
            }
        }
    });

    powerups.forEach(pw => {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(pw.x + 10, pw.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = "bold 10px Arial";
        ctx.fillText(pw.type[0].toUpperCase(), pw.x + 6, pw.y + 14);
    });
}

function gameLoop() {
    update();
    draw();
    if (!gameOver) animationId = requestAnimationFrame(gameLoop);
}

function endGame(reason) {
    gameOver = true;
    gameResultText.textContent = reason;
    messageContainer.classList.remove('hidden');
    cancelAnimationFrame(animationId);
}

function restartGame() {
    score = 0; wave = 1;
    scoreElement.textContent = "0";
    waveElement.textContent = "1";
    gameOver = false;
    enemies = []; projectiles = []; powerups = []; boss = null;
    player.energy = 100; player.hp = 10; player.isOverheating = false;
    player.multiShot = false; player.autoFire = false; player.speedBoost = 0; player.tempShield = 0;
    messageContainer.classList.add('hidden');
    initEnemies();
    initShields();
    gameLoop();
}
