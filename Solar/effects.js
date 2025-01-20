class Effect {
    constructor(x, y, color, duration) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.duration = duration;
        this.age = 0;
    }

    update() {
        this.age++;
        return this.age < this.duration;
    }
}

class ParticleEffect extends Effect {
    constructor(x, y, color, bodyType, boostFactor = 1, isExplosion = false) {
        // Longer duration for certain body types
        let duration = bodyType === 'blackHole' ? 60 :
                       bodyType.includes('Giant') ? 40 :
                       bodyType === 'neutron' ? 35 : 30;
        
        // Longer duration for explosions
        if (isExplosion) {
            duration *= 1.5;
        }

        super(x, y, color, duration);
        
        // Customize number of particles and size based on body type
        let particleCount = bodyType === 'blackHole' ? 20 :
                            bodyType.includes('Giant') ? 12 :
                            bodyType === 'star' ? 10 :
                            bodyType === 'neutron' ? 8 : 6;
        
        let baseSize = bodyType === 'blackHole' ? 3 :
                       bodyType.includes('Giant') ? 2.5 :
                       bodyType === 'star' ? 2 :
                       bodyType === 'neutron' ? 1.8 : 1.5;
        
        // Special particle colors for black holes
        if (bodyType === 'blackHole') {
            this.particleColors = ['#ff00ff', '#660066', '#440044', '#000000'];
            this.isBlackHole = true;
        }

        // Increase particles and size for explosions
        if (isExplosion) {
            particleCount *= 2;
            baseSize *= 1.5;
        }

        // Increase particle count based on boost factor
        const boostedCount = Math.floor(particleCount * boostFactor);
        this.particles = Array(boostedCount).fill().map(() => ({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * (isExplosion ? 6 : 3),
            vy: (Math.random() - 0.5) * (isExplosion ? 6 : 3),
            size: (Math.random() * baseSize + baseSize/2) * Math.sqrt(boostFactor),
            color: this.isBlackHole ? 
                this.particleColors[Math.floor(Math.random() * this.particleColors.length)] : 
                this.color
        }));
    }

    update() {
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.size *= 0.97; // Slower size reduction for longer-lasting particles
        });
        return super.update();
    }

    draw(ctx) {
        this.particles.forEach(p => {
            const opacity = Math.pow(1 - this.age / this.duration, 1.5);
            ctx.fillStyle = this.isBlackHole ? 
                p.color + Math.floor(opacity * 255).toString(16).padStart(2, '0') :
                this.color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }
} 