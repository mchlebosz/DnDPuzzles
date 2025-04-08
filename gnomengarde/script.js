// Initialize the game
const grid = new HexGrid("container", {
	radius: 30,
	hexRadius: 35,
	columns: 16,
	rows: 20,
});

grid.drawGrid();

// Create initial circles with static property
[
	{ col: 6, row: 20, isStatic: true },
	{ col: 7, row: 25, isStatic: true },
	{ col: 5, row: 25, isStatic: true },
	{ col: 5, row: 35, isStatic: true },
	{ col: 7, row: 35, isStatic: true },
	{ col: 6, row: 50, isStatic: true },
	{ col: 7, row: 125, isStatic: false },
	{ col: 7, row: 135, isStatic: false },
	{ col: 7, row: 155, isStatic: false },
	{ col: 6, row: 120, isStatic: false },
	{ col: 6, row: 130, isStatic: false },
	{ col: 6, row: 150, isStatic: false },
].forEach((circle) => {
	new DraggableCircle(grid, grid.hexagons[circle.col].x, grid.hexagons[circle.row].y, circle.isStatic);
});

// Initialize counters
grid.updateCounters();
