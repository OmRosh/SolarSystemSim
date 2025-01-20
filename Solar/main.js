class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.bodies = [];
        this.explosions = [];  // Track explosion effects
        this.usedIds = new Set(); // Track all used IDs
        this.selectedType = null;
        this.isPlaying = true;
        this.nextId = 0;
        this.events = [];
        this.lastEventTime = Date.now();
        this.eventInterval = 60000; // 60 seconds
        
        this.resize();
        this.setupEventListeners();
        this.animate();

        // Initialize visibility states
        window.showGravityRings = true;
        window.showGravityNumbers = true;

        // Add settings button handler
        document.getElementById('settingsBtn').addEventListener('click', () => {
            const panel = document.getElementById('settingsPanel');
            panel.classList.toggle('active');
        });

        // Add trigger event button handler
        document.getElementById('triggerEvent').addEventListener('click', () => {
            this.events.push(new SpaceEvent(this.canvas));
        });

        // Close settings when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('settingsPanel');
            const settingsBtn = document.getElementById('settingsBtn');
            if (!panel.contains(e.target) && !settingsBtn.contains(e.target)) {
                panel.classList.remove('active');
            }
        });
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());

        const objectItems = document.querySelectorAll('.object-item');
        objectItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.selectedType = item.dataset.type;
                e.dataTransfer.setData('text/plain', item.dataset.type);
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
        });

        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const type = e.dataTransfer.getData('text/plain');
            if (type) {
                const properties = this.getBodyProperties(type);
                let newId;
                do {
                    newId = Math.random().toString(36).substr(2, 9);
                } while (this.usedIds.has(newId));
                
                this.usedIds.add(newId);
                
                const newBody = new CelestialBody(
                    type,
                    x,
                    y,
                    properties.mass,
                    properties.radius,
                    newId
                );
                this.bodies.push(newBody);
            }
        });

        document.getElementById('playPause').addEventListener('click', () => {
            this.isPlaying = !this.isPlaying;
            const btn = document.getElementById('playPause');
            btn.textContent = this.isPlaying ? 'Playing' : 'Paused';
            btn.classList.toggle('paused', !this.isPlaying);
        });

        document.getElementById('clear').addEventListener('click', () => {
            this.bodies = [];
        });

        document.getElementById('explodeAll').addEventListener('click', () => {
            this.bodies = this.bodies.filter(body => {
                const explosion = body.explode();
                if (explosion) {
                    this.explosions.push(explosion);
                }
                return false;
            });
        });
    }

    getBodyProperties(type) {
        const properties = {
            quasar: { mass: 80000, radius: 25 },
            blackHole: { mass: 100000, radius: 35 },
            star: { mass: 20000, radius: 25 },
            redGiant: { mass: 30000, radius: 35 },
            blueGiant: { mass: 35000, radius: 40 },
            rocky: { mass: 1000, radius: 10 },
            gas: { mass: 5000, radius: 20 },
            ice: { mass: 2000, radius: 15 },
            neutron: { mass: 40000, radius: 15 }
        };
        return properties[type];
    }

    update() {
        if (!this.isPlaying) return;

        // Update timer display
        const timeLeft = Math.max(0, Math.ceil((this.eventInterval - (Date.now() - this.lastEventTime)) / 1000));
        document.getElementById('eventTimer').textContent = timeLeft + 's';

        // Check for automatic event spawn
        if (Date.now() - this.lastEventTime >= this.eventInterval) {
            this.events.push(new SpaceEvent(this.canvas));
            this.lastEventTime = Date.now();
        }

        // Update and filter out finished events
        this.events = this.events.filter(event => {
            event.update();
            return !event.isFinished;
        });

        // Update regular bodies
        this.bodies = this.bodies.filter(body => {
            if (body.gravity <= 0 && !body.hasExploded) {
                const explosion = body.explode();
                if (explosion) {
                    this.explosions.push(explosion);
                }
                return false;
            }
            return !body.isDestroyed;
        });

        // Update explosions
        this.explosions = this.explosions.filter(explosion => {
            return explosion.update();
        });

        // Update physics for all bodies
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                Physics.applyGravity(this.bodies[i], this.bodies[j], this.bodies);
            }
            this.bodies[i].update(this.bodies);
        }

        // Clean up any invalid bodies
        this.bodies = this.bodies.filter(body => 
            body && body.id && !isNaN(body.x) && !isNaN(body.y)
        );

        // Remove any duplicates by ID (keep the first instance)
        const uniqueBodies = new Map();
        for (const body of this.bodies) {
            if (!uniqueBodies.has(body.id)) {
                uniqueBodies.set(body.id, body);
            }
        }
        this.bodies = Array.from(uniqueBodies.values());

        // Ensure all IDs are properly tracked
        this.usedIds.clear();
        this.bodies.forEach(body => this.usedIds.add(body.id));

        // Update and filter out destroyed bodies
        this.bodies = this.bodies.filter(body => {
            if (body.isDestroyed) {
                this.usedIds.delete(body.id);
                return false;
            }

            // Validate position updates
            const newX = body.x + body.vx;
            const newY = body.y + body.vy;
            if (isNaN(newX) || isNaN(newY)) return false;
            
            body.x = newX;
            body.y = newY;

            // Keep objects within screen bounds
            const padding = body.radius;
            if (body.x < padding) {
                body.x = padding;
                body.vx = Math.abs(body.vx) * 0.8;
            } else if (body.x > this.canvas.width - padding) {
                body.x = this.canvas.width - padding;
                body.vx = -Math.abs(body.vx) * 0.8;
            }
            
            if (body.y < padding) {
                body.y = padding;
                body.vy = Math.abs(body.vy) * 0.8;
            } else if (body.y > this.canvas.height - padding) {
                body.y = this.canvas.height - padding;
                body.vy = -Math.abs(body.vy) * 0.8;
            }

            const keepBody = body.update(this.bodies);

            return keepBody;
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw bodies
        this.bodies.forEach(body => {
            body.draw(this.ctx);
        });

        // Draw explosions
        this.explosions.forEach(explosion => {
            explosion.draw(this.ctx);
        });

        // Draw events on top
        this.events.forEach(event => {
            event.draw(this.ctx);
        });
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 