import random

def generate_puzzle(difficulty):
    """Generate a Sudoku puzzle with its solution"""
    def is_valid(board, row, col, num):
        # Check row
        for x in range(9):
            if board[row][x] == num:
                return False
        
        # Check column
        for x in range(9):
            if board[x][col] == num:
                return False
        
        # Check 3x3 box
        start_row, start_col = 3 * (row // 3), 3 * (col // 3)
        for i in range(3):
            for j in range(3):
                if board[i + start_row][j + start_col] == num:
                    return False
        return True

    def solve(board):
        for i in range(9):
            for j in range(9):
                if board[i][j] == 0:
                    for num in range(1, 10):
                        if is_valid(board, i, j, num):
                            board[i][j] = num
                            if solve(board):
                                return True
                            board[i][j] = 0
                    return False
        return True

    # Initialize empty board
    board = [[0 for _ in range(9)] for _ in range(9)]
    
    # Fill diagonal boxes
    nums = list(range(1, 10))
    for i in range(0, 9, 3):
        random.shuffle(nums)
        for j in range(3):
            for k in range(3):
                board[i + j][i + k] = nums[j * 3 + k]
    
    # Solve the board
    solve(board)
    
    # Create solution string
    solution = ''.join(str(num) for row in board for num in row)
    
    # Create puzzle by removing numbers
    cells_to_remove = {
        'easy': 30,
        'medium': 40,
        'hard': 50
    }
    
    puzzle = [row[:] for row in board]
    remove_count = cells_to_remove.get(difficulty, 30)
    
    positions = [(i, j) for i in range(9) for j in range(9)]
    random.shuffle(positions)
    
    for i, j in positions[:remove_count]:
        puzzle[i][j] = 0
    
    puzzle_string = ''.join(str(num) for row in puzzle for num in row)
    return puzzle_string, solution


def analyze_hint_candidates(current_state, solution):
    """Analyze the current state and find the best hint candidates"""
    candidates = []
    board = [list(current_state[i:i+9]) for i in range(0, 81, 9)]
    solution_board = [list(solution[i:i+9]) for i in range(0, 81, 9)]
    
    for row in range(9):
        for col in range(9):
            if board[row][col] == '0':
                impact_score = calculate_hint_impact(board, row, col, solution_board[row][col])
                candidates.append({
                    'row': row,
                    'col': col,
                    'value': solution_board[row][col],
                    'impact_score': impact_score,
                    'technique': determine_solving_technique(board, row, col, solution_board[row][col])
                })
    
    # Sort candidates by impact score and technique complexity
    candidates.sort(key=lambda x: (-x['impact_score'], -len(x['technique'])))
    return candidates

def calculate_hint_impact(board, row, col, value):
    """Calculate how impactful a hint would be based on surrounding empty cells"""
    impact = 0
    # Check row
    impact += sum(1 for c in range(9) if board[row][c] == '0')
    # Check column
    impact += sum(1 for r in range(9) if board[r][col] == '0')
    # Check 3x3 box
    box_row, box_col = 3 * (row // 3), 3 * (col // 3)
    for r in range(box_row, box_row + 3):
        for c in range(box_col, box_col + 3):
            if board[r][c] == '0':
                impact += 1
    return impact

def determine_solving_technique(board, row, col, value):
    """Determine which solving technique could be used for this cell"""
    # Check for single candidate
    if is_single_candidate(board, row, col, value):
        return "single_candidate"
    # Check for hidden single in row/column/box
    elif is_hidden_single(board, row, col, value):
        return "hidden_single"
    # If no specific technique is found, it's a basic elimination
    return "basic_elimination"

def is_single_candidate(board, row, col, value):
    """Check if the cell has only one possible candidate"""
    possible_values = set('123456789')
    # Remove values from row
    for c in range(9):
        if board[row][c] != '0':
            possible_values.discard(board[row][c])
    # Remove values from column
    for r in range(9):
        if board[r][col] != '0':
            possible_values.discard(board[r][col])
    # Remove values from 3x3 box
    box_row, box_col = 3 * (row // 3), 3 * (col // 3)
    for r in range(box_row, box_row + 3):
        for c in range(box_col, box_col + 3):
            if board[r][c] != '0':
                possible_values.discard(board[r][c])
    return len(possible_values) == 1

def is_hidden_single(board, row, col, value):
    """Check if the cell is a hidden single in its row, column, or box"""
    # Check row
    row_count = sum(1 for c in range(9) if can_place_number(board, row, c, value))
    if row_count == 1:
        return True
    # Check column
    col_count = sum(1 for r in range(9) if can_place_number(board, r, col, value))
    if col_count == 1:
        return True
    # Check box
    box_row, box_col = 3 * (row // 3), 3 * (col // 3)
    box_count = sum(1 for r in range(box_row, box_row + 3) 
                   for c in range(box_col, box_col + 3) 
                   if can_place_number(board, r, c, value))
    return box_count == 1

def can_place_number(board, row, col, num):
    """Check if a number can be placed in a cell"""
    if board[row][col] != '0':
        return False
    # Check row
    for c in range(9):
        if board[row][c] == num:
            return False
    # Check column
    for r in range(9):
        if board[r][col] == num:
            return False
    # Check 3x3 box
    box_row, box_col = 3 * (row // 3), 3 * (col // 3)
    for r in range(box_row, box_row + 3):
        for c in range(box_col, box_col + 3):
            if board[r][c] == num:
                return False
    return True