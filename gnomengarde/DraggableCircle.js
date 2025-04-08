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
		return circle;
	}

	setupEventListeners() {
		this.element.addEventListener("mousedown", this.startDrag.bind(this));
		this.element.addEventListener("touchstart", this.startDrag.bind(this), { passive: false });
	}

	startDrag(event) {
		if (this.isStatic) return;
		event.preventDefault();

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

		const createLine = () => {
			const svg = document.querySelector(".grid-overlay");
			line = document.createElementNS("http://www.w3.org/2000/svg", "line");
			line.setAttribute("stroke", "#3498db");
			line.setAttribute("stroke-width", 2);
			line.setAttribute("x1", originalX);
			line.setAttribute("y1", originalY);
			line.setAttribute("x2", originalX);
			line.setAttribute("y2", originalY);
			svg.appendChild(line);
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
			if (line) line.remove();
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
				this.updateMoveCounter();
				this.updateHexagonCount();
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
	updateMoveCounter() {
		let counterElement = document.getElementById("move-counter");
		if (!counterElement) {
			counterElement = document.createElement("div");
			counterElement.id = "move-counter";
			counterElement.style.position = "absolute";
			counterElement.style.top = "10px";
			counterElement.style.right = "10px";
			counterElement.style.padding = "5px 10px";
			counterElement.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
			counterElement.style.borderRadius = "5px";
			counterElement.style.fontFamily = "Arial, sans-serif";
			counterElement.style.fontSize = "16px";
			document.body.appendChild(counterElement);
		}
		counterElement.textContent = `Moves: ${this.grid.moveCount}`;
	}

	logMovement(fromHex, toHex) {
		const fromCoords = `(${Math.round(fromHex.x)}, ${Math.round(fromHex.y)})`;
		const toCoords = `(${Math.round(toHex.x)}, ${Math.round(toHex.y)})`;
		console.log(`Circle ${this.id} moved from ${fromCoords} to ${toCoords}`);
		this.showMovementFeedback(fromHex, toHex);
	}

	showMovementFeedback(fromHex, toHex) {
		const svg = document.querySelector(".grid-overlay");
		const arrow = document.createElementNS("http://www.w3.org/2000/svg", "line");
		arrow.setAttribute("stroke", "#4CAF50");
		arrow.setAttribute("stroke-width", 2);
		arrow.setAttribute("stroke-dasharray", "5,5");
		arrow.setAttribute("x1", fromHex.x);
		arrow.setAttribute("y1", fromHex.y);
		arrow.setAttribute("x2", toHex.x);
		arrow.setAttribute("y2", toHex.y);
		arrow.setAttribute("class", "movement-arrow");
		svg.appendChild(arrow);

		setTimeout(() => {
			arrow.remove();
		}, 1000);
	}

	showBlockedMovement(fromHex, toHex) {
		const svg = document.querySelector(".grid-overlay");
		const blockedLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
		blockedLine.setAttribute("stroke", "#ff0000");
		blockedLine.setAttribute("stroke-width", 2);
		blockedLine.setAttribute("x1", fromHex.x);
		blockedLine.setAttribute("y1", fromHex.y);
		blockedLine.setAttribute("x2", toHex.x);
		blockedLine.setAttribute("y2", toHex.y);
		blockedLine.setAttribute("class", "blocked-movement");
		svg.appendChild(blockedLine);

		setTimeout(() => {
			blockedLine.remove();
		}, 500);
	}

	updateHexagonCount() {
		const hexagonCount = this.grid.countHexagonFigures();
		let counterElement = document.getElementById("hexagon-counter");

		if (!counterElement) {
			counterElement = document.createElement("div");
			counterElement.id = "hexagon-counter";
			counterElement.style.position = "absolute";
			counterElement.style.top = "40px";
			counterElement.style.right = "10px";
			counterElement.style.padding = "5px 10px";
			counterElement.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
			counterElement.style.borderRadius = "5px";
			counterElement.style.fontFamily = "Arial, sans-serif";
			counterElement.style.fontSize = "16px";
			document.body.appendChild(counterElement);
		}

		counterElement.textContent = `Hexagons: ${hexagonCount}`;

		// Check if we need to reset (moves = 3 and hexagons = 1)
		if (this.grid.moveCount === 3 && hexagonCount === 1) {
			setTimeout(() => {
				this.grid.resetAllCircles();
			}, 500);
		}
	}
}
