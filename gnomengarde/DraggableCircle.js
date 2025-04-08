class DraggableCircle {
	constructor(grid, x, y, isStatic = false, id = null) {
		this.grid = grid;
		this.radius = grid.radius;
		this.x = x;
		this.y = y;
		this.isStatic = isStatic;
		this.id = id || `circle-${Math.random().toString(36).substr(2, 5)}`;
		this.element = this.createCircleElement();
		this.grid.occupiedHexes.add(`${x},${y}`);
		if (!isStatic) {
			this.setupEventListeners();
		}
		this.element.setAttribute("data-circle-id", this.id);
	}

	createCircleElement() {
		const circle = document.createElement("div");
		circle.classList.add("circle");
		circle.style.width = `${this.radius * 2}px`;
		circle.style.height = `${this.radius * 2}px`;
		circle.style.left = `${this.x - this.radius}px`;
		circle.style.top = `${this.y - this.radius}px`;
		circle.style.backgroundColor = this.isStatic ? "#999999" : "#3498db";
		circle.style.borderRadius = "50%";
		circle.style.position = "absolute";
		circle.style.cursor = this.isStatic ? "default" : "move";
		// Add transition for smooth movement
		circle.style.transition = "left 0.3s ease-out, top 0.3s ease-out";
		this.grid.container.appendChild(circle);
		if (this.isStatic) {
			circle.classList.add("is-static");
		}
		return circle;
	}

	setupEventListeners() {
		this.element.addEventListener("mousedown", this.startDrag.bind(this));
		this.element.addEventListener("touchstart", this.startDrag.bind(this), { passive: false });
	}

	startDrag(event) {
		if (this.isStatic) return;
		event.preventDefault();

		// Clear any existing position markers
		this.clearPositionMarkers();

		const originalX = parseInt(this.element.style.left) + this.radius;
		const originalY = parseInt(this.element.style.top) + this.radius;
		const originalHex = this.grid.findClosestHex(originalX, originalY);
		const startHexKey = `${originalHex.x},${originalHex.y}`;
		this.originalPosition = { x: originalHex.x, y: originalHex.y }; // Store original position

		const offsetX = (event.clientX || event.touches[0].clientX) - this.element.offsetLeft - this.radius;
		const offsetY = (event.clientY || event.touches[0].clientY) - this.element.offsetTop - this.radius;

		let line;
		let lastHexKey = startHexKey;
		let isValidDrop = false;

		// Replace the createLine function with this:
		const createLine = () => {
			const svg = document.querySelector(".grid-overlay");

			// Remove any existing lines first
			const existingLines = svg.querySelectorAll(".drag-line");
			existingLines.forEach((line) => line.remove());

			// Create new line
			line = document.createElementNS("http://www.w3.org/2000/svg", "path");
			line.setAttribute("class", "drag-line"); // Changed from generic 'line'

			// Create gradient if it doesn't exist
			if (!document.querySelector("#magicGradient")) {
				const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
				const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
				gradient.setAttribute("id", "magicGradient");
				gradient.setAttribute("x1", "0%");
				gradient.setAttribute("y1", "0%");
				gradient.setAttribute("x2", "100%");
				gradient.setAttribute("y2", "100%");

				const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
				stop1.setAttribute("offset", "0%");
				stop1.setAttribute("stop-color", "#d4af37");

				const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
				stop2.setAttribute("offset", "100%");
				stop2.setAttribute("stop-color", "#f0e68c");

				gradient.appendChild(stop1);
				gradient.appendChild(stop2);
				defs.appendChild(gradient);
				svg.appendChild(defs);
			}

			line = document.createElementNS("http://www.w3.org/2000/svg", "path");
			line.setAttribute("stroke", "url(#magicGradient)");
			line.setAttribute("stroke-width", 4);
			line.setAttribute("fill", "none");
			line.setAttribute("stroke-dasharray", "10,5");
			line.setAttribute("filter", "url(#glow)");
			svg.appendChild(line);

			// Add pulsing circle at origin
			const originCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
			originCircle.setAttribute("cx", originalX);
			originCircle.setAttribute("cy", originalY);
			originCircle.setAttribute("r", 8);
			originCircle.setAttribute("fill", "url(#magicGradient)");
			originCircle.setAttribute("class", "origin-pulse");
			svg.appendChild(originCircle);

			// Animation for origin circle
			const pulseInterval = setInterval(() => {
				const currentR = parseInt(originCircle.getAttribute("r"));
				originCircle.setAttribute("r", currentR === 8 ? 10 : 8);
			}, 500);

			return () => {
				clearInterval(pulseInterval);
				originCircle.remove();
			};
		};

		const moveCircle = (moveEvent) => {
			if (!line) createLine();

			// Disable transition during dragging for immediate response
			this.element.style.transition = "none";

			const clientX = moveEvent.clientX || moveEvent.touches[0].clientX;
			const clientY = moveEvent.clientY || moveEvent.touches[0].clientY;
			const mouseX = clientX - offsetX;
			const mouseY = clientY - offsetY;
			const targetHex = this.grid.findClosestHex(mouseX, mouseY);
			const targetHexKey = `${targetHex.x},${targetHex.y}`;

			// Calculate current position from element style
			const currentX = parseInt(this.element.style.left) + this.radius;
			const currentY = parseInt(this.element.style.top) + this.radius;
			const currentHex = this.grid.findClosestHex(currentX, currentY);
			const currentHexKey = `${currentHex.x},${currentHex.y}`;

			line.setAttribute("x2", currentX);
			line.setAttribute("y2", currentY);

			if (targetHex.x !== currentHex.x || targetHex.y !== currentHex.y) {
				this.grid.occupiedHexes.delete(currentHexKey);

				if (this.grid.isValidMove(currentHex, targetHex, this.id)) {
					if (currentHexKey !== targetHexKey) {
						this.logMovement(currentHex, targetHex);
					}

					this.element.style.left = `${targetHex.x - this.radius}px`;
					this.element.style.top = `${targetHex.y - this.radius}px`;
					this.grid.occupiedHexes.add(targetHexKey);
					line.setAttribute("x2", targetHex.x);
					line.setAttribute("y2", targetHex.y);
					lastHexKey = targetHexKey;
				} else {
					this.grid.occupiedHexes.add(currentHexKey);
					this.showBlockedMovement(currentHex, targetHex);
				}
			}
		};

		const stopDrag = () => {
			// Remove the drag line immediately
			if (line) {
				line.remove();
				line = null;
			}

			// Remove any remaining sparkles or effects
			const svg = document.querySelector(".grid-overlay");
			const effects = svg.querySelectorAll(".sparkle-group, .origin-pulse");
			effects.forEach((effect) => effect.remove());

			document.removeEventListener("mousemove", moveCircle);
			document.removeEventListener("mouseup", stopDrag);
			document.removeEventListener("touchmove", moveCircle);
			document.removeEventListener("touchend", stopDrag);

			const currentX = parseInt(this.element.style.left) + this.radius;
			const currentY = parseInt(this.element.style.top) + this.radius;
			const currentHex = this.grid.findClosestHex(currentX, currentY);
			const currentHexKey = `${currentHex.x},${currentHex.y}`;
			const originalHexKey = `${this.originalPosition.x},${this.originalPosition.y}`;

			// Check if the circle is adjacent to at least two other circles
			const adjacentCount = this.countAdjacentCircles(currentHex);

			if (adjacentCount >= 2 && currentHexKey !== originalHexKey) {
				// Valid drop - keep it in the new position
				this.grid.occupiedHexes.delete(originalHexKey);
				this.grid.occupiedHexes.add(currentHexKey);
				this.showValidDropFeedback();

				// Increment move counter
				this.grid.moveCount++;
				this.trackMoveCounter(); // Internal tracking only
				this.trackHexagonCount(); // Internal tracking only
			} else {
				// Invalid drop - animate return to original position
				this.element.style.transition = "left 0.5s ease-out, top 0.5s ease-out";
				this.element.style.left = `${this.originalPosition.x - this.radius}px`;
				this.element.style.top = `${this.originalPosition.y - this.radius}px`;

				// After animation completes, remove transition for dragging
				setTimeout(() => {
					this.element.style.transition = "none";
				}, 500);

				// Update occupied hexes
				if (currentHexKey !== originalHexKey) {
					this.grid.occupiedHexes.delete(currentHexKey);
				}
				this.grid.occupiedHexes.add(originalHexKey);
				this.showInvalidDropFeedback();
			}
		};

		document.addEventListener("mousemove", moveCircle);
		document.addEventListener("mouseup", stopDrag);
		document.addEventListener("touchmove", moveCircle, { passive: false });
		document.addEventListener("touchend", stopDrag);
	}

	clearPositionMarkers() {
		const svg = document.querySelector(".grid-overlay");
		const markers = svg.querySelectorAll(".position-marker");
		markers.forEach((marker) => marker.remove());
	}

	countAdjacentCircles(hex) {
		let count = 0;
		const adjacentDist = this.grid.hexRadius * 1.8; // Slightly more than exact distance to account for rounding

		for (const pos of this.grid.occupiedHexes) {
			if (pos === `${hex.x},${hex.y}`) continue; // Skip self

			const [x, y] = pos.split(",").map(Number);
			const distance = Math.hypot(hex.x - x, hex.y - y);

			if (distance <= adjacentDist) {
				count++;
				if (count >= 2) break; // No need to count further if we already have 2
			}
		}

		return count;
	}

	showValidDropFeedback() {
		const circle = this.element;
		circle.style.boxShadow = "0 0 10px 5px rgba(76, 175, 80, 0.5)";
		circle.style.animation = "validMove 0.5s ease-out";
		setTimeout(() => {
			circle.style.boxShadow = "none";
			circle.style.animation = "";
		}, 500);
	}

	showInvalidDropFeedback() {
		const circle = this.element;
		circle.style.boxShadow = "0 0 10px 5px rgba(255, 0, 0, 0.5)";
		circle.style.animation = "invalidMove 0.5s ease-out";
		setTimeout(() => {
			circle.style.boxShadow = "none";
			circle.style.animation = "";
		}, 500);
	}

	// Track move counter internally, but don't display
	trackMoveCounter() {
		console.log(`Move count: ${this.grid.moveCount}`);
	}

	logMovement(fromHex, toHex) {
		const fromCoords = `(${Math.round(fromHex.x)}, ${Math.round(fromHex.y)})`;
		const toCoords = `(${Math.round(toHex.x)}, ${Math.round(toHex.y)})`;
		console.log(`Circle ${this.id} moved from ${fromCoords} to ${toCoords}`);
		this.showMovementFeedback(fromHex, toHex);
	}

	showMovementFeedback(fromHex, toHex) {
		const svg = document.querySelector(".grid-overlay");
		const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");

		// Create a curved path for more organic feel
		const midX = (fromHex.x + toHex.x) / 2 + (Math.random() * 20 - 10);
		const midY = (fromHex.y + toHex.y) / 2 + (Math.random() * 20 - 10);
		const pathData = `M${fromHex.x},${fromHex.y} Q${midX},${midY} ${toHex.x},${toHex.y}`;

		arrow.setAttribute("d", pathData);
		arrow.setAttribute("stroke", "url(#magicGradient)");
		arrow.setAttribute("stroke-width", 3);
		arrow.setAttribute("fill", "none");
		arrow.setAttribute("stroke-dasharray", "5,3");
		arrow.setAttribute("class", "movement-arrow");

		// Add sparkle effect
		const sparkles = document.createElementNS("http://www.w3.org/2000/svg", "g");
		sparkles.setAttribute("class", "sparkle-group");

		// Create multiple sparkles along the path
		for (let i = 0; i < 8; i++) {
			const sparkle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
			sparkle.setAttribute("r", 2);
			sparkle.setAttribute("fill", "#fff");
			sparkle.setAttribute("class", "sparkle");
			sparkles.appendChild(sparkle);
		}

		svg.appendChild(arrow);
		svg.appendChild(sparkles);

		// Animate the sparkles along the path
		const pathLength = arrow.getTotalLength();
		const sparkleElements = sparkles.querySelectorAll(".sparkle");

		sparkleElements.forEach((sparkle, index) => {
			const point = arrow.getPointAtLength((index / sparkleElements.length) * pathLength);
			sparkle.setAttribute("cx", point.x);
			sparkle.setAttribute("cy", point.y);
		});

		setTimeout(() => {
			arrow.remove();
			sparkles.remove();
		}, 800); // Reduced from 1000ms
	}

	showBlockedMovement(fromHex, toHex) {
		const svg = document.querySelector(".grid-overlay");

		// Create jagged lightning-like path
		const blockedLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
		const segments = 8;
		let pathData = `M${fromHex.x},${fromHex.y}`;

		for (let i = 1; i <= segments; i++) {
			const ratio = i / segments;
			const x = fromHex.x + (toHex.x - fromHex.x) * ratio;
			const y = fromHex.y + (toHex.y - fromHex.y) * ratio;
			const offsetX = (Math.random() * 15 - 7.5) * (1 - ratio);
			const offsetY = (Math.random() * 15 - 7.5) * (1 - ratio);
			pathData += ` L${x + offsetX},${y + offsetY}`;
		}

		blockedLine.setAttribute("d", pathData);
		blockedLine.setAttribute("stroke", "#c13c2e");
		blockedLine.setAttribute("stroke-width", 3);
		blockedLine.setAttribute("fill", "none");
		blockedLine.setAttribute("stroke-dasharray", "5,2");
		blockedLine.setAttribute("class", "blocked-movement");
		blockedLine.setAttribute("filter", "url(#fireGlow)");

		// Add impact effect
		const impact = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		impact.setAttribute("cx", toHex.x);
		impact.setAttribute("cy", toHex.y);
		impact.setAttribute("r", 0);
		impact.setAttribute("fill", "none");
		impact.setAttribute("stroke", "#c13c2e");
		impact.setAttribute("stroke-width", 2);
		impact.setAttribute("class", "impact-effect");

		svg.appendChild(blockedLine);
		svg.appendChild(impact);

		// Animate impact
		impact.animate(
			[
				{ r: 0, opacity: 1 },
				{ r: 15, opacity: 0 },
			],
			{
				duration: 500,
				easing: "ease-out",
			}
		);

		setTimeout(() => {
			blockedLine.remove();
			impact.remove();
		}, 500);
	}

	trackHexagonCount() {
		const hexagonCount = this.grid.countHexagonFigures();
		console.log(`Hexagon count: ${hexagonCount}`);

		// Check if we need to reset (moves = 3 and hexagons = 1)
		if (this.grid.moveCount === 3 && hexagonCount === 1) {
			setTimeout(() => {
				this.grid.resetAllCircles();
			}, 500);
		}
		// Add new condition for changing indicators to green
		else if (this.grid.moveCount === 3 && hexagonCount === 2) {
			this.grid.updateResetIndicators(true); // true means success condition
		}
	}
}
