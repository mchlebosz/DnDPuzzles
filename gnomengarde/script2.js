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

	// Check for occupied hexes along path
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

	// Check if there are tight spaces between circles that would block movement
	return !wouldPassThroughTightSpace(startHex, endHex);
}

// Check if the path passes through a tight space between circles
function wouldPassThroughTightSpace(start, end) {
	// Convert string positions to objects with x, y coordinates
	const occupiedPositions = Array.from(occupiedHexes)
		.map((pos) => {
			const [x, y] = pos.split(",").map(Number);
			return { x, y };
		})
		.filter((pos) => {
			// Filter out the start position itself
			return pos.x !== start.x || pos.y !== start.y;
		});

	// Line segment parameters
	const lineVec = {
		x: end.x - start.x,
		y: end.y - start.y,
	};
	const lineLength = Math.hypot(lineVec.x, lineVec.y);

	// Unit direction vector
	const dirX = lineVec.x / lineLength;
	const dirY = lineVec.y / lineLength;

	// Check each pair of occupied positions
	for (let i = 0; i < occupiedPositions.length; i++) {
		for (let j = i + 1; j < occupiedPositions.length; j++) {
			const pos1 = occupiedPositions[i];
			const pos2 = occupiedPositions[j];

			// Calculate distance between these two positions
			const distBetween = Math.hypot(pos2.x - pos1.x, pos2.y - pos1.y);

			// Skip if they're too far apart to form a "squeeze"
			// or if they're essentially at the same position (shouldn't happen)
			if (distBetween > radius * 4 || distBetween < radius * 0.5) continue;

			// Calculate the midpoint between the two positions
			const midpoint = {
				x: (pos1.x + pos2.x) / 2,
				y: (pos1.y + pos2.y) / 2,
			};

			// Calculate distance from midpoint to line
			// Formula for point-to-line distance: |cross(line_direction, point - line_start)| / |line_direction|
			const vecToMid = {
				x: midpoint.x - start.x,
				y: midpoint.y - start.y,
			};

			// Cross product magnitude
			const crossProduct = Math.abs(dirX * vecToMid.y - dirY * vecToMid.x);

			// This is the perpendicular distance from midpoint to line
			const distToLine = crossProduct;

			// Check if midpoint is near the line segment (not just the infinite line)
			// Dot product determines if the midpoint's projection falls on the line segment
			const dotProduct = dirX * vecToMid.x + dirY * vecToMid.y;
			const isNearLineSegment = dotProduct >= 0 && dotProduct <= lineLength;

			// If midpoint is near the line and the gap is too small
			// Allow for slight clearance - if gap is less than 2.2*radius (slightly more than diameter)
			if (isNearLineSegment && distToLine < radius * 1.1 && distBetween < radius * 2.2) {
				return true; // Path is blocked
			}
		}
	}

	return false; // No tight spaces found
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
				// Before moving, remove this circle from occupiedHexes temporarily
				occupiedHexes.delete(`${currentHex.x},${currentHex.y}`);

				if (isValidMove(currentHex, targetHex)) {
					// Move circle and update occupied hexes
					circle.style.left = `${targetHex.x - radius}px`;
					circle.style.top = `${targetHex.y - radius}px`;
					occupiedHexes.add(`${targetHex.x},${targetHex.y}`);

					// After moving the circle, update line endpoint to new circle position
					line.setAttribute("x2", targetHex.x);
					line.setAttribute("y2", targetHex.y);
				} else {
					// If move is invalid, add the current position back to occupiedHexes
					occupiedHexes.add(`${currentHex.x},${currentHex.y}`);
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
