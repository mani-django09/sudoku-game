# Online Sudoku Game

An interactive web-based Sudoku game implementation with modern features and an intuitive user interface.

## Features

- Dynamic game board with real-time validation
- Multiple difficulty levels (Easy, Medium, Hard)
- Daily challenges
- Advanced hint system with technique visualization
- Pencil marks functionality
- Integrated timer
- Mobile-responsive design
- Game state persistence

### Game Features
- Intelligent hint system with solving technique visualization
- Pencil marks for noting possible numbers
- Mistake counter and scoring system
- Undo/Redo functionality
- Interactive number pad
- Cell highlighting and error detection

### Technical Features
- Built with Flask backend
- PostgreSQL database for puzzle storage
- Modern JavaScript frontend
- Responsive CSS design
- SEO optimized
- Accessibility compliant

## Tech Stack

- Backend: Python/Flask
- Database: PostgreSQL
- Frontend: JavaScript, HTML5, CSS3
- UI Components: Bootstrap, Feather Icons

## Setup and Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd online-sudoku
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
DATABASE_URL=your_database_url
```

4. Initialize the database:
```bash
flask db upgrade
```

5. Run the application:
```bash
python app.py
```

The application will be available at `http://localhost:5000`

## Development

### Project Structure
```
.
├── app.py              # Application entry point
├── models.py           # Database models
├── routes.py           # Route handlers
├── static/            
│   ├── css/           # Stylesheets
│   └── js/            # JavaScript files
├── templates/          # HTML templates
└── utils/             # Utility functions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with Flask
- Styled with Bootstrap
- Icons by Feather Icons
