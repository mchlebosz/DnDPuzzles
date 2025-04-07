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

// Refined isPathClear function to ensure adjacent hexes do not block movement
function isPathClear(startHex, endHex) {
	// Calculate distance between hexes
	const dx = endHex.x - startHex.x; // Horizontal distance
	const dy = endHex.y - startHex.y; // Vertical distance
	const steps = Math.max(Math.abs(dx / (hexRadius * 1.5)), Math.abs(dy / (hexRadius * Math.sqrt(3)))); // Number of steps needed to move between hexes
	// Skip check for very small movements
	if (steps < 0.5) return true;

	// Check if any intermediate hex is occupied
	for (let i = 1; i < steps; i++) {
		const ratio = i / steps;
		const intermediateX = startHex.x + dx * ratio; // Calculate intermediate x position
		const intermediateY = startHex.y + dy * ratio; // Calculate intermediate y position
		const intermediateHex = findClosestHex(intermediateX, intermediateY);
		const intermediateHexKey = `${intermediateHex.x},${intermediateHex.y}`;

		// Skip the target hex in the check
		if (intermediateHexKey === `${endHex.x},${endHex.y}`) continue;

		// Block movement if hex is occupied
		if (occupiedHexes.has(intermediateHexKey)) {
			console.log("Path blocked by occupied hex:", intermediateHex);
			return false;
		}
	}

	// Check for movement between adjacent circles
	return !wouldCrossBetweenCircles(startHex, endHex);
}

// Improved function to check if two hexes could potentially block movement
function areHexesPotentiallyBlocking(hex1, hex2) {
	const dx = hex2.x - hex1.x;
	const dy = hex2.y - hex1.y;
	const distance = Math.sqrt(dx * dx + dy * dy);

	// Optimal thresholds based on hex geometry
	return distance > hexRadius * 1.1 && distance < hexRadius * 2.2;
}

// Optimized function to check if movement would cross between adjacent circles
function wouldCrossBetweenCircles(startHex, endHex) {
	// Convert occupied hexes to array for easier processing
	const occupiedArray = Array.from(occupiedHexes).map((pos) => {
		const [x, y] = pos.split(",").map(Number);
		return { x, y };
	});

	// Movement vector and length calculation
	const moveVec = {
		x: endHex.x - startHex.x,
		y: endHex.y - startHex.y,
	};
	const moveLength = Math.sqrt(moveVec.x * moveVec.x + moveVec.y * moveVec.y);

	// Quick exit for very short movements
	if (moveLength < hexRadius * 0.8) return false;

	// Check all possible pairs of circles
	for (let i = 0; i < occupiedArray.length; i++) {
		for (let j = i + 1; j < occupiedArray.length; j++) {
			const hex1 = occupiedArray[i];
			const hex2 = occupiedArray[j];

			// Skip non-blocking pairs
			if (!areHexesPotentiallyBlocking(hex1, hex2)) continue;

			const midpoint = {
				x: (hex1.x + hex2.x) / 2,
				y: (hex1.y + hex2.y) / 2,
			};

			// Skip if movement doesn't pass between the circles
			if (!isPointBetween(midpoint, startHex, endHex, hexRadius * 0.5)) continue;

			const distToPath = distancePointToLine(midpoint, startHex, endHex);

			// Gap vector between circles
			const gapVec = {
				x: hex2.x - hex1.x,
				y: hex2.y - hex1.y,
			};
			const gapLength = Math.sqrt(gapVec.x * gapVec.x + gapVec.y * gapVec.y);

			// Check arrangement and angle
			const isStraight = isHexesStraightLine(hex1, hex2);
			const dotProduct = moveVec.x * gapVec.x + moveVec.y * gapVec.y;
			const cosAngle = dotProduct / (moveLength * gapLength);

			if (isStraight) {
				// For straight arrangements: block if movement is parallel and close to the gap
				if (Math.abs(cosAngle) > 0.7 && distToPath < hexRadius * 0.8) return true;
			} else {
				// For V-shape arrangements: block if path is close to midpoint
				if (distToPath < hexRadius * 0.6) return true;
			}
		}
	}

	return false;
}

// More efficient calculation of distance from point to line
function distancePointToLine(point, lineStart, lineEnd) {
	const lineVecX = lineEnd.x - lineStart.x;
	const lineVecY = lineEnd.y - lineStart.y;
	const lineLength = Math.sqrt(lineVecX * lineVecX + lineVecY * lineVecY);

	// Handle degenerate case where line has zero length
	if (lineLength === 0) {
		return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
	}

	// Calculate projection factor
	const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * lineVecX + (point.y - lineStart.y) * lineVecY) / (lineLength * lineLength)));

	// Calculate projection point
	const projX = lineStart.x + t * lineVecX;
	const projY = lineStart.y + t * lineVecY;

	// Return distance to projection
	return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
}

// Optimized check if a point is between two other points with tolerance
function isPointBetween(point, lineStart, lineEnd, tolerance) {
	// Vectors
	const lineVec = {
		x: lineEnd.x - lineStart.x,
		y: lineEnd.y - lineStart.y,
	};

	const pointVec = {
		x: point.x - lineStart.x,
		y: point.y - lineStart.y,
	};

	// Calculate dot product and squared length
	const dotProduct = lineVec.x * pointVec.x + lineVec.y * pointVec.y;
	const lineLengthSq = lineVec.x * lineVec.x + lineVec.y * lineVec.y;

	// Apply tolerance and check if point is within line segment bounds
	return dotProduct >= -tolerance && dotProduct <= lineLengthSq + tolerance;
}

// Improved function to check if two hexes form a straight line
function isHexesStraightLine(hex1, hex2) {
	// Calculate the vector between the hexes
	const dx = hex2.x - hex1.x;
	const dy = hex2.y - hex1.y;

	// For a horizontal line
	if (Math.abs(dy) < hexRadius * 0.2) {
		return true;
	}

	// For a vertical line
	if (Math.abs(dx) < hexRadius * 0.2) {
		return true;
	}

	// For diagonal lines on the main hex axes
	// Calculate the angle between the hexes
	const angle = Math.atan2(dy, dx);

	// The main diagonal angles in a hex grid (in radians, approximately)
	const mainDiagonals = [
		Math.PI / 3, // 60°
		(2 * Math.PI) / 3, // 120°
		-Math.PI / 3, // -60°
		(-2 * Math.PI) / 3, // -120°
	];

	// Check if the angle is close to any of the main diagonals
	for (const diagAngle of mainDiagonals) {
		if (Math.abs(((angle - diagAngle + Math.PI) % (2 * Math.PI)) - Math.PI) < 0.3) {
			return true;
		}
	}

	return false;
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
