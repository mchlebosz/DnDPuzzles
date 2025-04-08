class HexGrid {
	constructor(containerId, options = {}) {
		this.container = document.getElementById(containerId);
		this.radius = options.radius || 30;
		this.hexRadius = options.hexRadius || 35;
		this.columns = options.columns || 14;
		this.rows = options.rows || 14;
		this.occupiedHexes = new Set();
		this.hexagons = this.generateHexGrid();
		this.moveCount = 0;
		this.resetCount = 0;
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

	countHexagonFigures() {
		const visited = new Set();
		let hexagonCount = 0;
		const adjacencyMap = this.buildAdjacencyMap();

		for (const pos of this.occupiedHexes) {
			if (!visited.has(pos)) {
				const hexagon = this.findHexagon(pos, adjacencyMap, visited);
				if (hexagon) {
					hexagonCount++;
					hexagon.forEach((p) => visited.add(p));
				}
			}
		}
		return hexagonCount;
	}

	buildAdjacencyMap() {
		const adjacencyMap = new Map();
		const adjacentDist = this.hexRadius * 1.8;

		// Initialize adjacency map
		for (const pos of this.occupiedHexes) {
			adjacencyMap.set(pos, []);
		}

		// Find adjacent circles
		const positions = Array.from(this.occupiedHexes);
		for (let i = 0; i < positions.length; i++) {
			const [x1, y1] = positions[i].split(",").map(Number);

			for (let j = i + 1; j < positions.length; j++) {
				const [x2, y2] = positions[j].split(",").map(Number);
				const distance = Math.hypot(x1 - x2, y1 - y2);

				if (distance <= adjacentDist) {
					adjacencyMap.get(positions[i]).push(positions[j]);
					adjacencyMap.get(positions[j]).push(positions[i]);
				}
			}
		}
		return adjacencyMap;
	}

	findHexagon(startPos, adjacencyMap, visited) {
		const neighbors = adjacencyMap.get(startPos) || [];
		if (neighbors.length !== 2) return null; // Hexagon points must have exactly 2 connections

		const path = [startPos];
		let current = startPos;
		let prev = null;
		let next = neighbors[0];

		// Traverse the potential hexagon
		while (next !== startPos && path.length < 7) {
			path.push(next);
			const nextNeighbors = adjacencyMap.get(next) || [];

			// Find the next node that isn't the one we came from
			const temp = next;
			next = nextNeighbors.find((n) => n !== prev);
			prev = temp;

			if (!next) return null; // Dead end
		}

		// Check if we have a complete hexagon
		if (path.length === 6 && next === startPos) {
			// Verify all nodes have exactly 2 connections in the hexagon
			for (const pos of path) {
				const neighborsInHex = adjacencyMap.get(pos).filter((n) => path.includes(n));
				if (neighborsInHex.length !== 2) return null;
			}
			return path;
		}

		return null;
	}

	areConsecutiveAnglesValid(path, nextPos) {
		if (path.length < 2) return true;

		const [x1, y1] = path[path.length - 2].split(",").map(Number);
		const [x2, y2] = path[path.length - 1].split(",").map(Number);
		const [x3, y3] = nextPos.split(",").map(Number);

		// Vector from point 2 to point 1
		const v1 = { x: x1 - x2, y: y1 - y2 };
		// Vector from point 2 to point 3
		const v2 = { x: x3 - x2, y: y3 - y2 };

		// Calculate angle between vectors (should be ~60° for hexagon)
		const angle = this.calculateAngle(v1, v2);
		return Math.abs(angle - 60) < 15; // 15° tolerance
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

	updateResetIndicators(success = false) {
		const indicators = document.querySelectorAll(".reset-indicator");
		indicators.forEach((indicator, index) => {
			if (success) {
				soundManager.play("success");
				// For success condition (moves=3, hexagons=2), make all indicators green
				indicator.classList.remove("active");
				indicator.classList.add("inactive");
			} else {
				soundManager.play("error");
				// Normal behavior - show active indicators based on reset count
				if (index < this.resetCount) {
					indicator.classList.add("active");
					indicator.classList.remove("inactive");
				} else {
					indicator.classList.remove("active");
					indicator.classList.remove("inactive");
				}
			}
		});
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

		// Check if target is occupied by a non-static circle
		const isOccupied = Array.from(this.occupiedHexes).some((pos) => {
			return pos === targetKey;
		});
		if (isOccupied) return false;

		// Get all other non-static circle positions
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

		// Rest of the method remains the same...
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

	resetAllCircles() {
		this.resetCount = Math.min(this.resetCount + 1, 5);
		this.updateResetIndicators();

		// Store current positions of non-static circles before reset
		const currentCircles = [];
		document.querySelectorAll(".circle:not(.is-static)").forEach((circle) => {
			const circleId = circle.getAttribute("data-circle-id");
			const currentX = parseInt(circle.style.left) + this.radius;
			const currentY = parseInt(circle.style.top) + this.radius;
			currentCircles.push({ element: circle, id: circleId, x: currentX, y: currentY });
		});

		this.occupiedHexes.clear();
		this.moveCount = 0;

		// Rest of the method remains the same...
		const initialPositions = [
			// Only include non-static circles here
			{ col: 7, row: 125, isStatic: false },
			{ col: 7, row: 135, isStatic: false },
			{ col: 7, row: 155, isStatic: false },
			{ col: 6, row: 120, isStatic: false },
			{ col: 6, row: 130, isStatic: false },
			{ col: 6, row: 150, isStatic: false },
		];

		// Animate each existing non-static circle to its initial position
		currentCircles.forEach((circle, index) => {
			if (index < initialPositions.length) {
				const targetPos = initialPositions[index];
				const targetX = this.hexagons[targetPos.col].x;
				const targetY = this.hexagons[targetPos.row].y;

				circle.element.style.transition = "left 0.8s ease-in-out, top 0.8s ease-in-out";
				circle.element.style.zIndex = "100";

				circle.element.style.left = `${targetX - this.radius}px`;
				circle.element.style.top = `${targetY - this.radius}px`;

				this.occupiedHexes.add(`${targetX},${targetY}`);

				circle.element.classList.add("reset-animating");

				setTimeout(() => {
					circle.element.style.transition = "none";
					circle.element.classList.remove("reset-animating");
				}, 800);
			}
		});

		setTimeout(() => {
			console.log(`Moves: ${this.moveCount}, Hexagons: ${this.countHexagonFigures()}`);
		}, 800);
	}
}
