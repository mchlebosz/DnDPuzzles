const container = document.getElementById("container");
const radius = 30; // Promień kółka (połowa szerokości)
const hexRadius = 35; // Promień heksagonu
const columns = 14; // Liczba kolumn w siatce
const rows = 14; // Liczba wierszy w siatce

// Keep track of occupied hexagonal positions
const occupiedHexes = new Set();

// Funkcja generująca siatkę heksagonalną i rysującą ją jako SVG
function drawHexGrid() {
	const svg = document.querySelector(".grid-overlay");
	const hexagons = [];

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < columns; col++) {
			let x = col * hexRadius * 1.5; // Przesunięcie w poziomie
			let y = row * hexRadius * Math.sqrt(3); // Przesunięcie w pionie

			// Jeżeli wiersz jest parzysty, przesuwamy kółka w prawo
			if (col % 2 === 1) {
				y += (hexRadius * Math.sqrt(3)) / 2;
			}

			// Rysowanie heksagonu SVG
			const points = [];
			for (let i = 0; i < 6; i++) {
				const angle = (i * Math.PI) / 3;
				const px = x + hexRadius * Math.cos(angle);
				const py = y + hexRadius * Math.sin(angle);
				points.push(`${px},${py}`);
			}

			const hexagon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
			hexagon.setAttribute("points", points.join(" "));
			hexagon.setAttribute("fill", "none");
			hexagon.setAttribute("stroke", "#ddd");
			hexagon.setAttribute("stroke-width", 1);
			svg.appendChild(hexagon);
		}
	}
}

// Funkcja tworząca kółko
function createCircle(x, y) {
	const circle = document.createElement("div");
	circle.classList.add("circle");
	circle.style.left = `${x - radius}px`; // Centrowanie kółka (współrzędna X)
	circle.style.top = `${y - radius}px`; // Centrowanie kółka (współrzędna Y)
	container.appendChild(circle);

	// Store the initial position in the occupiedHexes set
	occupiedHexes.add(`${x},${y}`);

	circle.dataset.dragging = "false"; // Zmienna do śledzenia, czy kółko jest przeciągane

	// Dodajemy eventy do przesuwania
	circle.addEventListener("mousedown", startDrag);
	circle.addEventListener("touchstart", startDrag);

	// Funkcja do przesuwania kółka
	function startDrag(event) {
		event.preventDefault();
		circle.dataset.dragging = "true";

		const offsetX = event.clientX - circle.offsetLeft - radius;
		const offsetY = event.clientY - circle.offsetTop - radius;

		let lineCreated = false; // Flag to track if the line has been created
		let line; // Declare the line variable

		function moveCircle(moveEvent) {
			if (!circle.dataset.dragging) return;

			let newX = moveEvent.clientX - offsetX;
			let newY = moveEvent.clientY - offsetY;

			// Find the closest hexagonal position for the new position
			const closestHex = findClosestHex(newX, newY);

			// Create the line only when the circle is moved for the first time
			if (!lineCreated) {
				const svg = document.querySelector(".grid-overlay");
				line = document.createElementNS("http://www.w3.org/2000/svg", "line");
				line.setAttribute("stroke", "#3498db");
				line.setAttribute("stroke-width", 2);
				svg.appendChild(line);

				// Set the initial position of the line
				const startX = parseInt(circle.style.left) + radius;
				const startY = parseInt(circle.style.top) + radius;
				line.setAttribute("x1", startX);
				line.setAttribute("y1", startY);

				// Initialize the endpoint to the same position as the start
				line.setAttribute("x2", startX);
				line.setAttribute("y2", startY);

				lineCreated = true; // Mark the line as created
			}

			// Update the line's endpoint dynamically
			const endX = closestHex.x;
			const endY = closestHex.y;
			line.setAttribute("x2", endX);
			line.setAttribute("y2", endY);

			// Check if the target hex is already occupied
			const targetHexKey = `${closestHex.x},${closestHex.y}`;
			if (!occupiedHexes.has(targetHexKey)) {
				// Find the current hexagonal position of the circle
				const currentX = parseInt(circle.style.left) + radius;
				const currentY = parseInt(circle.style.top) + radius;
				const currentHex = findClosestHex(currentX, currentY);
				const currentHexKey = `${currentHex.x},${currentHex.y}`;

				// Validate the path between the current position and the target position
				if (isPathClear(currentHex, closestHex)) {
					// Remove the current position from occupiedHexes
					occupiedHexes.delete(currentHexKey);

					// Move the circle and update occupiedHexes
					circle.style.left = `${closestHex.x - radius}px`;
					circle.style.top = `${closestHex.y - radius}px`;
					occupiedHexes.add(targetHexKey);

					// Update the line's endpoint to the new circle position
					line.setAttribute("x2", closestHex.x);
					line.setAttribute("y2", closestHex.y);

					console.log(`Circle moved to (${closestHex.x}, ${closestHex.y})`);
					console.log("Occupied hexes:", Array.from(occupiedHexes));
				} else {
					console.log("Path is blocked. Movement not allowed.");

					// Update the line's endpoint to the current circle position
					const currentX = parseInt(circle.style.left) + radius;
					const currentY = parseInt(circle.style.top) + radius;
					line.setAttribute("x2", currentX);
					line.setAttribute("y2", currentY);
				}
			} else {
				console.log("Target hex is occupied. Movement blocked.");

				// Update the line's endpoint to the current circle position
				const currentX = parseInt(circle.style.left) + radius;
				const currentY = parseInt(circle.style.top) + radius;
				line.setAttribute("x2", currentX);
				line.setAttribute("y2", currentY);
			}
		}

		function stopDrag() {
			circle.dataset.dragging = "false";

			// Remove the line when the drag ends
			if (lineCreated) {
				line.remove();
			}

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

// Funkcja sprawdzająca, czy kółka się nakładają
function isOverlapping(circle1, circle2) {
	const rect1 = circle1.getBoundingClientRect();
	const rect2 = circle2.getBoundingClientRect();

	// Log: Check if circles overlap
	const overlap = !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
	console.log(`Checking overlap: ${overlap}`);
	return overlap;
}

// Funkcja generująca siatkę heksagonalną
function createHexGrid() {
	let hexagons = [];

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < columns; col++) {
			let x = col * hexRadius * 1.5;
			let y = row * hexRadius * Math.sqrt(3);

			if (col % 2 === 1) {
				y += (hexRadius * Math.sqrt(3)) / 2;
			}

			hexagons.push({ x, y });
		}
	}

	return hexagons;
}

// Generate the hexagonal grid once
const hexagons = createHexGrid();

// Update the `findClosestHex` function to use the pre-generated grid
function findClosestHex(x, y) {
	let closestHex = hexagons[0];
	let minDistance = Infinity;

	for (let hex of hexagons) {
		const distance = Math.sqrt(Math.pow(x - hex.x, 2) + Math.pow(y - hex.y, 2));
		if (distance < minDistance) {
			minDistance = distance;
			closestHex = hex;
		}
	}

	console.log(`Closest hexagon to (${x}, ${y}) is (${closestHex.x}, ${closestHex.y})`);
	return closestHex;
}

// Funkcja sprawdzająca, czy ścieżka między dwoma heksagonami jest wolna
function isPathClear(startHex, endHex) {
	const dx = endHex.x - startHex.x;
	const dy = endHex.y - startHex.y;

	// Calculate the number of steps needed to reach the target
	const steps = Math.max(Math.abs(dx / (hexRadius * 1.5)), Math.abs(dy / (hexRadius * Math.sqrt(3))));

	// Check each intermediate hexagonal position along the path
	for (let i = 1; i <= steps; i++) {
		const intermediateX = startHex.x + (dx / steps) * i;
		const intermediateY = startHex.y + (dy / steps) * i;
		const intermediateHex = findClosestHex(intermediateX, intermediateY);
		const intermediateHexKey = `${intermediateHex.x},${intermediateHex.y}`;

		// If any intermediate position is occupied, the path is blocked
		if (occupiedHexes.has(intermediateHexKey)) {
			console.log("Path blocked by occupied hex:", intermediateHex);
			return false;
		}
	}

	// Additional check for diagonal movement through gaps between adjacent circles
	if (isDiagonalMovementThroughGap(startHex, endHex)) {
		console.log("Movement would cut through a diagonal gap between circles");
		return false;
	}

	// If no intermediate hexagons are occupied, the path is clear
	return true;
}

// Function to check if movement is trying to pass diagonally through a gap between circles
function isDiagonalMovementThroughGap(startHex, endHex) {
	// Get all pairs of adjacent occupied hexes
	const occupiedArray = Array.from(occupiedHexes).map((pos) => {
		const [x, y] = pos.split(",").map(Number);
		return { x, y };
	});

	for (let i = 0; i < occupiedArray.length; i++) {
		for (let j = i + 1; j < occupiedArray.length; j++) {
			const hex1 = occupiedArray[i];
			const hex2 = occupiedArray[j];

			// Check if these two hexes are adjacent
			if (areHexesAdjacent(hex1, hex2)) {
				// Check if movement passes between these two hexes
				if (doesMovementPassBetween(startHex, endHex, hex1, hex2)) {
					return true;
				}
			}
		}
	}

	return false;
}

// Check if two hexagons are adjacent to each other
function areHexesAdjacent(hex1, hex2) {
	// Calculate the distance between the two hexes
	const dx = Math.abs(hex1.x - hex2.x);
	const dy = Math.abs(hex1.y - hex2.y);

	// Calculate the specific distances for adjacent hexes
	const horizontalDistance = hexRadius * 1.5;
	const verticalDistance = hexRadius * Math.sqrt(3);
	const diagonalDistance = Math.sqrt(Math.pow(hexRadius * 0.75, 2) + Math.pow((hexRadius * Math.sqrt(3)) / 2, 2));

	// Check if the hexes are adjacent based on precise distance calculations
	// Allow for small rounding errors with a tolerance
	const tolerance = 0.5;

	// Check horizontal adjacency (left/right)
	if (Math.abs(dx - horizontalDistance) < tolerance && dy < tolerance) {
		return true;
	}

	// Check vertical adjacency for odd/even columns
	if (dx < tolerance && Math.abs(dy - verticalDistance) < tolerance) {
		return true;
	}

	// Check diagonal adjacency
	if (Math.abs(dx - hexRadius * 0.75) < tolerance && Math.abs(dy - (hexRadius * Math.sqrt(3)) / 2) < tolerance) {
		return true;
	}

	// Calculate the actual distance between hexes
	const distance = Math.sqrt(Math.pow(hex1.x - hex2.x, 2) + Math.pow(hex1.y - hex2.y, 2));

	// If the distance is approximately equal to the distance between adjacent hexes, they're adjacent
	if (Math.abs(distance - horizontalDistance) < tolerance || Math.abs(distance - verticalDistance) < tolerance || Math.abs(distance - diagonalDistance) < tolerance) {
		return true;
	}

	return false;
}

// Check if a movement passes between two occupied hexes
function doesMovementPassBetween(startHex, endHex, hex1, hex2) {
	// Calculate vectors
	const moveVec = { x: endHex.x - startHex.x, y: endHex.y - startHex.y };
	const hexGapVec = { x: hex2.x - hex1.x, y: hex2.y - hex1.y };

	// Calculate the midpoint between the two hexes
	const midpoint = { x: (hex1.x + hex2.x) / 2, y: (hex1.y + hex2.y) / 2 };

	// Check if the movement line passes close to the midpoint
	const distanceToLine = distancePointToLine(midpoint, startHex, endHex);
	const hexDistance = Math.sqrt(hexGapVec.x * hexGapVec.x + hexGapVec.y * hexGapVec.y);

	// Calculate the movement length
	const movementLength = Math.sqrt(moveVec.x * moveVec.x + moveVec.y * moveVec.y);

	// Check if the movement is long enough to potentially cut through
	if (movementLength < hexRadius) {
		return false; // Movement is too short to cut through
	}

	// Calculate if the movement direction is roughly perpendicular to the gap direction
	const dotProduct = moveVec.x * hexGapVec.x + moveVec.y * hexGapVec.y;
	const moveMagnitude = Math.sqrt(moveVec.x * moveVec.x + moveVec.y * moveVec.y);
	const gapMagnitude = Math.sqrt(hexGapVec.x * hexGapVec.x + hexGapVec.y * hexGapVec.y);
	const cosAngle = Math.abs(dotProduct) / (moveMagnitude * gapMagnitude);

	// If movement is more perpendicular to the gap, it's more likely to be cutting through
	const perpendicularThreshold = 0.7; // cos(45°) ≈ 0.7

	// Lower threshold for distance when the movement direction is perpendicular to gap
	const distanceThreshold = cosAngle < perpendicularThreshold ? hexRadius * 0.75 : hexRadius * 0.5;

	// If the movement passes close to the midpoint between adjacent hexes, block it
	if (distanceToLine < distanceThreshold && hexDistance < hexRadius * 2.5) {
		// Additional check: Is the midpoint actually between start and end?
		if (isPointBetween(midpoint, startHex, endHex, hexRadius)) {
			console.log("Movement would cut through gap at midpoint:", midpoint);
			return true;
		}
	}

	return false;
}

// Check if a point is roughly between two other points
function isPointBetween(point, lineStart, lineEnd, tolerance) {
	// Vector from start to end
	const vec1 = {
		x: lineEnd.x - lineStart.x,
		y: lineEnd.y - lineStart.y,
	};

	// Vector from start to point
	const vec2 = {
		x: point.x - lineStart.x,
		y: point.y - lineStart.y,
	};

	// If point is beyond the line segment, dot product will be negative or greater than the squared length
	const dotProduct = vec1.x * vec2.x + vec1.y * vec2.y;
	const squaredLength = vec1.x * vec1.x + vec1.y * vec1.y;

	// Check with a tolerance to account for floating point errors
	if (dotProduct < -tolerance || dotProduct > squaredLength + tolerance) {
		return false;
	}

	return true;
}

// Calculate the distance from a point to a line defined by two points
function distancePointToLine(point, lineStart, lineEnd) {
	const lineLength = Math.sqrt(Math.pow(lineEnd.x - lineStart.x, 2) + Math.pow(lineEnd.y - lineStart.y, 2));

	if (lineLength === 0) return Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2));

	const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * (lineEnd.x - lineStart.x) + (point.y - lineStart.y) * (lineEnd.y - lineStart.y)) / (lineLength * lineLength)));

	const projectionX = lineStart.x + t * (lineEnd.x - lineStart.x);
	const projectionY = lineStart.y + t * (lineEnd.y - lineStart.y);

	return Math.sqrt(Math.pow(point.x - projectionX, 2) + Math.pow(point.y - projectionY, 2));
}

// Funkcja zwracająca sąsiadujące heksagony
function getHexNeighbors(hex) {
	const directions = [
		{ dx: hexRadius * 1.5, dy: 0 }, // Right
		{ dx: -hexRadius * 1.5, dy: 0 }, // Left
		{ dx: hexRadius * 0.75, dy: (hexRadius * Math.sqrt(3)) / 2 }, // Bottom-right
		{ dx: -hexRadius * 0.75, dy: (hexRadius * Math.sqrt(3)) / 2 }, // Bottom-left
		{ dx: hexRadius * 0.75, dy: (-hexRadius * Math.sqrt(3)) / 2 }, // Top-right
		{ dx: -hexRadius * 0.75, dy: (-hexRadius * Math.sqrt(3)) / 2 }, // Top-left
	];

	const neighbors = directions.map((dir) => ({
		x: hex.x + dir.dx,
		y: hex.y + dir.dy,
	}));

	console.log("Neighbors for hex:", hex, "are:", neighbors);
	return neighbors;
}

// Funkcja sprawdzająca, czy heksagon jest osiągalny z krawędzi
function isReachableFromEdge(targetHex) {
	const visited = new Set();
	const queue = [targetHex];

	while (queue.length > 0) {
		const currentHex = queue.shift();
		const currentHexKey = `${currentHex.x},${currentHex.y}`;

		// If the current hex is on the edge of the grid, it's reachable
		if (currentHex.x === 0 || currentHex.y === 0 || currentHex.x === (columns - 1) * hexRadius * 1.5 || currentHex.y === (rows - 1) * hexRadius * Math.sqrt(3)) {
			return true;
		}

		// Skip if already visited
		if (visited.has(currentHexKey)) {
			continue;
		}
		visited.add(currentHexKey);

		// Check all neighboring hexagons
		const neighbors = getHexNeighbors(currentHex);
		for (const neighbor of neighbors) {
			const neighborKey = `${neighbor.x},${neighbor.y}`;
			if (!occupiedHexes.has(neighborKey) && !visited.has(neighborKey)) {
				queue.push(neighbor);
			}
		}
	}

	// If no path to the edge is found, the target is enclosed
	return false;
}

// Rysowanie siatki i generowanie kółek
drawHexGrid();
console.log(hexagons); // Debugging: log the hexagon coordinates

createCircle(hexagons[6].x, hexagons[20].y);
createCircle(hexagons[7].x, hexagons[25].y);
createCircle(hexagons[5].x, hexagons[25].y);
createCircle(hexagons[5].x, hexagons[35].y);
createCircle(hexagons[7].x, hexagons[35].y);
createCircle(hexagons[6].x, hexagons[50].y);

createCircle(hexagons[5].x, hexagons[85].y);
