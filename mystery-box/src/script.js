// filepath: c:\Users\mateu\OneDrive\Dokumenty\Code\DnDPuzzles\threejs-box-project\src\script.js

class BoxAnimation {
	constructor() {
		this.scene = null;
		this.camera = null;
		this.renderer = null;
		this.box = null;
		this.timer = null;
		this.timerInterval = null;
		this.timeLeft = 30;
		this.boxLifted = false;
		this.boxOpened = false;
		this.timerStarted = false;
		this.shouldFloat = false;
		this.timerBar = null;
		this.timerPie = null;

		this.init();
	}

	init() {
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setClearColor(0x808080); // Gray background
		this.renderer.shadowMap.enabled = true;
		document.getElementById("container").appendChild(this.renderer.domElement);

		this.createBox();
		this.addLights();
		this.createTimerPie();
		this.camera.position.set(0, 1.5, 3);
		this.camera.lookAt(0, 0.8, 0); // Focus more on box area

		this.animate();

		this.addTimeButton3D = this.createCircularButton(0x00ff00, -1.5, 3);
		this.resetButton3D = this.createCircularButton(0xff0000, 1.5, 3);

		this.addTimeButton3D.position.set(-1.4, -0.95, 0.2);
		this.resetButton3D.position.set(1.4, -0.95, 0.2);

		// Add buttons to the scene explicitly
		this.scene.add(this.addTimeButton3D);
		this.scene.add(this.resetButton3D);

		this.addInteractivity();
	}

	createBox() {
		const geometry = new THREE.BoxGeometry();
		const material = new THREE.MeshPhysicalMaterial({
			color: 0x00ff00,
			metalness: 0.5,
			roughness: 0.2,
			clearcoat: 0.3,
			clearcoatRoughness: 0.1,
		});
		const materials = [
			new THREE.MeshPhysicalMaterial(material), // Right face
			new THREE.MeshPhysicalMaterial(material), // Left face
			new THREE.MeshPhysicalMaterial(material), // Top face
			new THREE.MeshPhysicalMaterial(material), // Bottom face
			new THREE.MeshPhysicalMaterial(material), // Front face
			new THREE.MeshPhysicalMaterial(material), // Back face
		];
		this.box = new THREE.Mesh(geometry, materials);
		this.box.castShadow = true;
		this.box.receiveShadow = true;
		this.box.position.y = -0.5; // Set initial position on the ground
		this.scene.add(this.box);

		const planeGeometry = new THREE.PlaneGeometry(10, 10);
		const planeMaterial = new THREE.MeshPhysicalMaterial({
			color: 0x808080,
			metalness: 0.3,
			roughness: 0.8,
		});
		const plane = new THREE.Mesh(planeGeometry, planeMaterial);
		plane.rotation.x = -Math.PI / 2;
		plane.position.y = -1;
		plane.receiveShadow = true;
		this.scene.add(plane);
	}

	createCircularButton(color, x, z) {
		const buttonGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 32);
		const buttonMaterial = new THREE.MeshPhysicalMaterial({
			color: color,
			metalness: 0.5,
			roughness: 0.2,
			clearcoat: 0.3,
			clearcoatRoughness: 0.1,
		});
		const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
		//.rotation.x = -Math.PI / 2; // Lay flat on the floor

		button.receiveShadow = true;
		button.position.set(x, -0.95, z);
		button.castShadow = true;
		this.scene.add(button);
		return button;
	}

	createTimerPie() {
		const pieGeometry = new THREE.CylinderGeometry(0.9, 0.9, 0.1, 32, 1, false, 0, Math.PI * 2); // Increased thickness to 0.2
		const pieMaterial = new THREE.MeshPhysicalMaterial({
			color: 0x00ff00,
			metalness: 0.5,
			roughness: 0.2,
			clearcoat: 0.3,
			clearcoatRoughness: 0.1,
		});
		this.timerPie = new THREE.Mesh(pieGeometry, pieMaterial);
		this.timerPie.position.set(0, -0.9, -1.9); // Slightly above the ground
		this.timerPie.castShadow = true;
		this.timerPie.receiveShadow = true;
		this.scene.add(this.timerPie);
	}

	addLights() {
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Increased intensity to 1.0
		this.scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity to 1.5
		directionalLight.position.set(5, 5);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.width = 1024;
		directionalLight.shadow.mapSize.height = 1024;
		this.scene.add(directionalLight);
	}

	startTimer() {
		this.timer = document.getElementById("timer");
		this.updateTimerDisplay();

		soundManager.loop("ticking");
		this.timerInterval = setInterval(() => {
			this.timeLeft--;
			this.updateTimerDisplay();
			if (this.timeLeft <= 0) {
				clearInterval(this.timerInterval);
				this.boxLifted = false;
				this.boxOpened = true;
			}
		}, 1000);
	}

	updateTimerDisplay() {
		this.timer.innerText = `Time Left: ${this.timeLeft} seconds`;
		this.updateTimerPie();
	}

	updateTimerPie() {
		if (this.timerPie) {
			const percentage = this.timeLeft / 30;
			this.timerPie.geometry.dispose();
			this.timerPie.geometry = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32, 1, false, 0, Math.PI * 2 * percentage); // Increased thickness to 0.2
			this.timerPie.material.color.set(percentage > 0.5 ? 0x00ff00 : percentage > 0.2 ? 0xffff00 : 0xff0000); // Green, Yellow, Red
		}
	}

	addTime() {
		if (!this.timerStarted) {
			this.startTimer();
			this.timerStarted = true;
			this.shouldFloat = true;
		}
		if (this.timeLeft <= 25) {
			this.timeLeft += 5;
		} else {
			this.timeLeft = 30; // Reset to 30 seconds if more than 25 seconds left
		}
		this.liftBox();
	}

	resetTimer() {
		if (!this.timerStarted) {
			this.startTimer();
			this.timerStarted = true;
			this.shouldFloat = true;
		}
		clearInterval(this.timerInterval);
		this.timeLeft = 30;
		this.boxLifted = false;
		this.boxOpened = false;
		this.box.material[2].transparent = false; // Reset top face transparency
		this.box.material[2].opacity = 1; // Reset top face opacity
		this.startTimer();
		this.liftBox();
	}

	liftBox() {
		if (this.box.position.y < 2) {
			this.box.position.y += 0.05;
		} else {
			this.boxLifted = true;
		}
	}

	dropBox() {
		soundManager.stop("ticking");

		this.box.rotation.x = 0; // Reset rotation on X-axis
		this.box.rotation.y = 0; // Reset rotation on Y-axis
		this.box.rotation.z = 0; // Reset rotation on Z-axis
		if (this.box.position.y > -0.5) {
			this.box.position.y -= 0.02;
		} else if (this.boxOpened) {
			if (!this.lid) {
				// Create the top lid of the box
				const lidGeometry = new THREE.BoxGeometry(1, 0.1, 1);
				const lidMaterial = new THREE.MeshPhysicalMaterial({
					color: 0x00ff00,
					metalness: 0.5,
					roughness: 0.2,
					clearcoat: 0.3,
					clearcoatRoughness: 0.1,
				});

				this.lid = new THREE.Mesh(lidGeometry, lidMaterial);

				// Create a group to act as the pivot for the lid
				this.lidGroup = new THREE.Group();

				// Move the lid so that its back edge (hinge) is at the group's center
				this.lid.position.set(0, 0, 0.5); // z = half depth (since box is 1 deep)

				// Add the lid to the group
				this.lidGroup.add(this.lid);

				// Position the group at the hinge location of the box
				this.lidGroup.position.set(this.box.position.x, this.box.position.y + 0.5, this.box.position.z - 0.5);

				this.scene.add(this.lidGroup);

				// Make all faces of box two-sided
				this.box.material.forEach((material) => {
					material.side = THREE.DoubleSide;
				});

				// Set front face of the box to be single sided
				this.box.material[4].side = THREE.FrontSide;

				// Hide the top face of the box
				this.box.material[2].transparent = true;
				this.box.material[2].opacity = 0;

				this.addObjectsInsideBox();
			}

			// Smoothly rotate the lid to simulate opening
			if (this.lidGroup.rotation.x > -Math.PI / 2) {
				this.lidGroup.rotation.x -= 0.02;
			}
		}
	}

	addObjectsInsideBox() {
		const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
		const sphereMaterial = new THREE.MeshPhysicalMaterial({
			color: 0xff0000,
			metalness: 0.5,
			roughness: 0.2,
			clearcoat: 0.3,
			clearcoatRoughness: 0.1,
		});
		const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
		sphere.position.set(this.box.position.x, this.box.position.y + 0.2, this.box.position.z);
		this.scene.add(sphere);

		const cubeGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
		const cubeMaterial = new THREE.MeshPhysicalMaterial({
			color: 0x0000ff,
			metalness: 0.5,
			roughness: 0.2,
			clearcoat: 0.3,
			clearcoatRoughness: 0.1,
		});
		const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
		cube.position.set(this.box.position.x + 0.4, this.box.position.y + 0.2, this.box.position.z);
		this.scene.add(cube);
	}

	addInteractivity() {
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();

		window.addEventListener("mousedown", (event) => {
			//show button down
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			raycaster.setFromCamera(mouse, this.camera);
			const intersects = raycaster.intersectObjects([this.addTimeButton3D, this.resetButton3D]);
			if (intersects.length > 0) {
				const clickedButton = intersects[0].object;
				// Animate button click
				clickedButton.scale.set(0.8, 0.8, 0.8);
				soundManager.play("click_in");
			}
		});
		window.addEventListener("mouseup", (event) => {
			//show button up and execute action
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			raycaster.setFromCamera(mouse, this.camera);
			const intersects = raycaster.intersectObjects([this.addTimeButton3D, this.resetButton3D]);
			if (intersects.length > 0) {
				const clickedButton = intersects[0].object;
				// Animate button click
				clickedButton.scale.set(1, 1, 1);
				// Perform button action
				soundManager.play("click_out");

				if (clickedButton === this.addTimeButton3D) {
					this.addTime();
				} else if (clickedButton === this.resetButton3D) {
					this.resetTimer();
				}
			}
		});
	}

	animate() {
		requestAnimationFrame(() => this.animate());

		if (this.shouldFloat && this.timeLeft > 0 && !this.boxLifted) {
			this.liftBox();
		} else if (this.timeLeft <= 0) {
			this.dropBox();
		}

		if (this.boxLifted) {
			this.box.rotation.x += 0.01; // Rotate box on X-axis
			this.box.rotation.y += 0.01; // Rotate box on Y-axis
		}

		this.renderer.render(this.scene, this.camera);
	}
}

// Initialize the BoxAnimation class
const boxAnimation = new BoxAnimation();
