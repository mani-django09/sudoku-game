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
        # Define hint messages at the start
        hint_messages = {
            'single_candidate': 'This cell has only one possible number based on the current state',
            'hidden_single': 'This number can only go in this specific position within its group',
            'basic_elimination': 'Use basic elimination rules to find the correct number',
            'naked_pair': 'Two cells in this group can only contain the same two numbers',
            'hidden_pair': 'These two numbers can only appear in these two cells',
            'pointing_pair': 'These two cells force this number to be in a specific position',
            'box_line_reduction': 'This number must be in this line within this box'
        }

        # Get and validate request data
        data = request.get_json()
        request_id = request.headers.get('X-Request-ID', 'unknown')
        app.logger.info(f"[{request_id}] Processing hint request")
        
        if not data:
            app.logger.error(f"[{request_id}] Hint request received with no data")
            return jsonify({
                'error': 'No data provided',
                'details': 'Request body is empty'
            }), 400

        # Extract and validate required fields
        current_state = data.get('current_state')
        solution = data.get('solution')
        
        # Log request details (excluding solution for security)
        app.logger.info(f"[{request_id}] Request details - Current state length: {len(current_state) if current_state else 'None'}")
        
        # Detailed input validation with improved logging
        if not current_state or not solution:
            app.logger.error(f"[{request_id}] Missing required fields: current_state={'Yes' if current_state else 'No'}, solution={'Yes' if solution else 'No'}")
            return jsonify({
                'error': 'Missing required fields',
                'details': 'Both current_state and solution are required'
            }), 400
        
        # Type validation
        if not isinstance(current_state, str) or not isinstance(solution, str):
            app.logger.error(f"[{request_id}] Invalid data types: current_state={type(current_state)}, solution={type(solution)}")
            return jsonify({
                'error': 'Invalid data types',
                'details': 'Both current_state and solution must be strings'
            }), 400
            
        # Length validation
        if len(current_state) != 81 or len(solution) != 81:
            app.logger.error(f"[{request_id}] Invalid length: current_state={len(current_state)}, solution={len(solution)}")
            return jsonify({
                'error': 'Invalid board size',
                'details': 'Both current_state and solution must be exactly 81 characters long'
            }), 400
            
        # Character validation with detailed error reporting
        invalid_chars_current = set(c for c in current_state if c not in '0123456789')
        if invalid_chars_current:
            app.logger.error(f"[{request_id}] Invalid characters in current_state: {invalid_chars_current}")
            return jsonify({
                'error': 'Invalid characters',
                'details': f'Current state contains invalid characters: {", ".join(invalid_chars_current)}'
            }), 400
            
        invalid_chars_solution = set(c for c in solution if c not in '123456789')
        if invalid_chars_solution:
            app.logger.error(f"[{request_id}] Invalid characters in solution: {invalid_chars_solution}")
            return jsonify({
                'error': 'Invalid characters',
                'details': f'Solution contains invalid characters: {", ".join(invalid_chars_solution)}'
            }), 400
            
        # Validate solution consistency
        zero_positions = [i for i, c in enumerate(current_state) if c != '0']
        for pos in zero_positions:
            if current_state[pos] != solution[pos]:
                app.logger.error(f"[{request_id}] Solution inconsistency at position {pos}")
                return jsonify({
                    'error': 'Invalid board state',
                    'details': 'Current state conflicts with solution'
                }), 400
            
        app.logger.info(f"[{request_id}] Input validation passed, analyzing hint candidates")
        hint = analyze_hint_candidates(current_state, solution)
        
        if not hint:
            app.logger.info(f"[{request_id}] No valid hints available for current board state")
            return jsonify({
                'error': 'No hints available',
                'details': 'No valid hints could be generated for the current board state'
            }), 404
            
        # Enhanced hint response validation
        required_fields = {
            'row': (int, lambda x: 0 <= x < 9),
            'col': (int, lambda x: 0 <= x < 9),
            'value': (str, lambda x: x in '123456789'),
            'technique': (str, lambda x: x in hint_messages),
            'related_cells': (list, lambda x: all(
                isinstance(cell, dict) and
                all(k in cell for k in ['row', 'col']) and
                isinstance(cell['row'], int) and
                isinstance(cell['col'], int) and
                0 <= cell['row'] < 9 and
                0 <= cell['col'] < 9
                for cell in x
            ))
        }
        
        validation_errors = []
        for field, (expected_type, validator) in required_fields.items():
            if field not in hint:
                validation_errors.append(f"Missing field: {field}")
            elif not isinstance(hint[field], expected_type):
                validation_errors.append(f"Invalid type for {field}: expected {expected_type.__name__}")
            elif not validator(hint[field]):
                validation_errors.append(f"Invalid value for {field}")
        
        if validation_errors:
            app.logger.error(f"[{request_id}] Hint validation errors: {validation_errors}")
            return jsonify({
                'error': 'Invalid hint data',
                'details': '; '.join(validation_errors)
            }), 500
            
        # Validate hint technique
        
        if hint['technique'] not in hint_messages:
            app.logger.error(f"[{request_id}] Unknown technique: {hint['technique']}")
            return jsonify({
                'error': 'Invalid technique',
                'details': f"Unknown solving technique: {hint['technique']}"
            }), 500
        
        response_data = {
            'row': hint['row'],
            'col': hint['col'],
            'value': hint['value'],
            'technique': hint['technique'],
            'message': hint_messages[hint['technique']],
            'related_cells': hint['related_cells']
        }
        
        app.logger.info(f"[{request_id}] Hint generated successfully using technique: {hint['technique']}")
        app.logger.debug(f"[{request_id}] Full hint response: {response_data}")
        return jsonify(response_data)
        
    except ValueError as ve:
        app.logger.error(f"[{request_id}] Validation error in hint request: {str(ve)}")
        return jsonify({
            'error': 'Validation error',
            'details': str(ve)
        }), 400
    except Exception as e:
        app.logger.error(f"[{request_id}] Unexpected error in hint request: {str(e)}")
        app.logger.exception("Detailed error traceback:")
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

@app.after_request
def add_header(response):
    """Add headers to both force latest IE rendering engine or Chrome Frame,
    and also to cache the rendered page for 10 minutes."""
    response.headers['X-UA-Compatible'] = 'IE=Edge,chrome=1'
    if 'Cache-Control' not in response.headers:
        response.headers['Cache-Control'] = 'public, max-age=600'
    return response

@app.route('/sitemap.xml')
def sitemap():
    """Generate sitemap.xml dynamically."""
    from datetime import datetime
    pages = []
    ten_days_ago = datetime.now().date().isoformat()
    
    # Add all important pages
    pages.append({
        'loc': url_for('index', _external=True),
        'lastmod': ten_days_ago,
        'changefreq': 'daily',
        'priority': '1.0'
    })
    
    pages.append({
        'loc': url_for('terms', _external=True),
        'lastmod': ten_days_ago,
        'changefreq': 'monthly',
        'priority': '0.6'
    })
    
    pages.append({
        'loc': url_for('privacy', _external=True),
        'lastmod': ten_days_ago,
        'changefreq': 'monthly',
        'priority': '0.6'
    })
    
    pages.append({
        'loc': url_for('contact', _external=True),
        'lastmod': ten_days_ago,
        'changefreq': 'monthly',
        'priority': '0.7'
    })
    
    sitemap_xml = render_template('sitemap.xml', pages=pages)
    response = make_response(sitemap_xml)
    response.headers["Content-Type"] = "application/xml"
    
    return response


@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

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