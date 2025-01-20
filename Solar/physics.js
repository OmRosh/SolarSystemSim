class Physics {
    static G = 0.001; // Increased gravitational constant for stronger effect

    // Hierarchy values for each type
    static HIERARCHY = {
        'ice': 1,
        'rocky': 2,
        'gas': 3,
        'star': 4,
        'redGiant': 5,
        'blueGiant': 6,
        'neutron': 7,
        'blackHole': 8,
        'quasar': 9
    };

    static applyGravity(body1, body2, allBodies) {
        if (!body1 || !body2 || body1.id === body2.id) return;
        if (body1.isDestroyed || body2.isDestroyed) return;

        const dx = body2.x - body1.x;
        const dy = body2.y - body1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;

        // Check if either body is already in a stable orbit
        if (body1.orbitingAround || body2.orbitingAround) {
            // Only break orbit if a higher gravity object is very close
            const higherGravityNearby = this.findNearestHigherGravityBody(
                [body1.orbitingAround || body1, body2.orbitingAround || body2], 
                allBodies
            );
            
            if (higherGravityNearby) {
                const dist1 = Math.sqrt(Math.pow(higherGravityNearby.x - body1.x, 2) + Math.pow(higherGravityNearby.y - body1.y, 2));
                const dist2 = Math.sqrt(Math.pow(higherGravityNearby.x - body2.x, 2) + Math.pow(higherGravityNearby.y - body2.y, 2));
                
                // Only break orbit if extremely close to a much higher gravity object
                if (dist1 <= higherGravityNearby.radius * 1.5 && 
                    body1.gravity < higherGravityNearby.gravity * 0.5 &&
                    (!body1.orbitingAround || higherGravityNearby.gravity > body1.orbitingAround.gravity * 2)) {
                    body1.orbitingAround = null;
                    body1.orbitState = null;
                }
                if (dist2 <= higherGravityNearby.radius * 1.5 && 
                    body2.gravity < higherGravityNearby.gravity * 0.5 &&
                    (!body2.orbitingAround || higherGravityNearby.gravity > body2.orbitingAround.gravity * 2)) {
                    body2.orbitingAround = null;
                    body2.orbitState = null;
                }
            }
            
            // If still in orbit, maintain it
            if (body1.orbitingAround || body2.orbitingAround) {
                if (body1.orbitingAround === body2 && body2.orbitingAround === body1) {
                    this.handleDualOrbit(body1, body2, distance);
                }
                // Maintain existing orbits
                if (body1.orbitingAround) {
                    this.handleOrbitTransition(body1.orbitingAround, body1, distance);
                }
                if (body2.orbitingAround) {
                    this.handleOrbitTransition(body2.orbitingAround, body2, distance);
                }
                return;
            }
        }

        // If both bodies are orbiting each other, maintain dual orbit
        if ((body1.orbitingAround === body2 && body2.orbitingAround === body1)) {
            if (body1.gravity === body2.gravity) {
                this.handleDualOrbit(body1, body2, distance);
            }
            return;
        }
        
        // If either body is already orbiting something else, let it continue
        if ((body1.orbitingAround && body1.orbitingAround !== body2) || 
            (body2.orbitingAround && body2.orbitingAround !== body1)) {
            return;
        }

        // Check for higher gravity influence first
        const higherGravityBody = this.findHigherGravityInfluencer([body1, body2], allBodies);
        if (higherGravityBody) {
            // Both bodies should orbit the higher gravity body
            this.handleOrbitTransition(higherGravityBody, body1, distance);
            this.handleOrbitTransition(higherGravityBody, body2, distance);
            return;
        }

        // Special handling for same gravity bodies
        if (body1.gravity === body2.gravity && distance < body1.gravityInfluenceRadius) {
            this.handleDualOrbit(body1, body2, distance);
            return;
        }

        // Handle normal gravity influence
        const influencer = this.getHighestGravityInfluencer(body1, body2);
        if (influencer) {
            const influenced = influencer === body1 ? body2 : body1;
            const targetRadius = this.getTargetOrbitalRadius(influencer);
            
            // Calculate orbit number for this influenced body
            const existingOrbits = allBodies.filter(b => b.orbitingAround === influencer).length;
            const orbitNumber = existingOrbits + 1;
            
            // Start orbit when object reaches the second ring
            if (distance <= targetRadius) {
                this.handleOrbitTransition(influencer, influenced, distance, orbitNumber);
                return;
            }
        }

        // Apply basic gravitational force when not orbiting
        if (!body1.orbitingAround && !body2.orbitingAround) {
            const force = this.G * (body1.mass * body2.mass) / (distance * distance);
            const angle = Math.atan2(dy, dx);
            
            const forceX = Math.cos(angle) * force;
            const forceY = Math.sin(angle) * force;
            
            body1.vx += (forceX / body1.mass) * 1.5;
            body1.vy += (forceY / body1.mass) * 1.5;
            body2.vx -= (forceX / body2.mass) * 1.5;
            body2.vy -= (forceY / body2.mass) * 1.5;

            body1.x += body1.vx;
            body1.y += body1.vy;
            body2.x += body2.vx;
            body2.y += body2.vy;
        }
    }

    static getHighestGravityInfluencer(body1, body2) {
        const dx = body2.x - body1.x;
        const dy = body2.y - body1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if within influence radius
        if (distance > body1.gravityInfluenceRadius && distance > body2.gravityInfluenceRadius) {
            return null;
        }

        // Always return the higher gravity body as the influencer
        if (body1.gravity === body2.gravity) {
            return null; // Same gravity bodies don't influence each other
        }

        // Return the body with higher gravity
        return body1.gravity > body2.gravity ? body1 : body2;
    }

    static getRootBody(body) {
        let current = body;
        while (current.orbitingAround) {
            current = current.orbitingAround;
        }
        return current;
    }

    static handleOrbitTransition(influencer, influenced, distance, orbitNumber = 1) {
        // Only allow orbiting if influenced has lower gravity
        if (influenced.gravity >= influencer.gravity) {
            return;
        }

        // Handle black hole consumption
        if (influencer.type === 'blackHole' && influenced.orbitingAround === influencer) {
            if (!influenced.lastConsumptionTime || (Date.now() - influenced.lastConsumptionTime) >= 1000) {
                influenced.displayGravity = Math.max(0, influenced.displayGravity - 5);
                influenced.lastConsumptionTime = Date.now();
                
                // Explode when display gravity reaches 0
                if (influenced.displayGravity <= 0) {
                    const explosionRadius = Physics.getTargetOrbitalRadius(influenced);
                    influenced.radius = explosionRadius; // Temporarily set radius for explosion
                    influenced.particleBoost = 3; // Increase particle effect
                    influenced.explode([]); // Trigger explosion
                    return;
                }
            }
        }

        const time = Date.now() / 1000;
        const gravityRatio = influencer.gravity / influenced.gravity;
        // Fixed orbital period for more stability
        const orbitalPeriod = 10; // Constant 10-second period for all orbits
        
        // Use the second ring (solid ring) as base orbital radius
        let baseRadius = this.getTargetOrbitalRadius(influencer);

        // Adjust orbital radius based on orbit number
        const orbitalRadius = baseRadius + (orbitNumber - 1) * (influenced.radius * 2);

        // Initialize orbit state if not exists
        if (!influenced.orbitState) {
            const dx = influenced.x - influencer.x;
            const dy = influenced.y - influencer.y;
            const currentAngle = Math.atan2(dy, dx);

            influenced.orbitState = {
                startAngle: currentAngle,
                startTime: time,
                orbitalRadius: orbitalRadius,
                orbitNumber: orbitNumber,
                influencerId: influencer.id
            };
            influenced.orbitingAround = influencer;
           
            // Snap to orbit immediately
            influenced.x = influencer.x + Math.cos(currentAngle) * orbitalRadius;
            influenced.y = influencer.y + Math.sin(currentAngle) * orbitalRadius;
            
            // Reset velocities
            influenced.vx = 0;
            influenced.vy = 0;
        }

        // Force exact orbital position regardless of other forces
        const timeSinceStart = time - influenced.orbitState.startTime;
        const orbitAngle = (timeSinceStart / orbitalPeriod) * Math.PI * 2;
        const totalAngle = influenced.orbitState.startAngle + orbitAngle % (Math.PI * 2);

        // Snap to exact orbital position
        influenced.x = influencer.x + Math.cos(totalAngle) * influenced.orbitState.orbitalRadius;
        influenced.y = influencer.y + Math.sin(totalAngle) * influenced.orbitState.orbitalRadius;

        // Calculate orbital velocity
        const velocityMagnitude = (2 * Math.PI * influenced.orbitState.orbitalRadius) / (orbitalPeriod * 60);
        influenced.vx = -Math.sin(totalAngle) * velocityMagnitude;
        influenced.vy = Math.cos(totalAngle) * velocityMagnitude;

        // Add influencer's exact motion
        if (influencer.orbitingAround) {
            influenced.x += influencer.vx;
            influenced.y += influencer.vy;
        }
    }

    static findHigherGravityInfluencer(bodies, allBodies) {
        // Look through all bodies to find any with higher gravity within influence range
        const otherBodies = allBodies.filter(b => !bodies.includes(b));
        let highestGravityBody = null;
        
        for (const other of otherBodies) {
            if (other.gravity <= bodies[0].gravity) continue;
            
            // Check if both bodies are within influence range
            const dist1 = Math.sqrt(
                Math.pow(other.x - bodies[0].x, 2) + 
                Math.pow(other.y - bodies[0].y, 2)
            );
            const dist2 = Math.sqrt(
                Math.pow(other.x - bodies[1].x, 2) + 
                Math.pow(other.y - bodies[1].y, 2)
            );
            
            if (dist1 < other.gravityInfluenceRadius && dist2 < other.gravityInfluenceRadius) {
                if (!highestGravityBody || other.gravity > highestGravityBody.gravity) {
                    highestGravityBody = other;
                }
            }
        }
        
        return highestGravityBody;
    }

    static handleDualOrbit(body1, body2, distance) {
        const time = Date.now() / 1000;
        
        // Initialize orbit state if not exists
        if (!body1.orbitState || !body2.orbitState) {
            const baseAngle = Math.atan2(body2.y - body1.y, body2.x - body1.x);
            const orbitalRadius = Math.max(body1.radius, body2.radius) * 2.5;
            body1.orbitState = { 
                startAngle: baseAngle, 
                startTime: time,
                orbitalRadius: orbitalRadius
            };
            body2.orbitState = { 
                startAngle: baseAngle + Math.PI, 
                startTime: time,
                orbitalRadius: orbitalRadius
            };
            body1.orbitingAround = body2;
            body2.orbitingAround = body1;
        }

        const orbitalPeriod = body1.gravity / 35;
        const timeSinceStart = time - body1.orbitState.startTime;
        const orbitAngle = (timeSinceStart / orbitalPeriod) * Math.PI * 2 % (Math.PI * 2);

        const center = {
            x: (body1.x + body2.x) / 2,
            y: (body1.y + body2.y) / 2
        };
        
        body1.x = center.x + Math.cos(body1.orbitState.startAngle + orbitAngle) * body1.orbitState.orbitalRadius;
        body1.y = center.y + Math.sin(body1.orbitState.startAngle + orbitAngle) * body1.orbitState.orbitalRadius;
        body2.x = center.x + Math.cos(body2.orbitState.startAngle + orbitAngle) * body2.orbitState.orbitalRadius;
        body2.y = center.y + Math.sin(body2.orbitState.startAngle + orbitAngle) * body2.orbitState.orbitalRadius;
        
        // Calculate velocities
        const velocityMagnitude = (2 * Math.PI * body1.orbitState.orbitalRadius) / (orbitalPeriod * 60);
        body1.vx = -Math.sin(body1.orbitState.startAngle + orbitAngle) * velocityMagnitude;
        body1.vy = Math.cos(body1.orbitState.startAngle + orbitAngle) * velocityMagnitude;
        body2.vx = Math.sin(body2.orbitState.startAngle + orbitAngle) * velocityMagnitude;
        body2.vy = -Math.cos(body2.orbitState.startAngle + orbitAngle) * velocityMagnitude;
    }

    static getTargetOrbitalRadius(body) {
        if (body.type === 'star' || body.type === 'redGiant' || body.type === 'blueGiant') {
            return body.radius * 2.5;
        } else if (body.type === 'rocky' || body.type === 'gas' || body.type === 'ice') {
            return body.radius * 1.75;
        } else {
            return body.radius * 4;
        }
    }

    static findNearestHigherGravityBody(bodies, allBodies) {
        let nearestBody = null;
        let shortestDistance = Infinity;

        for (const other of allBodies) {
            if (!bodies.includes(other) && other.gravity > Math.max(bodies[0].gravity, bodies[1].gravity)) {
                const dist1 = Math.sqrt(Math.pow(other.x - bodies[0].x, 2) + Math.pow(other.y - bodies[0].y, 2));
                const dist2 = Math.sqrt(Math.pow(other.x - bodies[1].x, 2) + Math.pow(other.y - bodies[1].y, 2));
                const minDist = Math.min(dist1, dist2);
                
                if (minDist < shortestDistance && minDist <= other.gravityInfluenceRadius) {
                    shortestDistance = minDist;
                    nearestBody = other;
                }
            }
        }
        return nearestBody;
    }

    static forceIntoOrbit(influencer, influenced, allBodies) {
        // Don't break stable orbits unless the new influencer is much stronger
        if (influenced.orbitingAround) {
            const currentInfluencer = influenced.orbitingAround;
            if (influencer.gravity < currentInfluencer.gravity * 3) {
                return;
            }
        }

        // Clear any existing orbit state
        influenced.orbitState = null;
        influenced.orbitingAround = null;
        
        // Reset velocities
        influenced.vx = 0;
        influenced.vy = 0;

        // Calculate orbit number based on existing orbits
        const existingOrbits = allBodies.filter(b => b.orbitingAround === influencer).length;
        const orbitNumber = existingOrbits + 1;

        // Force immediate orbit
        this.handleOrbitTransition(influencer, influenced, 0, orbitNumber);
        influenced.orbitingAround = influencer;
        
        // Lock the orbit
        influenced.isLockedOrbit = true;
    }
} 