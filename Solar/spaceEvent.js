class SpaceEvent {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.type = this.getRandomType();
        this.initialize();
        this.isFinished = false;
    }

    getRandomType() {
        const types = ['rocket', 'astronaut', 'meteor'];
        return types[Math.floor(Math.random() * types.length)];
    }

    initialize() {
        switch(this.type) {
            case 'rocket':
                this.x = -50;
                this.y = this.canvas.height + 30;
                this.speed = 4;
                this.rotation = -Math.PI/4;
                this.flameSize = 0;
                break;
                
            case 'astronaut':
                this.x = -50;
                this.y = 100 + Math.random() * (this.canvas.height/2);
                this.speed = 1;
                this.wobble = 0;
                this.rotation = 0;
                this.armAngle = 0;
                break;
                
            case 'meteor':
                this.x = -50;
                this.y = Math.random() * this.canvas.height/3;
                this.speed = 6;
                this.meteorCount = 5 + Math.floor(Math.random() * 5);
                this.meteors = Array(this.meteorCount).fill().map(() => ({
                    x: this.x + Math.random() * 100,
                    y: this.y + Math.random() * 100,
                    size: 3 + Math.random() * 4,
                    speed: 5 + Math.random() * 2,
                    trail: []
                }));
                break;
        }
    }

    update() {
        switch(this.type) {
            case 'rocket':
                this.x += this.speed * Math.cos(-this.rotation);
                this.y += this.speed * Math.sin(-this.rotation);
                this.flameSize = Math.random() * 10;
                this.isFinished = this.y < -50 || this.x > this.canvas.width + 50;
                break;
                
            case 'astronaut':
                this.x += this.speed;
                this.wobble += 0.05;
                this.y += Math.sin(this.wobble) * 0.5;
                this.rotation = Math.sin(this.wobble * 0.5) * 0.2;
                this.armAngle = Math.sin(this.wobble) * 0.3;
                this.isFinished = this.x > this.canvas.width + 50;
                break;
                
            case 'meteor':
                this.meteors.forEach(m => {
                    m.trail.unshift({x: m.x, y: m.y});
                    if (m.trail.length > 10) m.trail.pop();
                    m.x += m.speed;
                    m.y += m.speed * 0.5;
                });
                this.isFinished = this.meteors.every(m => m.x > this.canvas.width + 50);
                break;
        }
    }

    draw(ctx) {
        ctx.save();
        
        switch(this.type) {
            case 'rocket':
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                
                // Draw rocket body
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(0, -25);
                ctx.lineTo(8, 0);
                ctx.lineTo(8, 15);
                ctx.lineTo(-8, 15);
                ctx.lineTo(-8, 0);
                ctx.closePath();
                ctx.fill();
                
                // Windows
                ctx.fillStyle = '#44aaff';
                ctx.beginPath();
                ctx.arc(0, -5, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw flame
                ctx.fillStyle = '#ff4400';
                ctx.beginPath();
                ctx.moveTo(-8, 15);
                ctx.lineTo(8, 15);
                ctx.lineTo(0, 30 + this.flameSize);
                ctx.closePath();
                ctx.fill();
                break;

            case 'astronaut':
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                
                // Draw alien body (green)
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, 15, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw alien head
                ctx.fillStyle = '#44ff44';
                ctx.beginPath();
                ctx.arc(0, -2, 10, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw large black eyes
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.ellipse(-4, -4, 3, 5, Math.PI/4, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(4, -4, 3, 5, -Math.PI/4, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw backpack
                ctx.fillStyle = '#cccccc';
                ctx.fillRect(-12, -8, 8, 16);
                
                // Draw arms
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-15, 0);
                ctx.lineTo(-25, Math.sin(this.armAngle) * 5);
                ctx.moveTo(15, 0);
                ctx.lineTo(25, Math.sin(-this.armAngle) * 5);
                ctx.stroke();
                break;

            case 'meteor':
                this.meteors.forEach(m => {
                    // Draw trail
                    ctx.beginPath();
                    ctx.moveTo(m.x, m.y);
                    m.trail.forEach((pos, i) => {
                        ctx.lineTo(pos.x, pos.y);
                    });
                    ctx.strokeStyle = '#ff440044';
                    ctx.lineWidth = m.size;
                    ctx.stroke();
                    
                    // Draw meteor
                    ctx.fillStyle = '#ffaa44';
                    ctx.beginPath();
                    ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
                    ctx.fill();
                });
                break;
        }
        
        ctx.restore();
    }
} 