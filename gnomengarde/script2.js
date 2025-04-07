const container = document.getElementById("container");
const radius = 30; // Circle radius
const hexRadius = 35; // Hexagon radius
const columns = 14;
const rows = 14;

// Track occupied hex positions
const occupiedHexes = new Set();

// Pre-generate hex grid
const hexagons = (() => {
	const grid = [];
	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < columns; col++) {
			let x = col * hexRadius * 1.5;
			let y = row * hexRadius * Math.sqrt(3);

			if (col % 2 === 1) {
				y += (hexRadius * Math.sqrt(3)) / 2;
			}

			grid.push({ x, y });
		}
	}
	return grid;
})();

// Draw hexagonal grid as SVG
function drawHexGrid() {
	const svg = document.querySelector(".grid-overlay");

	hexagons.forEach((hex) => {
		const points = [];
		for (let i = 0; i < 6; i++) {
			const angle = (i * Math.PI) / 3;
			const px = hex.x + hexRadius * Math.cos(angle);
			const py = hex.y + hexRadius * Math.sin(angle);
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

// Find closest hex position to coordinates
function findClosestHex(x, y) {
	return hexagons.reduce(
		(closest, hex) => {
			const distance = Math.hypot(x - hex.x, y - hex.y);
			return distance < closest.distance ? { hex, distance } : closest;
		},
		{ hex: hexagons[0], distance: Infinity }
	).hex;
}

// Check if movement between hexes is valid
function isValidMove(startHex, endHex) {
	// Check if target is already occupied
	const targetKey = `${endHex.x},${endHex.y}`;
	if (occupiedHexes.has(targetKey)) return false;

	// Quick exit for short movements
	const dx = endHex.x - startHex.x;
	const dy = endHex.y - startHex.y;
	const distance = Math.hypot(dx, dy);
	if (distance < hexRadius * 0.8) return true;

	// Check for obstacles along path
	const steps = Math.max(Math.abs(dx / (hexRadius * 1.5)), Math.abs(dy / (hexRadius * Math.sqrt(3))));

	for (let i = 1; i < steps; i++) {
		const ratio = i / steps;
		const ix = startHex.x + dx * ratio;
		const iy = startHex.y + dy * ratio;
		const iHex = findClosestHex(ix, iy);
		const iKey = `${iHex.x},${iHex.y}`;

		if (iKey !== targetKey && occupiedHexes.has(iKey)) {
			return false;
		}
	}

	// Check if movement passes between adjacent circles
	return !passesThrough(startHex, endHex);
}

// Check if movement passes between adjacent circles
function passesThrough(startHex, endHex) {
	const occupiedArr = Array.from(occupiedHexes).map((pos) => {
		const [x, y] = pos.split(",").map(Number);
		return { x, y };
	});

	const moveVec = {
		x: endHex.x - startHex.x,
		y: endHex.y - startHex.y,
	};

	// Quick exit for short movements
	const moveLen = Math.hypot(moveVec.x, moveVec.y);
	if (moveLen < hexRadius) return false;

	// Check all pairs of occupied hexes
	for (let i = 0; i < occupiedArr.length; i++) {
		for (let j = i + 1; j < occupiedArr.length; j++) {
			const hex1 = occupiedArr[i];
			const hex2 = occupiedArr[j];

			// Calculate distance between hexes
			const hexDist = Math.hypot(hex2.x - hex1.x, hex2.y - hex1.y);

			// Skip if not potential blocking pair
			if (hexDist <= hexRadius * 1.1 || hexDist >= hexRadius * 2.2) continue;

			// Calculate midpoint between hexes
			const mid = {
				x: (hex1.x + hex2.x) / 2,
				y: (hex1.y + hex2.y) / 2,
			};

			// Distance from midpoint to movement path
			const distToPath = pointToLineDistance(mid, startHex, endHex);

			// Gap vector between hexes
			const gapVec = {
				x: hex2.x - hex1.x,
				y: hex2.y - hex1.y,
			};

			// Check if path passes between hexes
			const dot = moveVec.x * gapVec.x + moveVec.y * gapVec.y;
			const cosAngle = dot / (moveLen * hexDist);

			// Check if path passes between hexes
			if (distToPath < hexRadius * 0.7 && Math.abs(cosAngle) > 0.3) {
				return true;
			}
		}
	}

	return false;
}

// Calculate distance from point to line segment
function pointToLineDistance(point, lineStart, lineEnd) {
	const lineVecX = lineEnd.x - lineStart.x;
	const lineVecY = lineEnd.y - lineStart.y;
	const lineLen = Math.hypot(lineVecX, lineVecY);

	if (lineLen === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);

	const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * lineVecX + (point.y - lineStart.y) * lineVecY) / (lineLen * lineLen)));

	const projX = lineStart.x + t * lineVecX;
	const projY = lineStart.y + t * lineVecY;

	return Math.hypot(point.x - projX, point.y - projY);
}

// Create draggable circle
function createCircle(x, y) {
	const circle = document.createElement("div");
	circle.classList.add("circle");
	circle.style.left = `${x - radius}px`;
	circle.style.top = `${y - radius}px`;
	container.appendChild(circle);

	occupiedHexes.add(`${x},${y}`);

	// Setup drag handling
	circle.addEventListener("mousedown", startDrag);
	circle.addEventListener("touchstart", startDrag);

	function startDrag(event) {
		event.preventDefault();

		// Original position of the circle (starting point for the line)
		const originalX = parseInt(circle.style.left) + radius;
		const originalY = parseInt(circle.style.top) + radius;
		const originalHex = findClosestHex(originalX, originalY);

		const offsetX = event.clientX - circle.offsetLeft - radius;
		const offsetY = event.clientY - circle.offsetTop - radius;

		let line;

		// Create SVG line for drag visualization
		function createLine() {
			const svg = document.querySelector(".grid-overlay");
			line = document.createElementNS("http://www.w3.org/2000/svg", "line");
			line.setAttribute("stroke", "#3498db");
			line.setAttribute("stroke-width", 2);
			line.setAttribute("x1", originalX);
			line.setAttribute("y1", originalY);
			line.setAttribute("x2", originalX);
			line.setAttribute("y2", originalY);
			svg.appendChild(line);
		}

		function moveCircle(moveEvent) {
			// Create line on first move
			if (!line) createLine();

			// Calculate new position
			const mouseX = moveEvent.clientX - offsetX;
			const mouseY = moveEvent.clientY - offsetY;
			const targetHex = findClosestHex(mouseX, mouseY);

			// Get current circle position
			const currentX = parseInt(circle.style.left) + radius;
			const currentY = parseInt(circle.style.top) + radius;
			const currentHex = findClosestHex(currentX, currentY);

			// Update line endpoint to the current position of the circle, NOT the cursor
			line.setAttribute("x2", currentX);
			line.setAttribute("y2", currentY);

			if (targetHex.x !== currentHex.x || targetHex.y !== currentHex.y) {
				if (isValidMove(currentHex, targetHex)) {
					// Remove current position from occupied hexes
					occupiedHexes.delete(`${currentHex.x},${currentHex.y}`);

					// Move circle and update occupied hexes
					circle.style.left = `${targetHex.x - radius}px`;
					circle.style.top = `${targetHex.y - radius}px`;
					occupiedHexes.add(`${targetHex.x},${targetHex.y}`);

					// After moving the circle, update line endpoint to new circle position
					line.setAttribute("x2", targetHex.x);
					line.setAttribute("y2", targetHex.y);
				}
			}
		}

		function stopDrag() {
			if (line) line.remove();
			document.removeEventListener("mousemove", moveCircle);
			document.removeEventListener("mouseup", stopDrag);
			document.removeEventListener("touchmove", moveCircle);
			document.removeEventListener("touchend", stopDrag);
		}

		document.addEventListener("mousemove", moveCircle);
		document.addEventListener("mouseup", stopDrag);
		document.addEventListener("touchmove", moveCircle);
		document.addEventListener("touchend", stopDrag);
	}
}

// Initialize the game
drawHexGrid();

// Create initial circles
[
	{ col: 6, row: 20 },
	{ col: 7, row: 25 },
	{ col: 5, row: 25 },
	{ col: 5, row: 35 },
	{ col: 7, row: 35 },
	{ col: 6, row: 50 },
	{ col: 5, row: 85 },
].forEach((pos) => createCircle(hexagons[pos.col].x, hexagons[pos.row].y));
