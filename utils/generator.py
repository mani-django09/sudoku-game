import random
from typing import List, Tuple, Dict

def generate_puzzle(difficulty: str) -> Tuple[str, str]:
    """Generate a Sudoku puzzle and its solution based on difficulty level"""
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
    """Analyze the current state and find the best hint candidates with related cells"""
    try:
        # Validate input parameters
        if not isinstance(current_state, str) or not isinstance(solution, str):
            raise ValueError("Current state and solution must be strings")
        
        if len(current_state) != 81 or len(solution) != 81:
            raise ValueError("Current state and solution must be exactly 81 characters long")
            
        if not all(c in '0123456789' for c in current_state):
            raise ValueError("Current state contains invalid characters")
            
        if not all(c in '123456789' for c in solution):
            raise ValueError("Solution contains invalid characters")
        
        # Check if the puzzle is already solved
        if current_state == solution:
            return None
            
        candidates = []
        board = [list(current_state[i:i+9]) for i in range(0, 81, 9)]
        solution_board = [list(solution[i:i+9]) for i in range(0, 81, 9)]
        
        for row in range(9):
            for col in range(9):
                if board[row][col] == '0':
                    try:
                        impact_score = calculate_hint_impact(board, row, col, solution_board[row][col])
                        technique, related_cells = determine_solving_technique_with_cells(board, row, col, solution_board[row][col])
                        
                        # Validate hint data
                        if not isinstance(technique, str) or not related_cells:
                            continue
                            
                        candidate = {
                            'row': row,
                            'col': col,
                            'value': solution_board[row][col],
                            'impact_score': impact_score,
                            'technique': technique,
                            'related_cells': related_cells
                        }
                        
                        # Ensure all required fields are present
                        if all(k in candidate for k in ['row', 'col', 'value', 'technique', 'related_cells']):
                            candidates.append(candidate)
                            
                    except Exception as e:
                        print(f"Error processing hint candidate at position ({row}, {col}): {str(e)}")
                        continue
        
        if not candidates:
            return None
            
        # Sort candidates by impact score and technique complexity
        candidates.sort(key=lambda x: (-x['impact_score'], -len(x['technique'])))
        return candidates[0]
        
    except Exception as e:
        print(f"Error analyzing hint candidates: {str(e)}")
        return None

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

def determine_solving_technique_with_cells(board, row, col, value):
    """Determine which solving technique could be used for this cell and return related cells"""
    related_cells = []
    
    # Check for single candidate
    if is_single_candidate(board, row, col, value):
        # Get cells that led to the elimination
        related_cells = get_single_candidate_related_cells(board, row, col, value)
        return "single_candidate", related_cells
    
    # Check for hidden single in row/column/box
    hidden_single_result = is_hidden_single_with_cells(board, row, col, value)
    if hidden_single_result[0]:
        return "hidden_single", hidden_single_result[1]
    
    # If no specific technique is found, it's a basic elimination
    return "basic_elimination", get_basic_elimination_cells(board, row, col)

def is_single_candidate(board, row, col, value):
    """Check if the cell has only one possible candidate"""
    possible_values = get_possible_values(board, row, col)
    return len(possible_values) == 1 and str(value) in possible_values

def get_possible_values(board, row, col):
    """Get set of possible values for a cell"""
    if board[row][col] != '0':
        return set()
        
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
                
    return possible_values

def get_single_candidate_related_cells(board, row, col, value):
    """Get cells that contribute to making this cell a single candidate"""
    related_cells = []
    
    # Add filled cells in the same row
    for c in range(9):
        if board[row][c] != '0' and c != col:
            related_cells.append({'row': row, 'col': c})
    
    # Add filled cells in the same column
    for r in range(9):
        if board[r][col] != '0' and r != row:
            related_cells.append({'row': r, 'col': col})
    
    # Add filled cells in the same 3x3 box
    box_row, box_col = 3 * (row // 3), 3 * (col // 3)
    for r in range(box_row, box_row + 3):
        for c in range(box_col, box_col + 3):
            if board[r][c] != '0' and (r != row or c != col):
                related_cells.append({'row': r, 'col': c})
    
    return related_cells

def is_hidden_single_with_cells(board, row, col, value):
    """Check if the cell is a hidden single and return related cells"""
    related_cells = []
    str_value = str(value)
    
    # Check row
    row_possible = []
    for c in range(9):
        if board[row][c] == '0' and str_value in get_possible_values(board, row, c):
            row_possible.append(c)
    if len(row_possible) == 1:
        # Add all cells in the row
        related_cells = [{'row': row, 'col': c} for c in range(9) if c != col]
        return True, related_cells
    
    # Check column
    col_possible = []
    for r in range(9):
        if board[r][col] == '0' and str_value in get_possible_values(board, r, col):
            col_possible.append(r)
    if len(col_possible) == 1:
        # Add all cells in the column
        related_cells = [{'row': r, 'col': col} for r in range(9) if r != row]
        return True, related_cells
    
    # Check box
    box_row, box_col = 3 * (row // 3), 3 * (col // 3)
    box_possible = []
    for r in range(box_row, box_row + 3):
        for c in range(box_col, box_col + 3):
            if board[r][c] == '0' and str_value in get_possible_values(board, r, c):
                box_possible.append((r, c))
    if len(box_possible) == 1:
        # Add all cells in the box
        related_cells = [
            {'row': r, 'col': c}
            for r in range(box_row, box_row + 3)
            for c in range(box_col, box_col + 3)
            if r != row or c != col
        ]
        return True, related_cells
    
    return False, []

def get_basic_elimination_cells(board, row, col):
    """Get related cells for basic elimination technique"""
    return [
        {'row': row, 'col': c}
        for c in range(9)
        if c != col and board[row][c] != '0'
    ]

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