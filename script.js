document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('nextCanvas');
    const nextCtx = nextCanvas.getContext('2d');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const linesElement = document.getElementById('lines');

    // 游戏配置
    const BLOCK_SIZE = 20;
    const BOARD_WIDTH = canvas.width / BLOCK_SIZE;
    const BOARD_HEIGHT = canvas.height / BLOCK_SIZE;
    const COLORS = [
        null,
        '#FF0D72', // I
        '#0DC2FF', // J
        '#0DFF72', // L
        '#F538FF', // O
        '#FF8E0D', // S
        '#FFE138', // T
        '#3877FF'  // Z
    ];

    // 方块形状定义
    const PIECES = [
        [[1, 1, 1, 1]], // I
        [[2, 0, 0], [2, 2, 2]], // J
        [[0, 0, 3], [3, 3, 3]], // L
        [[4, 4], [4, 4]], // O
        [[0, 5, 5], [5, 5, 0]], // S
        [[0, 6, 0], [6, 6, 6]], // T
        [[7, 7, 0], [0, 7, 7]]  // Z
    ];

    // 游戏状态
    let board = createMatrix(BOARD_WIDTH, BOARD_HEIGHT);
    let piece = null;
    let nextPiece = null;
    let score = 0;
    let lines = 0;
    let level = 1;
    let dropCounter = 0;
    let dropInterval = 1000;
    let lastTime = 0;
    let gameOver = false;
    let isPaused = false;

    // 创建矩阵
    function createMatrix(w, h) {
        const matrix = [];
        while (h--) {
            matrix.push(new Array(w).fill(0));
        }
        return matrix;
    }

    // 创建方块
    function createPiece(type) {
        return {
            pos: {x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0},
            matrix: PIECES[type],
            type: type
        };
    }

    // 碰撞检测
    function collide(board, piece) {
        const matrix = piece.matrix;
        const pos = piece.pos;
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x] !== 0 &&
                    (board[y + pos.y] &&
                    board[y + pos.y][x + pos.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    // 合并方块到游戏板
    function merge(board, piece) {
        piece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + piece.pos.y][x + piece.pos.x] = value;
                }
            });
        });
    }

    // 旋转方块
    function rotate(matrix) {
        const N = matrix.length;
        const result = matrix.map((row, i) =>
            row.map((val, j) => matrix[N - 1 - j][i])
        );
        return result;
    }

    // 清除完整的行
    function clearLines() {
        let linesCleared = 0;
        outer: for (let y = board.length - 1; y >= 0; y--) {
            for (let x = 0; x < board[y].length; x++) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            linesCleared++;
            y++;
        }
        if (linesCleared > 0) {
            lines += linesCleared;
            score += linesCleared * 100 * level;
            level = Math.floor(lines / 10) + 1;
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
            scoreElement.textContent = score;
            levelElement.textContent = level;
            linesElement.textContent = lines;
        }
    }

    // 绘制游戏画面
    function draw() {
        // 清空画布
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制网格
        ctx.strokeStyle = '#e0e0e0';
        for (let i = 0; i <= BOARD_WIDTH; i++) {
            ctx.beginPath();
            ctx.moveTo(i * BLOCK_SIZE, 0);
            ctx.lineTo(i * BLOCK_SIZE, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i <= BOARD_HEIGHT; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * BLOCK_SIZE);
            ctx.lineTo(canvas.width, i * BLOCK_SIZE);
            ctx.stroke();
        }

        // 绘制已固定的方块
        drawMatrix(board, {x: 0, y: 0});
        // 绘制当前方块
        if (piece) {
            drawMatrix(piece.matrix, piece.pos);
        }
    }

    // 绘制下一个方块预览
    function drawNext() {
        nextCtx.fillStyle = '#fff';
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
        
        if (nextPiece) {
            const offset = {
                x: (nextCanvas.width - nextPiece.matrix[0].length * BLOCK_SIZE) / 2,
                y: (nextCanvas.height - nextPiece.matrix.length * BLOCK_SIZE) / 2
            };
            drawMatrix(nextPiece.matrix, offset, nextCtx);
        }
    }

    // 绘制矩阵
    function drawMatrix(matrix, offset, context = ctx) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    context.fillStyle = COLORS[value];
                    context.fillRect(
                        (x + offset.x) * BLOCK_SIZE,
                        (y + offset.y) * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            });
        });
    }

    // 移动方块
    function move(dir) {
        piece.pos.x += dir;
        if (collide(board, piece)) {
            piece.pos.x -= dir;
        }
    }

    // 下落方块
    function drop() {
        piece.pos.y++;
        if (collide(board, piece)) {
            piece.pos.y--;
            merge(board, piece);
            resetPiece();
            clearLines();
        }
        dropCounter = 0;
    }

    // 快速下落
    function hardDrop() {
        while (!collide(board, piece)) {
            piece.pos.y++;
        }
        piece.pos.y--;
        merge(board, piece);
        resetPiece();
        clearLines();
        dropCounter = 0;
    }

    // 重置方块
    function resetPiece() {
        piece = nextPiece || createPiece(Math.floor(Math.random() * PIECES.length));
        nextPiece = createPiece(Math.floor(Math.random() * PIECES.length));
        drawNext();
        
        if (collide(board, piece)) {
            gameOver = true;
            alert('游戏结束！得分：' + score);
            reset();
        }
    }

    // 重置游戏
    function reset() {
        board = createMatrix(BOARD_WIDTH, BOARD_HEIGHT);
        score = 0;
        lines = 0;
        level = 1;
        scoreElement.textContent = score;
        levelElement.textContent = level;
        linesElement.textContent = lines;
        gameOver = false;
        dropInterval = 1000;
        resetPiece();
    }

    // 游戏循环
    function update(time = 0) {
        if (!gameOver && !isPaused) {
            const deltaTime = time - lastTime;
            lastTime = time;
            dropCounter += deltaTime;
            if (dropCounter > dropInterval) {
                drop();
            }
            draw();
        }
        requestAnimationFrame(update);
    }

    // 键盘控制
    document.addEventListener('keydown', event => {
        if (gameOver || isPaused) return;

        switch (event.key) {
            case 'ArrowLeft':
                move(-1);
                break;
            case 'ArrowRight':
                move(1);
                break;
            case 'ArrowDown':
                drop();
                break;
            case 'ArrowUp':
                const rotated = rotate(piece.matrix);
                piece.matrix = rotated;
                if (collide(board, piece)) {
                    piece.matrix = rotate(rotate(rotate(rotated)));
                }
                break;
            case ' ':
                hardDrop();
                break;
        }
    });

    // 移动端控制
    document.getElementById('leftBtn').addEventListener('click', () => move(-1));
    document.getElementById('rightBtn').addEventListener('click', () => move(1));
    document.getElementById('downBtn').addEventListener('click', () => drop());
    document.getElementById('rotateBtn').addEventListener('click', () => {
        const rotated = rotate(piece.matrix);
        piece.matrix = rotated;
        if (collide(board, piece)) {
            piece.matrix = rotate(rotate(rotate(rotated)));
        }
    });
    document.getElementById('dropBtn').addEventListener('click', () => hardDrop());

    // 开始按钮
    startBtn.addEventListener('click', () => {
        if (gameOver) {
            reset();
        }
        isPaused = false;
        startBtn.textContent = '重新开始';
        update();
    });

    // 暂停按钮
    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? '继续' : '暂停';
    });

    // 初始化游戏
    reset();
    draw();
    drawNext();
}); 