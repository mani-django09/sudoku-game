class Timer {
    constructor() {
        this.seconds = 0;
        this.interval = null;
        this.display = document.getElementById('timer');
    }

    start() {
        this.interval = setInterval(() => {
            this.seconds++;
            this.updateDisplay();
        }, 1000);
    }

    stop() {
        clearInterval(this.interval);
    }

    pause() {
        this.stop();
    }

    resume() {
        this.start();
    }

    reset() {
        this.stop();
        this.seconds = 0;
        this.updateDisplay();
    }

    updateDisplay() {
        const hours = Math.floor(this.seconds / 3600);
        const minutes = Math.floor((this.seconds % 3600) / 60);
        const secs = this.seconds % 60;
        
        this.display.textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}
