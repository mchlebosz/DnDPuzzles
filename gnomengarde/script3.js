class HexGrid {
	constructor(containerId, options = {}) {
		this.container = document.getElementById(containerId);
		this.radius = options.radius || 30;
		this.hexRadius = options.hexRadius || 35;
		this.columns = options.columns || 14;
		this.rows = options.rows || 14;
		this.occupiedHexes = new Set();
		this.hexagons = this.generateHexGrid();
	}

	generateHexGrid() {
		const grid = [];
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.columns; col++) {
				let x = col * this.hexRadius * 1.5;
				let y = row * this.hexRadius * Math.sqrt(3);

				if (col % 2 === 1) {
					y += (this.hexRadius * Math.sqrt(3)) / 2;
				}

				grid.push({ x, y });
			}
		}
		return grid;
	}

	findClosestHex(x, y) {
		let closestHex = null;
		let minDistance = Infinity;

		for (const hex of this.hexagons) {
			const distance = Math.hypot(x - hex.x, y - hex.y);
			if (distance < minDistance) {
				minDistance = distance;
				closestHex = hex;
			}
		}

		return closestHex;
	}

	drawGrid() {
		const svg = document.querySelector(".grid-overlay");
		if (!svg) return;

		while (svg.firstChild) {
			svg.removeChild(svg.firstChild);
		}

		this.hexagons.forEach((hex) => {
			const points = [];
			for (let i = 0; i < 6; i++) {
				const angle = (i * Math.PI) / 3;
				const px = hex.x + this.hexRadius * Math.cos(angle);
				const py = hex.y + this.hexRadius * Math.sin(angle);
				points.push(`${px},${py}`);
			}

			const hexagon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
			hexagon.setAttribute("points", points.join(" "));
			hexagon.setAttribute("fill", "none");
			hexagon.setAttribute("stroke", "#ddd");
			hexagon.setAttribute("stroke-width", 1);
			svg.appendChild(hexagon);
		});
	}

	isValidMove(startHex, endHex, movingCircleId) {
		const targetKey = `${endHex.x},${endHex.y}`;
		if (this.occupiedHexes.has(targetKey)) return false;

		// Get all other circle positions
		const otherCircles = Array.from(this.occupiedHexes)
			.map((pos) => {
				const [x, y] = pos.split(",").map(Number);
				return { x, y };
			})
			.filter((pos) => !(pos.x === startHex.x && pos.y === startHex.y));

		// Check if movement would pass through a narrow angle (120°)
		if (this.formsNarrowAngle(startHex, endHex, otherCircles)) {
			return false;
		}

		// Check path for other obstacles
		const dx = endHex.x - startHex.x;
		const dy = endHex.y - startHex.y;
		const steps = Math.max(Math.abs(dx / (this.hexRadius * 1.5)), Math.abs(dy / (this.hexRadius * Math.sqrt(3))));

		for (let i = 1; i < steps; i++) {
			const ratio = i / steps;
			const ix = startHex.x + dx * ratio;
			const iy = startHex.y + dy * ratio;
			const iHex = this.findClosestHex(ix, iy);
			const iKey = `${iHex.x},${iHex.y}`;

			if (iKey !== targetKey && this.occupiedHexes.has(iKey)) {
				return false;
			}
		}

		return true;
	}

	formsNarrowAngle(movingCircle, targetPos, otherCircles) {
		// We need at least 2 other circles to form an angle
		if (otherCircles.length < 2) return false;

		for (let i = 0; i < otherCircles.length; i++) {
			for (let j = i + 1; j < otherCircles.length; j++) {
				const circle1 = otherCircles[i];
				const circle2 = otherCircles[j];

				// Check if both circles are adjacent (distance ≤ 4 * radius)
				const dist1 = Math.hypot(circle1.x - movingCircle.x, circle1.y - movingCircle.y);
				const dist2 = Math.hypot(circle2.x - movingCircle.x, circle2.y - movingCircle.y);

				if (dist1 > this.radius * 3 || dist2 > this.radius * 3) {
					continue; // Skip if either circle isn't adjacent
				}

				// Calculate vectors
				const vec1 = {
					x: circle1.x - movingCircle.x,
					y: circle1.y - movingCircle.y,
				};
				const vec2 = {
					x: circle2.x - movingCircle.x,
					y: circle2.y - movingCircle.y,
				};
				const moveVec = {
					x: targetPos.x - movingCircle.x,
					y: targetPos.y - movingCircle.y,
				};

				// Calculate angles between circles
				const angleBetween = this.calculateAngle(vec1, vec2);
				const angle1 = this.calculateAngle(vec1, moveVec);
				const angle2 = this.calculateAngle(vec2, moveVec);

				// Check if we're moving into a 120° angle
				const is120DegreeAngle = Math.abs(angleBetween - 120) < 5; // 15° tolerance
				const isMovingIntoAngle = angle1 + angle2 - angleBetween < 5; // Moving between the two circles

				if (is120DegreeAngle && isMovingIntoAngle) {
					return true;
				}
			}
		}
		return false;
	}

	calculateAngle(vec1, vec2) {
		const dot = vec1.x * vec2.x + vec1.y * vec2.y;
		const mag1 = Math.hypot(vec1.x, vec1.y);
		const mag2 = Math.hypot(vec2.x, vec2.y);
		const angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
		return angle;
	}
}

class DraggableCircle {
	constructor(grid, x, y, id = null) {
		this.grid = grid;
		this.radius = grid.radius;
		this.x = x;
		this.y = y;
		this.id = id || `circle-${Math.random().toString(36).substr(2, 5)}`;
		this.element = this.createCircleElement();
		this.grid.occupiedHexes.add(`${x},${y}`);
		this.setupEventListeners();
		this.element.setAttribute("data-circle-id", this.id);
	}

	createCircleElement() {
		const circle = document.createElement("div");
		circle.classList.add("circle");
		circle.style.width = `${this.radius * 2}px`;
		circle.style.height = `${this.radius * 2}px`;
		circle.style.left = `${this.x - this.radius}px`;
		circle.style.top = `${this.y - this.radius}px`;
		circle.style.backgroundColor = this.getColorFromId(this.id);
		circle.style.borderRadius = "50%";
		circle.style.position = "absolute";
		circle.style.cursor = "move";
		this.grid.container.appendChild(circle);
		return circle;
	}

	getColorFromId(id) {
		const colorMap = {
			"red-circle": "#ff0000",
			"blue-circle": "#0000ff",
			"green-circle": "#00ff00",
			"yellow-circle": "#ffff00",
			"purple-circle": "#800080",
			"orange-circle": "#ffa500",
			"pink-circle": "#ffc0cb",
		};
		return colorMap[id] || "#" + Math.floor(Math.random() * 16777215).toString(16);
	}

	setupEventListeners() {
		this.element.addEventListener("mousedown", this.startDrag.bind(this));
		this.element.addEventListener("touchstart", this.startDrag.bind(this), { passive: false });
	}

	startDrag(event) {
		event.preventDefault();

		const originalX = parseInt(this.element.style.left) + this.radius;
		const originalY = parseInt(this.element.style.top) + this.radius;
		const originalHex = this.grid.findClosestHex(originalX, originalY);
		const startHexKey = `${originalHex.x},${originalHex.y}`;

		const offsetX = (event.clientX || event.touches[0].clientX) - this.element.offsetLeft - this.radius;
		const offsetY = (event.clientY || event.touches[0].clientY) - this.element.offsetTop - this.radius;

		let line;
		let lastHexKey = startHexKey;

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

			const clientX = moveEvent.clientX || moveEvent.touches[0].clientX;
			const clientY = moveEvent.clientY || moveEvent.touches[0].clientY;
			const mouseX = clientX - offsetX;
			const mouseY = clientY - offsetY;
			const targetHex = this.grid.findClosestHex(mouseX, mouseY);
			const targetHexKey = `${targetHex.x},${targetHex.y}`;

			const currentX = parseInt(this.element.style.left) + this.radius;
			const currentY = parseInt(this.element.style.top) + this.radius;
			const currentHex = this.grid.findClosestHex(currentX, currentY);
			const currentHexKey = `${currentHex.x},${currentHex.y}`;

			line.setAttribute("x2", currentX);
			line.setAttribute("y2", currentY);

			if (targetHex.x !== currentHex.x || targetHex.y !== currentHex.y) {
				this.grid.occupiedHexes.delete(currentHexKey);

				// Pass the circle ID to isValidMove
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
		};

		document.addEventListener("mousemove", moveCircle);
		document.addEventListener("mouseup", stopDrag);
		document.addEventListener("touchmove", moveCircle, { passive: false });
		document.addEventListener("touchend", stopDrag);
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
}

// Initialize the game
const grid = new HexGrid("container", {
	radius: 30,
	hexRadius: 35,
	columns: 14,
	rows: 14,
});

grid.drawGrid();

// Create initial circles with IDs
[
	{ col: 6, row: 20, id: "red-circle" },
	{ col: 7, row: 25, id: "blue-circle" },
	{ col: 5, row: 25, id: "green-circle" },
	{ col: 5, row: 35, id: "yellow-circle" },
	{ col: 7, row: 35, id: "purple-circle" },
	{ col: 6, row: 50, id: "orange-circle" },
	{ col: 5, row: 85, id: "pink-circle" },
].forEach((circle) => {
	new DraggableCircle(grid, grid.hexagons[circle.col].x, grid.hexagons[circle.row].y, circle.id);
});
