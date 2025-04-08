class SoundManager {
	constructor() {
		this.sounds = {
			ticking: document.getElementById("ticking-sound"),
			click_in: document.getElementById("click_in-sound"),
			click_out: document.getElementById("click_out-sound"),
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

	loop(soundName) {
		if (!this.audioEnabled) {
			// Store the sound to loop after interaction
			if (!this.pendingSounds.includes(soundName)) {
				this.pendingSounds.push(soundName);
			}
			return;
		}

		const sound = this.sounds[soundName];
		if (sound) {
			sound.loop = true; // Enable looping
			sound.addEventListener("ended", () => {
				sound.currentTime = 0; // Reset to the beginning
				sound.play().catch((e) => console.log("Audio loop restart failed:", e));
			});
			sound.currentTime = 0; // Ensure the sound starts from the beginning
			sound.play().catch((e) => console.log("Audio loop failed:", e));
		}
	}
	stop(soundName) {
		const sound = this.sounds[soundName];
		if (sound) {
			sound.loop = false;
			sound.pause();
			sound.currentTime = 0;
		}
	}
}

const soundManager = new SoundManager();
