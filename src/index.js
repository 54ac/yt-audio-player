import "./main.css";

var audio = new Audio();
var entries = [];
var data = {};
var duration,
	replayButton,
	repeatButton,
	shuffleButton,
	playButton,
	thumbnail,
	volumeOffButton,
	skipNextButton,
	skipPreviousButton,
	playlistDeleteButton,
	progressBar,
	getURL,
	shuffle,
	randomNumber,
	found;

function convertTime(sec) {
	//converts seconds into mm:ss and adds leading 0s when necessary
	return `${Math.floor(sec / 60)}:${(
		"0" +
		(sec - Math.floor(sec / 60) * 60)
	).substr(-2)}`;
}

function tickerInterval(action) {
	let interval;
	if (action === "set") {
		interval = setInterval(() => {
			progressBar.value = audio.currentTime;
			document.getElementById("currentTime").textContent = convertTime(
				Math.floor(audio.currentTime)
			);
		}, 500);
	} else if (action === "clear") {
		clearInterval(interval);
	}
}

function checkThumbnail(url) {
	//this checks whether a high-res thumbnail exists
	fetch("api/img?url=" + url)
		.then(res => res.json())
		.then(json => {
			if (json.status === 200) {
				document.getElementById("thumbnail").src = url;
			} else {
				document.getElementById("thumbnail").src = url.replace(
					"/maxresdefault",
					"/hqdefault"
				);
			}
		});
}

function playSong(url) {
	//only swap the source url instead of creating a whole new thing
	tickerInterval("clear");
	audio.pause();
	audio.src = url;
	if (audio.src) {
		//skip button visibility
		for (let entry of document.getElementById("playlist").rows) {
			if (entry.id === audio.src && !entry.nextElementSibling) {
				skipNextButton.style.visibility = "hidden";
			} else if (entry.id === audio.src && entry.nextElementSibling) {
				skipNextButton.style.visibility = "";
			}
			if (entry.id === audio.src && !entry.previousElementSibling) {
				skipPreviousButton.style.visibility = "hidden";
			} else if (entry.id === audio.src && entry.previousElementSibling) {
				skipPreviousButton.style.visibility = "";
			}
		}

		document.getElementById("player").style.display = "initial";

		document.getElementById("thumbnail").style.visibility = "hidden";
		var thumbArr = data[url].player_response.videoDetails.thumbnail.thumbnails;
		checkThumbnail(
			thumbArr[thumbArr.length - 1].url.replace("/hqdefault", "/maxresdefault")
		);
		document.getElementById("controls").style.visibility = "hidden";
		progressBar.style.visibility = "hidden";
		document.getElementById("timeStamps").style.visibility = "hidden";

		document.getElementById("nowPlaying").className = "material-icons";
		document.getElementById("nowPlaying").style.fontSize = "54px";
		document.getElementById("nowPlaying").textContent = "cached";

		progressBar.max = data[url].length_seconds;
		duration = data[url].length_seconds; //audio.duration returns incorrect values

		audio.oncanplay = () => {
			audio.play();
			tickerInterval("set");

			document.getElementById("currentTime").textContent = convertTime(
				Math.floor(audio.currentTime)
			);
			document.getElementById("totalTime").textContent = convertTime(
				data[url].length_seconds
			);

			document.getElementById("nowPlaying").className = "";
			document.getElementById("nowPlaying").style.fontSize = "18px";
			document.getElementById(
				"nowPlaying"
			).textContent = `${data[url].title} – ${data[url].author.name}`;

			document.title = data[url].title + " – The YouTube Audio Player";
			document.getElementById("thumbnail").style.visibility = "visible";
			document.getElementById("controls").style.visibility = "visible";
			progressBar.style.visibility = "visible";
			document.getElementById("timeStamps").style.visibility = "visible";
			if (!audio.paused) playButton.textContent = "pause";
		};
	}
}

function skipSong(direction) {
	if (shuffle) {
		do {
			randomNumber = Math.floor(
				Math.random() * document.getElementById("playlist").rows.length
			);
			if (
				document.getElementById("playlist").rows[randomNumber].id !== audio.src
			) {
				playSong(document.getElementById("playlist").rows[randomNumber].id);
				found = true;
			} else found = false;
		} while (!found);
	} else {
		for (let entry of document.getElementById("playlist").rows) {
			if (direction === "fwd") {
				if (entry.id === audio.src && entry.nextElementSibling) {
					playSong(entry.nextElementSibling.id);
					break;
				}
			} else if (direction === "back") {
				if (entry.id === audio.src && entry.previousElementSibling) {
					playSong(entry.previousElementSibling.id);
					break;
				}
			}
		}
	}
}

function addSong(url) {
	let songURL;

	function denied() {
		document.getElementById("urlInput").disabled = true;
		document.getElementById("submitButton").disabled = true;
		document.getElementById("submitButton").value = "cancel";
		setTimeout(() => {
			document.getElementById("urlInput").disabled = false;
			document.getElementById("submitButton").disabled = false;
			document.getElementById("submitButton").value = "check";
		}, 1000);
	}

	try {
		if (url) songURL = url;
		else {
			songURL = new URL(document.getElementById("urlInput").value);
			console.log(songURL);
			if (songURL.hostname.includes("youtube.com")) {
				songURL = songURL.searchParams.get("v");
			} else if (songURL.hostname.includes("youtu.be")) {
				songURL = songURL.pathname.slice(1, songURL.pathname.length);
			} else throw "wrong URL";
			if (!url && entries.includes(songURL)) throw "URL already in the list";
		}
	} catch (err) {
		denied();
		throw err;
	}

	document.getElementById("submitButton").value = "arrow_downward";
	document.getElementById("urlInput").disabled = true;
	document.getElementById("submitButton").disabled = true;
	return fetch("api/get?url=" + songURL)
		.then(res => res.json())
		.then(json => {
			let entry = document.getElementById("playlist").insertRow(-1); //this whole table is just my way of making an ordered list that isn't terrible
			entry.id = json.directURL; //assign direct url to this cell

			let cell0 = entry.insertCell(0);
			cell0.className = "playlistIndex"; //counter in css
			let timeStamp = convertTime(json.data.length_seconds);

			let cell1 = entry.insertCell(1);
			cell1.id = songURL; //assign video id to this cell
			cell1.textContent = `${json.data.title} – ${json.data.author.name} (${timeStamp})`;
			cell1.addEventListener("click", () => {
				if (json.directURL !== audio.src) playSong(json.directURL);
			});
			cell1.style.textAlign = "justify";
			cell1.style.cursor = "pointer";

			let deleteButton = document.createElement("i");
			deleteButton.classList.add("material-icons", "deleteButton");
			deleteButton.textContent = "cancel";
			deleteButton.style.cursor = "pointer";
			deleteButton.style.visibility = "hidden";
			deleteButton.addEventListener("click", e => {
				entries.splice(e.target.parentNode.previousElementSibling.id, 1); //id of the cell to the left which contains the video id
				localStorage.setItem("entries", JSON.stringify(entries));
				delete data[e.target.parentNode.parentNode.id];
				document
					.getElementById("playlist")
					.deleteRow(e.target.parentNode.parentNode.rowIndex);
				if (document.getElementById("playlist").rows.length < 2)
					playlistDeleteButton.style.visibility = "hidden";
			});

			let cell2 = entry.insertCell(2);
			cell2.appendChild(deleteButton);

			entries.push(songURL);
			if (document.getElementById("playlist").rows.length > 1)
				playlistDeleteButton.style.visibility = "visible";
			localStorage.setItem("entries", JSON.stringify(entries));
			data[json.directURL] = json.data;
			if (!url) document.getElementById("urlInput").value = "";
			document.getElementById("urlInput").disabled = false;
			document.getElementById("submitButton").disabled = false;
			document.getElementById("submitButton").value = "check";
			if (
				document.getElementById("playlist").rows.length < 2 &&
				!url &&
				!audio.src
			)
				playSong(json.directURL);
		})
		.catch(err => {
			denied();
			throw err;
		});
}

window.onload = async () => {
	document.getElementById("urlInput").value = "";
	document.getElementById("content").style.visibility = "visible";

	getURL = document.getElementById("getURL");
	getURL.onsubmit = e => {
		e.preventDefault();
		addSong();
	};

	playButton = document.getElementById("playButton");
	playButton.addEventListener("click", () => {
		if (playButton.textContent === "pause") {
			audio.pause();
			document.title = "❚❚ " + document.title;
			tickerInterval("clear");
			playButton.textContent = "play_arrow";
		} else {
			audio.play();
			document.title = document.title.replace("❚❚ ", "");
			document.getElementById("currentTime").textContent = convertTime(
				Math.floor(audio.currentTime)
			);
			tickerInterval("set");
			playButton.textContent = "pause";
		}
	});

	thumbnail = document.getElementById("thumbnail");
	thumbnail.addEventListener("click", () => {
		playButton.click();
	});
	thumbnail.style.cursor = "pointer";

	replayButton = document.getElementById("replayButton");
	replayButton.addEventListener("click", () => {
		audio.currentTime = 0;
		document.getElementById("currentTime").textContent = convertTime(
			Math.floor(audio.currentTime)
		);
		progressBar.value = audio.currentTime;
	});

	volumeOffButton = document.getElementById("volumeOffButton");
	volumeOffButton.addEventListener("click", () => {
		if (volumeOffButton.classList.contains("off")) {
			audio.defaultMuted = true;
			audio.muted = true;
			volumeOffButton.classList.replace("off", "on");
			volumeOffButton.style.color = "black";
		} else {
			audio.defaultMuted = false;
			audio.muted = false;
			volumeOffButton.classList.replace("on", "off");
			volumeOffButton.style.color = "gainsboro";
		}
	});

	repeatButton = document.getElementById("repeatButton");
	repeatButton.addEventListener("click", () => {
		if (repeatButton.classList.contains("off")) {
			audio.loop = true;
			repeatButton.classList.replace("off", "on");
			repeatButton.style.color = "black";
		} else {
			audio.loop = false;
			repeatButton.classList.replace("on", "off");
			repeatButton.style.color = "gainsboro";
		}
	});

	shuffleButton = document.getElementById("shuffleButton");
	shuffleButton.addEventListener("click", () => {
		if (shuffleButton.classList.contains("off")) {
			shuffle = true;
			shuffleButton.classList.replace("off", "on");
			shuffleButton.style.color = "black";
		} else {
			shuffle = false;
			shuffleButton.classList.replace("on", "off");
			shuffleButton.style.color = "gainsboro";
		}
	});

	skipNextButton = document.getElementById("skipNextButton");
	skipNextButton.addEventListener("click", () => {
		skipSong("fwd");
	});

	skipPreviousButton = document.getElementById("skipPreviousButton");
	skipPreviousButton.addEventListener("click", () => {
		skipSong("back");
	});

	playlistDeleteButton = document.getElementById("playlistDeleteButton");
	playlistDeleteButton.style.cursor = "pointer";
	playlistDeleteButton.addEventListener("click", () => {
		document.title = "The YouTube Audio Player";
		document.getElementById("playlist").innerHTML = "";
		entries = [];
		data = {};
		localStorage.removeItem("entries");
		playlistDeleteButton.style.visibility = "hidden";
	});

	progressBar = document.getElementById("progressBar");
	progressBar.addEventListener("click", e => {
		let percentage = e.offsetX / progressBar.offsetWidth;
		progressBar.value = percentage / 100;
		audio.currentTime = percentage * duration;
	});

	//why are babel workarounds necessary for async/await these days
	if (localStorage.getItem("entries"))
		for (let entry of JSON.parse(localStorage.getItem("entries")))
			await addSong(entry);

	audio.addEventListener("ended", () => {
		if (document.getElementById("playlist").rows.length > 1) {
			skipSong("fwd");
		} else {
			document.title = "The YouTube Audio Player";
			playButton.click();
		}
	});
};
