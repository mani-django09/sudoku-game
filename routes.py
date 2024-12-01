from flask import render_template, jsonify, request, flash, redirect, url_for
from app import app
from utils.generator import generate_puzzle, analyze_hint_candidates

from datetime import datetime, timedelta
import random

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new-game/<difficulty>')
def new_game(difficulty):
    puzzle, solution = generate_puzzle(difficulty)
    return jsonify({
        'puzzle': puzzle,
        'solution': solution
    })

@app.route('/hint', methods=['POST'])
def get_hint():
    try:
        # Get and validate request data
        data = request.get_json()
        if not data:
            app.logger.error("Hint request received with no data")
            return jsonify({'error': 'No data provided', 'details': 'Request body is empty'}), 400

        # Extract required fields
        current_state = data.get('current_state')
        solution = data.get('solution')
        
        # Detailed input validation
        if not current_state or not solution:
            app.logger.error(f"Missing required fields: current_state={'Yes' if current_state else 'No'}, solution={'Yes' if solution else 'No'}")
            return jsonify({
                'error': 'Missing required fields',
                'details': 'Both current_state and solution are required'
            }), 400
        
        # Type validation
        if not isinstance(current_state, str) or not isinstance(solution, str):
            app.logger.error(f"Invalid data types: current_state={type(current_state)}, solution={type(solution)}")
            return jsonify({
                'error': 'Invalid data types',
                'details': 'Both current_state and solution must be strings'
            }), 400
            
        # Length validation
        if len(current_state) != 81 or len(solution) != 81:
            app.logger.error(f"Invalid length: current_state={len(current_state)}, solution={len(solution)}")
            return jsonify({
                'error': 'Invalid board size',
                'details': 'Both current_state and solution must be exactly 81 characters long'
            }), 400
            
        # Character validation
        if not all(c in '0123456789' for c in current_state):
            app.logger.error("Invalid characters in current_state")
            return jsonify({
                'error': 'Invalid characters',
                'details': 'Current state can only contain digits 0-9'
            }), 400
            
        if not all(c in '123456789' for c in solution):
            app.logger.error("Invalid characters in solution")
            return jsonify({
                'error': 'Invalid characters',
                'details': 'Solution can only contain digits 1-9'
            }), 400
            
        app.logger.info("Processing hint request for board state")
        hint = analyze_hint_candidates(current_state, solution)
        
        if not hint:
            app.logger.info("No valid hints available for current board state")
            return jsonify({
                'error': 'No hints available',
                'details': 'No valid hints could be generated for the current board state'
            }), 404
            
        # Validate hint response
        required_fields = ['row', 'col', 'value', 'technique', 'related_cells']
        missing_fields = [field for field in required_fields if field not in hint]
        if missing_fields:
            app.logger.error(f"Invalid hint response, missing fields: {missing_fields}")
            return jsonify({
                'error': 'Invalid hint data',
                'details': f'Hint response missing required fields: {", ".join(missing_fields)}'
            }), 500
            
        # Prepare hint message based on technique
        hint_messages = {
            'single_candidate': 'This cell has only one possible number based on the current state',
            'hidden_single': 'This number can only go in this specific position within its group',
            'basic_elimination': 'Use basic elimination rules to find the correct number'
        }
        
        response_data = {
            'row': hint['row'],
            'col': hint['col'],
            'value': hint['value'],
            'technique': hint['technique'],
            'message': hint_messages.get(hint['technique'], 'Use elimination to solve this cell'),
            'related_cells': hint['related_cells']
        }
        
        app.logger.info(f"Hint found using technique: {hint['technique']}")
        app.logger.debug(f"Full hint response: {response_data}")
        return jsonify(response_data)
        
    except ValueError as ve:
        app.logger.error(f"Validation error in hint request: {str(ve)}")
        return jsonify({
            'error': 'Validation error',
            'details': str(ve)
        }), 400
    except Exception as e:
        app.logger.error(f"Unexpected error in hint request: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'details': 'An unexpected error occurred while processing the hint request'
        }), 500

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        subject = request.form.get('subject')
        message = request.form.get('message')
        
        # Here you would typically send the email or store the contact form submission
        flash('Thank you for your message! We will get back to you soon.', 'success')
        return redirect(url_for('contact'))
    return render_template('contact.html')

@app.route('/daily-challenge')
def daily_challenge():
    try:
        from models import DailyPuzzle
        from utils.generator import generate_puzzle
        from app import db
        import logging
        
        logging.info("Accessing daily challenge endpoint")
        today = datetime.now().date()
        
        # Try to get today's puzzle from the database
        try:
            daily_puzzle = DailyPuzzle.query.filter_by(puzzle_date=today).first()
            logging.info(f"Queried daily puzzle for date: {today}")
        except Exception as db_error:
            logging.error(f"Database error while fetching daily puzzle: {str(db_error)}")
            return jsonify({'error': 'Failed to fetch daily puzzle'}), 500
        
        if not daily_puzzle:
            logging.info("No puzzle found for today, generating new puzzle")
            try:
                # Generate a new puzzle with random difficulty
                difficulty = random.choice(['easy', 'medium', 'hard'])
                puzzle, solution = generate_puzzle(difficulty)
                
                # Create new daily puzzle
                daily_puzzle = DailyPuzzle(
                    puzzle_date=today,
                    puzzle=puzzle,
                    solution=solution,
                    difficulty=difficulty
                )
                db.session.add(daily_puzzle)
                db.session.commit()
                logging.info(f"Created new daily puzzle with difficulty: {difficulty}")
            except Exception as gen_error:
                logging.error(f"Error generating/saving new puzzle: {str(gen_error)}")
                db.session.rollback()
                return jsonify({'error': 'Failed to generate new puzzle'}), 500
        
        return jsonify({
            'puzzle': daily_puzzle.puzzle,
            'solution': daily_puzzle.solution,
            'difficulty': daily_puzzle.difficulty,
            'date': daily_puzzle.puzzle_date.strftime('%Y-%m-%d')
        })
        
    except Exception as e:
        logging.error(f"Unexpected error in daily challenge: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500