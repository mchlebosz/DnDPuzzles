const container = document.getElementById("container");
const radius = 30; // Promień kółka (połowa szerokości)
const hexRadius = 35; // Promień heksagonu
const columns = 14; // Liczba kolumn w siatce
const rows = 14; // Liczba wierszy w siatce

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

		function moveCircle(moveEvent) {
			if (!circle.dataset.dragging) return;

			let newX = moveEvent.clientX - offsetX;
			let newY = moveEvent.clientY - offsetY;

			// Zapewnienie, że kółko nie wyjdzie poza obszar
			newX = Math.max(0, Math.min(container.offsetWidth - circle.offsetWidth, newX));
			newY = Math.max(0, Math.min(container.offsetHeight - circle.offsetHeight, newY));

			// Znajdowanie najbliższego węzła na siatce
			const closestHex = findClosestHex(newX, newY);

			// Log: Checking if circle is blocked
			console.log(`Checking if circle can move to (${closestHex.x}, ${closestHex.y})`);

			// Sprawdzanie, czy kółko nie przechodzi przez inne kółka
			let canMove = true;
			for (let otherCircle of document.querySelectorAll(".circle")) {
				if (otherCircle !== circle && isOverlapping(circle, otherCircle)) {
					// Jeśli kółka są za blisko siebie, zatrzymaj ruch
					canMove = false;
					console.log(`Movement blocked by overlapping circle at (${otherCircle.style.left}, ${otherCircle.style.top})`);
					break;
				}
			}

			if (canMove) {
				// Przesuwamy kółko do najbliższego węzła heksagonalnego
				console.log(`Moving circle to (${closestHex.x}, ${closestHex.y})`);
				circle.style.left = `${closestHex.x - radius}px`;
				circle.style.top = `${closestHex.y - radius}px`;
			} else {
				console.log("Circle movement blocked.");
			}
		}

		function stopDrag() {
			circle.dataset.dragging = "false";
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

// Funkcja do znajdowania najbliższego węzła heksagonalnego
function findClosestHex(x, y) {
	const hexagons = createHexGrid();
	let closestHex = hexagons[0];
	let minDistance = Infinity;

	for (let hex of hexagons) {
		const distance = Math.sqrt(Math.pow(x - hex.x, 2) + Math.pow(y - hex.y, 2));
		if (distance < minDistance) {
			minDistance = distance;
			closestHex = hex;
		}
	}

	console.log(`Closest hexagon found at (${closestHex.x}, ${closestHex.y})`);
	return closestHex;
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

// Rysowanie siatki i generowanie kółek
drawHexGrid();
const hexagons = createHexGrid();
console.log(hexagons); // Debugging: log the hexagon coordinates

createCircle(hexagons[6].x, hexagons[20].y);
createCircle(hexagons[7].x, hexagons[25].y);
createCircle(hexagons[5].x, hexagons[25].y);
createCircle(hexagons[5].x, hexagons[35].y);
createCircle(hexagons[7].x, hexagons[25].y);
createCircle(hexagons[7].x, hexagons[35].y);
createCircle(hexagons[6].x, hexagons[50].y);
