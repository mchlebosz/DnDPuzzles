class SoundManager {
	constructor() {
		this.sounds = {
			success: document.getElementById("success-sound"),
			error: document.getElementById("error-sound"),
			drop: document.getElementById("drop-sound"),
			return: document.getElementById("return-sound"),
		};

		this.audioEnabled = false;
		this.pendingSounds = [];

		// More comprehensive interaction handling
		const enableAudio = () => {
			this.audioEnabled = true;
			// Play any pending sounds
			this.pendingSounds.forEach((soundName) => this.play(soundName));
			this.pendingSounds = [];

			// Remove all event listeners after first interaction
			document.body.removeEventListener("click", enableAudio);
			document.body.removeEventListener("keydown", enableAudio);
			document.body.removeEventListener("touchstart", enableAudio);
		};

		// Listen for multiple types of interactions
		document.body.addEventListener("click", enableAudio);
		document.body.addEventListener("keydown", enableAudio);
		document.body.addEventListener("touchstart", enableAudio);
	}

	play(soundName) {
		if (!this.audioEnabled) {
			// Store the sound to play after interaction
			if (!this.pendingSounds.includes(soundName)) {
				this.pendingSounds.push(soundName);
			}
			return;
		}

		const sound = this.sounds[soundName];
		if (sound) {
			// Create a clone to allow multiple rapid plays
			const soundClone = sound.cloneNode();
			soundClone.volume = sound.volume;
			soundClone.currentTime = 0;

			soundClone.play().catch((e) => {
				console.log("Audio play failed:", e);
				// Fallback to original sound if clone fails
				sound.currentTime = 0;
				sound.play().catch((e) => console.log("Fallback audio play failed:", e));
			});

			// Clean up after playback
			soundClone.onended = () => {
				soundClone.remove();
			};
		}
	}
}

const soundManager = new SoundManager();
