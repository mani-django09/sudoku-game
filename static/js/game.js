class SudokuGame {
    constructor() {
        // Initialize basic state
        this.initialized = false;
        this.selectedCell = null;
        this.puzzle = null;
        this.solution = null;
        this.currentNumbers = null;
        this.pencilMode = false;
        this.pencilMarks = null;
        this.gameState = null;
        this.timer = null;
        this.isPaused = false;

        // Ensure initialization happens after DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    async initialize() {
        console.log('Initializing SudokuGame...');
        
        try {
            // Initialize game state
            this.validateAndInitializeState();
            
            // Initialize timer
            await this.initializeTimer();
            
            // Initialize game components
            await this.initializeComponents();
            
            this.initialized = true;
            console.log('Game initialization completed successfully');
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.showError('Failed to initialize game: ' + error.message);
        }
    }

    validateAndInitializeState() {
        this.currentNumbers = new Array(81).fill('0');
        this.pencilMarks = Array(81).fill().map(() => new Set());
        this.gameState = {
            moves: [],
            currentMove: -1,
            remainingHints: 3,
            mistakes: 0
        };
    }

    async initializeTimer() {
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
    }

    async initializeComponents() {
        try {
            await this.setupBoard();
            this.setupControls();
            this.setupKeyboardInput();
            await this.newGame('easy');
        } catch (error) {
            console.error('Failed to initialize components:', error);
            throw error;
        }
    }

    async setupBoard() {
        console.log('Setting up game board...');
        
        const board = document.getElementById('sudoku-board');
        if (!board) {
            throw new Error('Sudoku board element not found');
        }
        
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
                    
                    const pencilMarksDiv = document.createElement('div');
                    pencilMarksDiv.className = 'pencil-marks';
                    cell.appendChild(pencilMarksDiv);
                    
                    cell.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (!this.initialized || this.isPaused) return;
                        this.selectCell(cell);
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

    async newGame(difficulty) {
        try {
            const response = await fetch(`/new-game/${difficulty}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch new game: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.puzzle || !data.solution || 
                data.puzzle.length !== 81 || data.solution.length !== 81) {
                throw new Error('Invalid puzzle or solution data');
            }
            
            this.puzzle = data.puzzle;
            this.solution = data.solution;
            this.currentNumbers = [...this.puzzle];
            
            // Reset game state
            this.gameState = {
                moves: [],
                currentMove: -1,
                remainingHints: 3,
                mistakes: 0
            };
            
            this.pencilMarks = Array(81).fill().map(() => new Set());
            this.pencilMode = false;
            
            // Update UI
            this.updatePencilModeIndicator();
            this.updateHintCount();
            this.updateMistakesDisplay();
            await this.renderBoard();
            
            // Reset and start timer
            if (this.timer) {
                this.timer.reset();
                this.timer.start();
            }
        } catch (error) {
            console.error('Error starting new game:', error);
            this.showError('Failed to start new game: ' + error.message);
        }
    }

    async renderBoard() {
        try {
            const cells = document.querySelectorAll('.cell');
            
            if (!this.puzzle || !this.currentNumbers) {
                throw new Error('Game data not initialized');
            }

            cells.forEach((cell, index) => {
                // Clear existing content
                const value = this.currentNumbers[index];
                cell.textContent = value === '0' ? '' : value;
                
                // Set classes
                cell.classList.remove('initial', 'valid', 'invalid', 'selected', 'related', 'hint');
                if (this.puzzle[index] !== '0') {
                    cell.classList.add('initial');
                }
                
                // Create new pencil marks container
                const oldPencilMarks = cell.querySelector('.pencil-marks');
                if (oldPencilMarks) {
                    oldPencilMarks.remove();
                }
                
                const pencilMarksDiv = document.createElement('div');
                pencilMarksDiv.className = 'pencil-marks';
                cell.appendChild(pencilMarksDiv);
                
                // Render pencil marks
                if (this.pencilMarks[index].size > 0) {
                    this.renderPencilMarks(index);
                }
            });
        } catch (error) {
            console.error('Error rendering board:', error);
            throw new Error('Failed to render game board: ' + error.message);
        }
    }

    renderPencilMarks(index) {
        const cell = document.querySelector(`.cell[data-index="${index}"]`);
        if (!cell) return;
        
        const pencilMarksDiv = cell.querySelector('.pencil-marks');
        if (!pencilMarksDiv) return;
        
        pencilMarksDiv.innerHTML = '';
        
        const grid = document.createElement('div');
        grid.className = 'pencil-marks-grid';
        
        for (let i = 1; i <= 9; i++) {
            const mark = document.createElement('div');
            mark.className = 'pencil-mark';
            if (this.pencilMarks[index].has(i)) {
                mark.textContent = i;
            }
            grid.appendChild(mark);
        }
        
        pencilMarksDiv.appendChild(grid);
    }

    async getHint() {
        try {
            if (this.gameState.remainingHints <= 0) {
                this.showError('No hints remaining');
                return;
            }

            if (this.isPaused) {
                this.showError('Cannot get hint while game is paused');
                return;
            }

            const response = await fetch('/hint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    current_state: this.currentNumbers.join(''),
                    solution: this.solution
                })
            });

            if (!response.ok) {
                if (response.status === 404) {
                    this.showError('No hints available');
                    return;
                }
                throw new Error('Failed to get hint');
            }

            const hint = await response.json();
            const index = hint.row * 9 + hint.col;
            const cell = document.querySelector(
                `.cell[data-row="${hint.row}"][data-col="${hint.col}"]`
            );

            if (!cell) {
                throw new Error('Cell not found');
            }

            // Save current state for undo
            const oldState = {
                index: index,
                value: this.currentNumbers[index],
                pencilMarks: new Set(this.pencilMarks[index])
            };

            // Clear pencil marks
            this.pencilMarks[index].clear();
            this.renderPencilMarks(index);

            // Update number and UI
            this.currentNumbers[index] = hint.value;
            cell.textContent = hint.value;
            cell.classList.add('hint', 'hint-active');
            cell.classList.add('hint-reveal');
            
            // Record move
            this.gameState.moves.splice(this.gameState.currentMove + 1);
            this.gameState.moves.push({
                type: 'hint',
                oldState: oldState,
                newState: {
                    index: index,
                    value: hint.value,
                    pencilMarks: new Set()
                }
            });
            this.gameState.currentMove++;

            // Remove hint highlight after animation
            setTimeout(() => {
                cell.classList.remove('hint-reveal', 'hint-active');
            }, 1500);

            // Decrement hint count
            this.gameState.remainingHints--;
            this.updateHintCount();

            // Check if puzzle is complete
            this.checkWin();

        } catch (error) {
            console.error('Error getting hint:', error);
            this.showError('Failed to get hint: ' + error.message);
        }
    }

    updateHintCount() {
        const hintButton = document.getElementById('hint');
        const hintCount = hintButton.querySelector('.hint-count');
        if (hintCount) {
            hintCount.textContent = this.gameState.remainingHints;
        }
        hintButton.disabled = this.gameState.remainingHints <= 0;
    }

    updateMistakesDisplay() {
        const mistakesElement = document.getElementById('mistakes');
        if (mistakesElement) {
            mistakesElement.textContent = `${this.gameState.mistakes}/3`;
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


    selectCell(cell) {
        console.log('Selecting cell:', cell.dataset.row, cell.dataset.col);
        
        try {
            // Clear previous selections and highlights
            document.querySelectorAll('.cell').forEach(c => {
                c.classList.remove('selected', 'related', 'hint');
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

    setupControls() {
        // Setup numpad
        const numpad = document.getElementById('numpad');
        if (!numpad) {
            throw new Error('Numpad element not found');
        }
        
        numpad.innerHTML = '';
        for (let i = 1; i <= 9; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.addEventListener('click', () => this.enterNumber(i));
            numpad.appendChild(button);
        }

        // Setup control buttons
        const undoButton = document.getElementById('undo');
        if (undoButton) {
            undoButton.addEventListener('click', () => this.undoMove());
        }

        const eraseButton = document.getElementById('erase');
        if (eraseButton) {
            eraseButton.addEventListener('click', () => this.eraseNumber());
        }

        const pencilButton = document.getElementById('pencil');
        if (pencilButton) {
            pencilButton.addEventListener('click', () => this.togglePencilMode());
        }

        const hintButton = document.getElementById('hint');
        if (hintButton) {
            hintButton.addEventListener('click', () => this.getHint());
        }

        // Setup New Game button
        const newGameButton = document.querySelector('.new-game-btn');
        if (newGameButton) {
            newGameButton.addEventListener('click', () => this.newGame('easy'));
        }

        // Update hint count display
        this.updateHintCount();
    }

    setupKeyboardInput() {
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '9') {
                this.enterNumber(parseInt(e.key));
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                this.eraseNumber();
            }
        });
    }

    showError(message) {
        console.error('Game error:', message);
        
        const existingError = document.querySelector('.game-error');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'game-error';
        errorDiv.textContent = message;
        document.querySelector('.game-container').appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }

    isValidHint(row, col, value) {
        if (row < 0 || row >= 9 || col < 0 || col >= 9) {
            return false;
        }

        const index = row * 9 + col;
        
        if (this.currentNumbers[index] !== '0' && 
            this.currentNumbers[index] !== this.solution[index]) {
            return false;
        }

        return this.solution[index] === value;
    }

    enterNumber(num) {
        try {
            console.log('Attempting to enter number:', num);
            
            if (!this.initialized) {
                throw new Error('Game not fully initialized');
            }
            
            if (!this.selectedCell) {
                throw new Error('No cell selected');
            }
            
            if (this.isPaused) {
                throw new Error('Game is paused');
            }
            
            const index = parseInt(this.selectedCell.dataset.index);
            
            if (this.puzzle[index] !== '0') {
                throw new Error('Cannot modify initial numbers');
            }
            
            const gameState = {
                row: Math.floor(index / 9),
                col: index % 9,
                index: index,
                isPencilMode: this.pencilMode,
                currentValue: this.currentNumbers[index],
                isInitialCell: this.puzzle[index] !== '0'
            };
            
            console.log('Current game state:', gameState);
            
            if (this.pencilMode) {
                this.togglePencilMark(index, num);
            } else {
                // Save move for undo
                const oldState = {
                    index: index,
                    value: this.currentNumbers[index],
                    pencilMarks: new Set(this.pencilMarks[index])
                };
                
                // Clear pencil marks
                this.pencilMarks[index].clear();
                this.renderPencilMarks(index);
                
                // Update number
                this.currentNumbers[index] = num.toString();
                this.selectedCell.textContent = num;
                
                // Check against solution
                if (this.solution[index] !== num.toString()) {
                    this.gameState.mistakes++;
                    this.updateMistakesDisplay();
                    this.selectedCell.classList.add('invalid');
                    
                    if (this.gameState.mistakes >= 3) {
                        this.showError('Game Over: Too many mistakes');
                        this.timer.stop();
                        return;
                    }
                } else {
                    this.selectedCell.classList.add('valid');
                }
                
                // Record move
                this.gameState.moves.splice(this.gameState.currentMove + 1);
                this.gameState.moves.push({
                    type: 'number',
                    oldState: oldState,
                    newState: {
                        index: index,
                        value: num.toString(),
                        pencilMarks: new Set()
                    }
                });
                this.gameState.currentMove++;
            }
            
            console.log('Number entered successfully');
            this.checkWin();
        } catch (error) {
            console.error('Error entering number:', error);
            this.showError(error.message);
        }
    }

    togglePencilMark(index, num) {
        console.log('Toggling pencil mark:', num, 'at index:', index);
        
        try {
            if (index < 0 || index >= 81 || num < 1 || num > 9) {
                throw new Error('Invalid index or number for pencil mark');
            }

            const pencilMarksContainer = this.selectedCell.querySelector('.pencil-marks');
            if (!pencilMarksContainer) {
                throw new Error('Pencil marks container not found');
            }

            if (!this.pencilMarks[index]) {
                this.pencilMarks[index] = new Set();
            }

            const hasNumber = this.pencilMarks[index].has(num);
            
            if (hasNumber) {
                this.pencilMarks[index].delete(num);
            } else {
                this.pencilMarks[index].add(num);
            }

            this.renderPencilMarks(index);
        } catch (error) {
            console.error('Error in togglePencilMark:', error);
            this.selectedCell.classList.add('error');
            setTimeout(() => this.selectedCell.classList.remove('error'), 1000);
        }
    }


    undoMove() {
        if (this.gameState.currentMove < 0) {
            console.log('No moves to undo');
            return;
        }

        const move = this.gameState.moves[this.gameState.currentMove];
        const cell = document.querySelector(`.cell[data-index="${move.oldState.index}"]`);

        // Restore previous state
        this.currentNumbers[move.oldState.index] = move.oldState.value;
        this.pencilMarks[move.oldState.index] = new Set(move.oldState.pencilMarks);

        // Update UI
        if (move.type === 'pencil') {
            this.renderPencilMarks(move.oldState.index);
        } else {
            cell.textContent = move.oldState.value || '';
            cell.classList.remove('valid', 'invalid');
        }

        this.gameState.currentMove--;
    }

    eraseNumber() {
        if (!this.selectedCell) {
            return;
        }

        const index = parseInt(this.selectedCell.dataset.index);
        if (this.puzzle[index] !== '0') {
            this.showError('Cannot erase initial numbers');
            return;
        }

        // Save current state for undo
        const oldState = {
            index: index,
            value: this.currentNumbers[index],
            pencilMarks: new Set(this.pencilMarks[index])
        };

        // Clear number and pencil marks
        this.currentNumbers[index] = '0';
        this.pencilMarks[index].clear();
        this.selectedCell.textContent = '';
        this.selectedCell.classList.remove('valid', 'invalid');
        this.renderPencilMarks(index);

        // Record move
        this.gameState.moves.splice(this.gameState.currentMove + 1);
        this.gameState.moves.push({
            type: 'erase',
            oldState: oldState,
            newState: {
                index: index,
                value: '0',
                pencilMarks: new Set()
            }
        });
        this.gameState.currentMove++;
    }

    togglePencilMode() {
        this.pencilMode = !this.pencilMode;
        this.updatePencilModeIndicator();
    }

    updatePencilModeIndicator() {
        const pencilButton = document.getElementById('pencil');
        const stateIndicator = pencilButton.querySelector('.state-indicator');
        if (stateIndicator) {
            stateIndicator.textContent = this.pencilMode ? 'ON' : 'OFF';
        }
        pencilButton.classList.toggle('active', this.pencilMode);
    }

}