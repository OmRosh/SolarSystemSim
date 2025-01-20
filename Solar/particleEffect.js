class ParticleEffect {
    constructor(x, y, color, type, lifetime, isExplosion = false, options = {}) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.lifetime = lifetime;
        this.age = 0;
        this.isExplosion = isExplosion;
        
        // New explosion-specific properties
        this.size = options.size || 3;
        this.speed = options.speed || 1;
        this.fadeToColor = options.fadeToColor;
        this.isFlash = options.isFlash || false;
        this.isRing = options.isRing || false;
        this.ringDelay = options.ringDelay || 0;
        
        if (isExplosion) {
            this.angle = options.angle || Math.random() * Math.PI * 2;
        }
        
        this.targetX = options.targetX;
        this.targetY = options.targetY;
    }

    update() {
        if (this.ringDelay > 0) {
            this.ringDelay--;
            return true;
        }
        
        this.age++;
        
        if (this.isExplosion) {
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
        }
        
        return this.age < this.lifetime;
    }

    draw(ctx) {
        if (this.ringDelay > 0) return;
        
        const opacity = 1 - (this.age / this.lifetime);
        let currentColor = this.color;
        
        if (this.fadeToColor) {
            const fadeProgress = this.age / this.lifetime;
            if (fadeProgress > 0.1) {
                currentColor = this.fadeToColor;
            }
        }
        
        if (this.isFlash) {
            ctx.globalCompositeOperation = 'screen';
            const flashOpacity = Math.max(0, 1 - (this.age / (this.lifetime * 0.2)));
            ctx.fillStyle = this.color + Math.floor(flashOpacity * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * (1 + this.age/20), 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (this.isRing) {
            const progress = this.age / this.lifetime;
            const ringSize = this.size * (1 + progress * 4);
            ctx.strokeStyle = this.color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
            ctx.lineWidth = Math.max(1, this.size * 0.5 * (1 - progress));
            ctx.beginPath();
            ctx.arc(this.x, this.y, ringSize, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.fillStyle = currentColor + Math.floor(opacity * 255).toString(16).padStart(2, '0');
            ctx.arc(this.x, this.y, this.size * (opacity * 0.8 + 0.2), 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (this.isFlash) {
            ctx.globalCompositeOperation = 'source-over';
        }
    }
} 