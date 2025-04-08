const tilesContainer = document.getElementById("tiles");
const grid = document.getElementById("grid");
const cells = Array.from(document.querySelectorAll(".cell"));

for (let i = 1; i <= 9; i++) {
	const tile = document.createElement("div");
	tile.className = "tile";
	tile.textContent = i;
	tile.dataset.value = i;
	tilesContainer.appendChild(tile);
}

let draggedTile = null;
let offsetX = 0;
let offsetY = 0;

document.addEventListener("pointerdown", (e) => {
	if (!e.target.classList.contains("tile")) return;
	draggedTile = e.target;
	draggedTile.setPointerCapture(e.pointerId);

	const rect = draggedTile.getBoundingClientRect();
	offsetX = e.clientX - rect.left;
	offsetY = e.clientY - rect.top;

	draggedTile.style.zIndex = 1000;

	document.addEventListener("pointermove", onPointerMove);
	document.addEventListener("pointerup", onPointerUp);
});

function onPointerMove(ev) {
	if (!draggedTile) return;
	draggedTile.style.position = "absolute";
	draggedTile.style.left = `${ev.clientX - offsetX}px`;
	draggedTile.style.top = `${ev.clientY - offsetY}px`;
}

function onPointerUp(ev) {
	if (!draggedTile) return;

	draggedTile.releasePointerCapture(ev.pointerId);
	draggedTile.style.zIndex = 1;
	document.removeEventListener("pointermove", onPointerMove);
	document.removeEventListener("pointerup", onPointerUp);

	const gridRect = grid.getBoundingClientRect();
	const x = ev.clientX - gridRect.left;
	const y = ev.clientY - gridRect.top;
	const col = Math.floor(x / 100);
	const row = Math.floor(y / 100);

	if (col >= 0 && col < 3 && row >= 0 && row < 3) {
		const index = row * 3 + col;
		const cell = cells[index];

		if (!cell.firstChild) {
			cell.appendChild(draggedTile);
			draggedTile.style.position = "static";
			draggedTile = null;
			return;
		}
	}

	tilesContainer.appendChild(draggedTile);
	draggedTile.style.position = "absolute";
	draggedTile = null;
}

function checkSolution() {
	console.log("Checking solution2...");
	const gridValues = cells.map((cell) => {
		const child = cell.firstChild;
		return child ? parseInt(child.dataset.value) : 0;
	});

	const isComplete = gridValues.every((v) => v !== 0);
	console.log("Solution is complete:", isComplete);

	const lines = [
		[0, 1, 2],
		[3, 4, 5],
		[6, 7, 8],
		[0, 3, 6],
		[1, 4, 7],
		[2, 5, 8],
		[0, 4, 8],
		[2, 4, 6],
	];

	const isValid = lines.every((indices) => {
		const sum = indices.reduce((acc, i) => acc + gridValues[i], 0);
		return sum === 15;
	});
	console.log("Solution is valid:", isValid);

	if (isValid) {
		// Play the open sound
		soundManager.play("open");
		// Fade out the whole screen on success
		document.body.classList.add("fade-out");
		// Disable further interactions
		leverContainer.style.pointerEvents = "none";
		tilesContainer.style.pointerEvents = "none";
	} else {
		// Shake screen on wrong answer
		document.body.classList.add("shake-screen");
		// Reset tiles on wrong answer
		resetTiles();
		// Remove shake class after animation completes
		setTimeout(() => {
			document.body.classList.remove("shake-screen");
		}, 1000);
	}
}

// Add this new function to reset tiles
function resetTiles() {
	console.log("Resetting tiles...");
	const tiles = document.querySelectorAll(".tile");

	// Add a fade-out effect to tiles in cells
	cells.forEach((cell) => {
		if (cell.firstChild) {
			cell.firstChild.style.transition = "opacity 0.3s";
			cell.firstChild.style.opacity = "0";
		}
	});

	soundManager.play("falling");

	// Wait for fade-out before moving tiles
	setTimeout(() => {
		cells.forEach((cell) => {
			if (cell.firstChild) {
				tilesContainer.appendChild(cell.firstChild);
			}
		});

		tiles.forEach((tile) => {
			tile.style.position = "static";
			tile.style.transition = "opacity 0.3s, left 0.5s, top 0.5s";
			tile.style.opacity = "1";
		});
	}, 300);

	// Remove the fade-out effect after a short delay
	setTimeout(() => {
		tiles.forEach((tile) => {
			tile.style.transition = "none";
			tile.style.opacity = "1";
		});
	}, 600);
}

// Replace the event listener for the button with this lever interaction
const leverContainer = document.getElementById("lever-container");

// Update the lever interaction in script.js
leverContainer.addEventListener("click", function () {
	console.log("Lever clicked");
	// Animate the lever pull
	const lever = document.getElementById("lever-handle");
	lever.style.transform = "translateX(-50%) rotate(10deg)";

	soundManager.play("switch");

	// After a short delay, check the solution
	setTimeout(() => {
		console.log("Checking solution...");
		checkSolution();
		// Reset lever position after checking
		setTimeout(() => {
			lever.style.transform = "translateX(-50%) rotate(-20deg)";
			soundManager.play("switch");
		}, 1000);
	}, 300);
});

// Remove the old button from the HTML if it exists
const oldButton = document.querySelector("button");
if (oldButton) {
	oldButton.remove();
}

// Add to the beginning of script.js
const fontToggle = document.getElementById("font-toggle");

fontToggle.addEventListener("change", function () {
	if (this.checked) {
		document.body.classList.add("body-medievalsharp");
	} else {
		document.body.classList.remove("body-medievalsharp");
	}
});
