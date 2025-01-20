class CelestialBody {
    constructor(type, x, y, mass, radius, id) {
        this.id = id;
        this.type = type;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.mass = mass;
        this.radius = radius;
        this.originalRadius = radius;
        this.originalGravity = null;  // Will be set in initializeProperties
        this.effects = [];
        this.orbitingAround = null;
        this.isDestroyed = false;
        this.shrinkRate = 0.9995;
        this.particleBoost = 1;
        this.lastShrinkTime = Date.now();
        this.rotation = 0;
        this.rotationSpeeds = {
            'star': 0.02,       // Much faster sun rotation
            'redGiant': 0.015,
            'blueGiant': 0.025,
            'rocky': 0.05,      // Fast rocky planets
            'gas': 0.08,        // Very fast gas giants
            'ice': 0.04,
            'neutron': 0.2,     // Super fast neutron stars
            'blackHole': 0.03,  // Faster black holes
            'quasar': 0.04
        };
        this.exploding = false;
        this.hasExploded = false;
        this.lastDecayTime = Date.now();
        this.decayRates = {
            'star': 0.1,
            'redGiant': 0.08,
            'blueGiant': 0.08,
            'rocky': 0.2,
            'gas': 0.15,
            'ice': 0.2,
            'neutron': 0.05,
            'blackHole': 0.02,
            'quasar': 0.03
        };
        this.decayInterval = 1000; // 1 second in milliseconds
        this.sizePercentage = 100; // Start at 100%
        
        this.initializeProperties();
    }

    initializeProperties() {
        // Set base gravity values for each type
        this.gravityValues = {
            'ice': 100,
            'rocky': 150,
            'gas': 200,
            'star': 500,
            'redGiant': 750,
            'blueGiant': 1000,
            'neutron': 2000,
            'blackHole': 2000,
            'quasar': 3500
        };
        
        // Set gravity for this body
        this.gravity = this.gravityValues[this.type];
        this.originalGravity = this.gravity;  // Store original gravity
        this.displayGravity = this.gravity;
        
        // Set gravity influence radius (inner ring * 5)
        this.gravityInfluenceRadius = this.radius * 8; // Larger influence radius

        switch(this.type) {
            case 'blackHole':
                this.color = '#000000';
                this.effectColor = '#660066';
                this.hasEventHorizon = true;
                this.movementResistance = 0.02;
                break;
            case 'star':
                this.color = '#ffec00';  // Perfect yellow sun color
                this.effectColor = '#ffec33';  // Matching yellow glow
                this.hasSolarFlare = true;
                this.flameColors = ['#ffec00', '#ffec33', '#ffcc00', '#ffaa00'];
                break;
            case 'redGiant':
                this.color = '#ff0000';  // Pure bright red
                this.effectColor = '#ff3333';  // Intense red glow
                this.hasSolarFlare = true;
                this.flameColors = ['#ff0000', '#ff1a1a', '#ff3333', '#cc0000'];
                break;
            case 'blueGiant':
                this.color = '#0088ff';  // Much more blue
                this.effectColor = '#00aaff';  // Bright blue glow
                this.hasSolarFlare = true;
                this.flameColors = ['#0088ff', '#00aaff', '#00ccff', '#0066cc'];
                break;
            case 'rocky':
                const rockyColors = [
                    { main: '#aa8866', effect: '#ccaa88' },
                    { main: '#ccaa88', effect: '#ddbbaa' },
                    { main: '#555555', effect: '#777777' }
                ];
                const colorScheme = rockyColors[Math.floor(Math.random() * rockyColors.length)];
                this.color = colorScheme.main;
                this.effectColor = colorScheme.effect;
                break;
            case 'gas':
                this.color = '#ffaa44';
                this.effectColor = '#ffcc88';
                break;
            case 'ice':
                this.color = '#88ccff';
                this.effectColor = '#aaddff';
                break;
            case 'neutron':
                this.color = '#ccccff';
                this.effectColor = '#ccccff';
                this.hasNeutronFlame = true;
                break;
            case 'quasar':
                this.color = '#4444ff';
                this.effectColor = '#4444ff';
                this.hasQuasarJet = true;
                this.mass *= 3;
                this.movementResistance = 0.05;
                this.jetColors = ['#4444ff', '#8888ff', '#4444ff', '#0000ff22'];
                break;
        }
    }

    update(bodies) {
        this.effects = this.effects.filter(effect => effect.update());
        
        this.rotation += this.rotationSpeeds[this.type] || 0;
        
        // Black hole drain effect
        if (this.type === 'blackHole' || this.type === 'neutron' || 
            this.type === 'star' || this.type === 'redGiant' || this.type === 'blueGiant') {
            bodies.forEach(otherBody => {
                if (otherBody !== this && !otherBody.isDestroyed && !otherBody.exploding) {
                    const dx = otherBody.x - this.x;
                    const dy = otherBody.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < this.gravityInfluenceRadius) {
                        let drainRate = 0;
                        switch(this.type) {
                            case 'blackHole': drainRate = 5; break;
                            case 'neutron': drainRate = 3; break;
                            case 'star': drainRate = 0.05; break;
                            case 'redGiant': drainRate = 0.075; break;
                            case 'blueGiant': drainRate = 0.01; break;
                        }
                        
                        // Drain gravity units per second
                        otherBody.gravity = Math.max(0, otherBody.gravity - (drainRate / 60));
                        otherBody.displayGravity = Math.floor(otherBody.gravity);
                        
                        // Scale radius based on remaining gravity percentage
                        const gravityPercentage = otherBody.gravity / otherBody.originalGravity;
                        otherBody.radius = otherBody.originalRadius * gravityPercentage;
                        
                        if (otherBody.gravity <= 0 && !otherBody.hasExploded) {
                            otherBody.explode([]);
                        }
                    }
                }
            });
        }
        
        // Handle natural decay every second
        const currentTime = Date.now();
        if (currentTime - this.lastDecayTime >= this.decayInterval) {
            // Decrease gravity by 1 unit per second
            this.gravity = Math.max(0, this.gravity - 1);
            this.displayGravity = Math.floor(this.gravity);
            
            // Scale radius based on remaining gravity percentage
            const gravityPercentage = this.gravity / this.originalGravity;
            this.radius = this.originalRadius * gravityPercentage;
            
            // If gravity reaches 0, trigger explosion
            if (this.gravity <= 0 && !this.hasExploded) {
                this.explode([]);
            }
            
            this.lastDecayTime = currentTime;
        }
        
        return true;
    }

    explode(bodies) {
        if (this.hasExploded) return null;
        this.hasExploded = true;
        this.isDestroyed = true;

        // Define explosion properties based on type
        let particleCount = 20;
        let speedMultiplier = 1;
        let sizeMultiplier = 1;
        let colors;
        
        switch(this.type) {
            case 'blackHole':
                // Imploding effect for black holes
                particleCount = 30;
                speedMultiplier = -0.5; // Particles move inward
                colors = ['#660066', '#440044', '#220022', '#000000'];
                break;
            case 'neutron':
                // Big bright explosion for neutron stars
                particleCount = 40;
                speedMultiplier = 2;
                sizeMultiplier = 2;
                colors = ['#ffffff', '#ccccff', '#8888ff', '#aaaaff'];
                break;
            case 'quasar':
                // Massive energetic explosion
                particleCount = 35;
                speedMultiplier = 3;
                colors = ['#4444ff', '#0000ff', '#2222ff', '#6666ff'];
                break;
            case 'rocky':
            case 'ice':
            case 'gas':
                // Smaller explosion for planets
                particleCount = 15;
                speedMultiplier = 0.7;
                sizeMultiplier = 0.7;
                // Use color variations based on type
                colors = this.type === 'rocky' ? 
                    ['#aa8866', '#886644', '#664422', '#442200'] :
                    this.type === 'ice' ? 
                    ['#88ccff', '#66aaff', '#4488ff', '#2266ff'] :
                    ['#ffaa44', '#ff8822', '#ff6600', '#cc4400'];
                break;
            default:
                // Default explosion (stars)
                colors = [this.color, this.effectColor, '#ff8800', '#ff4400'];
        }

        return {
            x: this.x,
            y: this.y,
            radius: this.radius,
            color: this.color,
            startTime: Date.now(),
            progress: 0,
            isDestroyed: false,
            particles: Array(particleCount).fill().map(() => {
                const angle = Math.random() * Math.PI * 2;
                const speed = (1 + Math.random() * 3) * speedMultiplier;
                // Randomly choose size category
                const sizeMultiplier = [0.75, 1, 1.5][Math.floor(Math.random() * 3)];
                // Pick a random color from the array
                const color = colors[Math.floor(Math.random() * colors.length)];
                return {
                    angle,
                    speed,
                    size: this.radius * 0.2 * sizeMultiplier * sizeMultiplier,
                    color: color
                };
            }),
            
            update: function() {
                const elapsed = Date.now() - this.startTime;
                this.progress = Math.min(1, elapsed / 5000); // 5 seconds duration
                
                if (this.progress >= 1) {
                    this.isDestroyed = true;
                    return false;
                }
                return true;
            },
            
            draw: function(ctx) {
                const opacity = 1 - this.progress;
                
                // Draw explosion particles
                this.particles.forEach(particle => {
                    const distance = particle.speed * this.progress * this.radius * 4;
                    const x = this.x + Math.cos(particle.angle) * distance;
                    const y = this.y + Math.sin(particle.angle) * distance;
                    
                    ctx.beginPath();
                    ctx.fillStyle = particle.color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
                    ctx.arc(x, y, particle.size * (1 - this.progress * 0.5), 0, Math.PI * 2);
                    ctx.fill();
                });
            }
        };
    }

    draw(ctx) {
        // Draw effects first
        this.effects.forEach(effect => effect.draw(ctx));
        
        // Draw the body if not destroyed
        if (!this.isDestroyed) {
            ctx.save();
            // Store position before rotation
            const gravityX = this.x;
            const gravityY = this.y - this.radius - 5;

            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.translate(-this.x, -this.y);

            // Draw gravity influence ring only if showGravityRings is true
            if (window.showGravityRings !== false) {
                ctx.beginPath();
                ctx.strokeStyle = '#666666';
                ctx.lineWidth = 0.5;
                ctx.setLineDash([2, 4]);
                ctx.arc(this.x, this.y, this.gravityInfluenceRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw the larger solid ring if rings are enabled
                ctx.beginPath();
                ctx.strokeStyle = '#666666';
                ctx.lineWidth = 1;
                
                // Different ring sizes for different types
                let ringRadius;
                if (this.type === 'star' || this.type === 'redGiant' || this.type === 'blueGiant') {
                    ringRadius = this.radius * 2.5;
                } else if (this.type === 'rocky' || this.type === 'gas' || this.type === 'ice') {
                    ringRadius = this.radius * 1.75;
                } else {
                    ringRadius = this.radius * 4;
                }
                
                ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
                ctx.stroke();

                // Draw the inner dotted ring if rings are enabled
                ctx.beginPath();
                ctx.strokeStyle = '#666666';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.arc(this.x, this.y, this.radius * 1.3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Draw special effects and body
            if (this.type === 'blackHole') {
                const time = Date.now() / 1000;
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, this.radius * 0.5,
                    this.x, this.y, this.radius * 3
                );
                gradient.addColorStop(0, '#000000');
                gradient.addColorStop(0.5, this.effectColor + '44');
                gradient.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.fillStyle = gradient;
                ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
                ctx.fill();
            }

            if (this.type === 'neutron') {
                // Remove the neutron star's white glow
            }

            if (this.type === 'gas') {
                const time = Date.now() / 1000;
                for (let i = 0; i < 3; i++) {
                    const offset = i * Math.PI * 2 / 3 + time + this.rotation;
                    const gradient = ctx.createRadialGradient(
                        this.x + Math.cos(offset) * this.radius * 0.3,
                        this.y + Math.sin(offset) * this.radius * 0.3,
                        0,
                        this.x + Math.cos(offset) * this.radius * 0.3,
                        this.y + Math.sin(offset) * this.radius * 0.3,
                        this.radius * 1.2
                    );
                    gradient.addColorStop(0, this.effectColor + '44');
                    gradient.addColorStop(1, 'transparent');
                    ctx.beginPath();
                    ctx.fillStyle = gradient;
                    ctx.arc(
                        this.x + Math.cos(offset) * this.radius * 0.3,
                        this.y + Math.sin(offset) * this.radius * 0.3,
                        this.radius * 1.2,
                        0, Math.PI * 2
                    );
                    ctx.fill();
                }
            }

            if (this.type === 'ice') {
                const time = Date.now() / 1000;
                const shimmer = Math.sin(time * 3) * 0.3 + 0.7;
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, this.radius * 0.5,
                    this.x, this.y, this.radius * 1.5
                );
                gradient.addColorStop(0, this.color + Math.floor(shimmer * 255).toString(16).padStart(2, '0'));
                gradient.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.fillStyle = gradient;
                ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }

            if (this.type === 'rocky') {
                const time = Date.now() / 1000;
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2 + this.rotation;
                    const dist = this.radius * 0.3;
                    ctx.beginPath();
                    ctx.fillStyle = this.effectColor + '33';
                    ctx.arc(
                        this.x + Math.cos(angle) * dist,
                        this.y + Math.sin(angle) * dist,
                        this.radius * 0.4,
                        0, Math.PI * 2
                    );
                    ctx.fill();
                }
            }

            if (this.type === 'rocky' || this.type === 'gas' || this.type === 'ice') {
                for (let i = 0; i < 3; i++) {
                    const angle = (i / 3) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.fillStyle = this.effectColor + '44';
                    ctx.arc(
                        this.x + Math.cos(angle) * this.radius * 0.5,
                        this.y + Math.sin(angle) * this.radius * 0.5,
                        this.radius * 0.2,
                        0, Math.PI * 2
                    );
                    ctx.fill();
                }
            }

            ctx.beginPath();
            ctx.fillStyle = this.color;
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();

            if (this.hasQuasarJet) {
                const time = Date.now() / 1000;
                const jetLength = this.gravityInfluenceRadius;
                const jetWidth = this.radius * 0.5;
                const angles = [0, Math.PI];
                
                angles.forEach(baseAngle => {
                    ctx.beginPath();
                    ctx.fillStyle = this.color + '88';
                    
                    const segments = 10;
                    const points = [];
                    
                    for (let i = 0; i <= segments; i++) {
                        const dist = (i / segments) * jetLength;
                        const wave = Math.sin(time * 5 + dist) * jetWidth;
                        points.push({
                            x: this.x + Math.cos(baseAngle) * dist + Math.cos(baseAngle + Math.PI/2) * wave,
                            y: this.y + Math.sin(baseAngle) * dist + Math.sin(baseAngle + Math.PI/2) * wave
                        });
                    }
                    
                    ctx.moveTo(this.x, this.y);
                    points.forEach(point => ctx.lineTo(point.x, point.y));
                    
                    for (let i = points.length - 1; i >= 0; i--) {
                        const width = jetWidth * (1 - i/segments);
                        const perpAngle = baseAngle - Math.PI/2;
                        ctx.lineTo(
                            points[i].x + Math.cos(perpAngle) * width,
                            points[i].y + Math.sin(perpAngle) * width
                        );
                    }
                    
                    ctx.closePath();
                    ctx.fill();
                });
            }

            ctx.restore();
            
            // Draw gravity value instead of percentage
            if (window.showGravityNumbers !== false) {
                ctx.font = '12px Arial';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText(Math.floor(this.gravity), gravityX, gravityY);
            }
        }
    }
} 