const tilesContainer = document.getElementById("tiles");
const grid = document.getElementById("grid");
const cells = Array.from(document.querySelectorAll(".cell"));
const result = document.getElementById("result");

for (let i = 1; i <= 9; i++) {
	const tile = document.createElement("div");
	tile.className = "tile";
	tile.textContent = i;
	tile.dataset.value = i;
	tile.style.left = `${Math.random() * 200}px`;
	tile.style.top = `${Math.random() * 100}px`;
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
	const gridValues = cells.map((cell) => {
		const child = cell.firstChild;
		return child ? parseInt(child.dataset.value) : 0;
	});

	const isComplete = gridValues.every((v) => v !== 0);
	if (!isComplete) {
		result.textContent = "The ancient runes are incomplete...";
		result.style.color = "orange";
		return;
	}

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

	if (isValid) {
		result.textContent = "\u26CF\uFE0F The gate rumbles... It opens!";
		result.style.color = "lightgreen";
	} else {
		result.textContent = "\u274C The runes do not align. Try again.";
		result.style.color = "crimson";
	}
}
