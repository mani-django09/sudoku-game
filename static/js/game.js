class SudokuGame {
    constructor() {
        console.log('Initializing SudokuGame...');
        
        // Initialize game state
        this.selectedCell = null;
        this.puzzle = null;
        this.solution = null;
        this.currentNumbers = new Array(81).fill(0);
        this.pencilMode = false;
        this.pencilMarks = Array(81).fill().map(() => new Set());
        this.gameState = {
            moves: [],
            currentMove: -1
        };
        
        // Initialize timer with error handling
        try {
            const timerElement = document.getElementById('timer');
            if (!timerElement) {
                throw new Error('Timer element not found');
            }
            this.timer = new Timer();
            console.log('Timer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize timer:', error);
            throw new Error('Timer initialization failed');
        }
        
        // Initialize game components
        try {
            this.initializeGame();
            console.log('Game initialization completed');
        } catch (error) {
            console.error('Game initialization failed:', error);
            throw error;
        }
    }

    initializeGame() {
        this.setupBoard();
        this.setupControls();
        this.setupKeyboardInput();
        this.newGame('easy');
    }

    setupBoard() {
        console.log('Setting up game board...');
        
        // Get board element with error handling
        const board = document.getElementById('sudoku-board');
        if (!board) {
            throw new Error('Sudoku board element not found');
        }
        
        // Clear existing content
        board.innerHTML = '';
        console.log('Board cleared, creating cells...');

        try {
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.dataset.row = i;
                    cell.dataset.col = j;
                    cell.dataset.index = i * 9 + j;
                    
                    // Add pencil marks container
                    const pencilMarks = document.createElement('div');
                    pencilMarks.className = 'pencil-marks';
                    cell.appendChild(pencilMarks);
                    
                    // Add click event with error handling
                    cell.addEventListener('click', (e) => {
                        try {
                            e.preventDefault();
                            this.selectCell(cell);
                        } catch (error) {
                            console.error('Error handling cell click:', error);
                        }
                    });
                    
                    board.appendChild(cell);
                }
            }
            console.log('Board setup completed successfully');
        } catch (error) {
            console.error('Error setting up board:', error);
            throw new Error('Failed to setup game board');
        }
    }

    setupControls() {
        // Setup numpad
        const numpad = document.getElementById('numpad');
        if (!numpad) {
            throw new Error('Numpad element not found');
        }
        
        for (let i = 1; i <= 9; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.addEventListener('click', () => this.enterNumber(i));
            numpad.appendChild(button);
        }

        // Setup difficulty buttons
        const difficultyButtons = document.querySelectorAll('.mode-btn');
        difficultyButtons.forEach(button => {
            button.addEventListener('click', () => {
                difficultyButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.newGame(button.dataset.difficulty);
            });
        });

        // Setup pause button
        const pauseButton = document.getElementById('pause');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => this.togglePause());
        }

        // Setup pencil mode button
        const pencilButton = document.getElementById('pencil');
        if (pencilButton) {
            pencilButton.addEventListener('click', () => {
                console.log('Toggling pencil mode');
                this.pencilMode = !this.pencilMode;
                pencilButton.classList.toggle('active');
                console.log('Pencil mode:', this.pencilMode ? 'active' : 'inactive');
            });
        } else {
            console.error('Pencil button not found');
        }
    }

    setupKeyboardInput() {
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '9') {
                this.enterNumber(parseInt(e.key));
            }
        });
    }

    async newGame(difficulty) {
        const response = await fetch(`/new-game/${difficulty}`);
        const data = await response.json();
        this.puzzle = data.puzzle;
        this.solution = data.solution;
        this.currentNumbers = [...this.puzzle];
        this.renderBoard();
        this.timer.reset();
        this.timer.start();
    }

    selectCell(cell) {
        console.log('Selecting cell:', cell.dataset.row, cell.dataset.col);
        
        try {
            // Clear previous selections and highlights
            document.querySelectorAll('.cell').forEach(c => {
                c.classList.remove('selected', 'related');
            });

            // Don't select if game is paused
            if (this.isPaused) {
                console.log('Game is paused, cell selection blocked');
                return;
            }

            // Set new selected cell
            cell.classList.add('selected');
            this.selectedCell = cell;

            // Highlight related cells
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

            document.querySelectorAll('.cell').forEach(c => {
                const cRow = parseInt(c.dataset.row);
                const cCol = parseInt(c.dataset.col);
                const cBox = Math.floor(cRow / 3) * 3 + Math.floor(cCol / 3);

                if ((cRow === row || cCol === col || cBox === box) && c !== cell) {
                    c.classList.add('related');
                }
            });

            console.log('Cell selected and related cells highlighted');
        } catch (error) {
            console.error('Error in selectCell:', error);
        }
    }

    enterNumber(num) {
        console.log('Attempting to enter number:', num);
        
        try {
            if (!this.selectedCell) {
                console.log('No cell selected');
                return;
            }

            if (this.isPaused) {
                console.log('Game is paused');
                return;
            }

            const row = parseInt(this.selectedCell.dataset.row);
            const col = parseInt(this.selectedCell.dataset.col);
            const index = row * 9 + col;

            // Check if cell is part of initial puzzle
            if (this.puzzle[index] !== '0') {
                console.log('Cannot modify initial puzzle cell');
                return;
            }

            // Handle pencil mode
            if (this.pencilMode) {
                this.togglePencilMark(index, num);
                return;
            }

            // Update current numbers array and display
            this.currentNumbers[index] = num.toString();
            this.selectedCell.textContent = num;

            // Clear pencil marks when entering a number
            this.pencilMarks[index].clear();
            this.selectedCell.querySelector('.pencil-marks').innerHTML = '';

            // Validate move and check win condition
            this.validateMove(row, col, num);
            this.checkWin();

            console.log('Number entered successfully');
        } catch (error) {
            console.error('Error in enterNumber:', error);
        }
    }

    togglePencilMark(index, num) {
        console.log('Toggling pencil mark:', num, 'at index:', index);
        
        try {
            // Validate inputs
            if (index < 0 || index >= 81 || num < 1 || num > 9) {
                throw new Error('Invalid index or number for pencil mark');
            }

            const pencilMarksContainer = this.selectedCell.querySelector('.pencil-marks');
            if (!pencilMarksContainer) {
                throw new Error('Pencil marks container not found');
            }

            // Create Set if it doesn't exist
            if (!this.pencilMarks[index]) {
                this.pencilMarks[index] = new Set();
            }

            // Toggle the number
            const hasNumber = this.pencilMarks[index].has(num);
            console.log('Current pencil marks:', Array.from(this.pencilMarks[index]));
            
            if (hasNumber) {
                this.pencilMarks[index].delete(num);
                console.log('Removed pencil mark:', num);
            } else {
                this.pencilMarks[index].add(num);
                console.log('Added pencil mark:', num);
            }

            // Clear and update display
            pencilMarksContainer.innerHTML = '';
            const grid = document.createElement('div');
            grid.className = 'pencil-marks-grid';

            // Create all 9 positions
            for (let i = 1; i <= 9; i++) {
                const mark = document.createElement('div');
                mark.className = 'pencil-mark';
                if (this.pencilMarks[index].has(i)) {
                    mark.textContent = i;
                }
                pencilMarksContainer.appendChild(mark);
            }

            console.log('Pencil marks updated:', Array.from(this.pencilMarks[index]));
        } catch (error) {
            console.error('Error in togglePencilMark:', error);
            // Show user feedback if needed
            this.selectedCell.classList.add('error');
            setTimeout(() => this.selectedCell.classList.remove('error'), 1000);
        }
    }

    validateMove(row, col, num) {
        const index = row * 9 + col;
        if (this.solution[index] === num.toString()) {
            this.selectedCell.classList.remove('invalid');
            this.selectedCell.classList.add('valid');
        } else {
            this.selectedCell.classList.remove('valid');
            this.selectedCell.classList.add('invalid');
        }
    }

    checkWin() {
        if (this.currentNumbers.join('') === this.solution) {
            this.timer.stop();
            alert('Congratulations! You solved the puzzle!');
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const board = document.getElementById('sudoku-board');
        if (this.isPaused) {
            board.classList.add('paused');
            this.timer.pause();
        } else {
            board.classList.remove('paused');
            this.timer.resume();
        }
    }

    renderBoard() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            const value = this.puzzle[index];
            if (value !== '0') {
                cell.textContent = value;
                cell.classList.add('initial');
            } else {
                cell.textContent = '';
                cell.classList.remove('initial');
            }
        });
    }
}

// Game initialization moved to index.html
