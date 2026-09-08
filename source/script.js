/* Variables */

let id = function(id) {
	return document.getElementById(id);
};

const c = id("c");
const disCon = document.querySelector(".disclaimer-c");

const offsetBase = 12;
let i = 0;

let cached = {};
cached.ageOptions = false;

let cache = {};
let u = {};
u.spage = 0;
u.sEnd = false;
u.bottom = false;

let s = {}; // Search object
s.q = {}; // Search object - search query
s.p = 0; // Search page
s.pCache = 1000; // Search page cache
s.loadMore = true; // Should you load more to grid?
s.gridChildNum = 0; // How many children in grid

let imsg = [] // Messaged items object

let pr = [];

let loc = new Object(); // Geolocation object

let lastIns = "aaa"; // Last insert for searchTyping()
let lastRes = ""; // Last response for searchTyping()

const gridId = "grid-c";

// let socket = null;

const p = { // Pages object
	domu: {
		t: "Domov",
		d: "Popis domova",
		c: "tp-home"
	},
	komunita: {
		t: "Komunita",
		d: "Popis zpráv",
		c: "tp-news-list"
	},
	seznamka: {
		t: "Seznamka",
		d: "Seznamkový popis",
		c: "tp-people"
	},
	ucet: {
		t: "Účet",
		d: "Měl by tu být?",
		c: "tp-ucet"
	},
	regloc: {
		t: "Registrace a přihlášení",
		d: "Měl by tu být?",
		c: "tp-log-reg"
	},
	registrace: {
		t: "Registrace",
		d: "Zaregistrujte se",
		c: "tp-reg"
	},
	clanek: {
		t: "Článek",
		d: "Popis",
		c: "tp-news"
	},
	nothing: {
		t: "Stránka nenalezena",
		d: "404",
		c: "tp-not-found"
	},
	chat: {
		t: "Chat",
		d: "Popis",
		c: "tp-chat"
	}
};

window.onerror = function(error, url, line) { // Handle errors early

	if (c.innerHTML == "") {
		console.error(`${error}; ${url}; ${line}`);
		c.innerHTML = '<article id=error><svg width=128 height=128 viewBox="0 0 64 64"><path d="m31,8l25,48 -48,0zm0,18v14m0,6v.5"></svg><h1>Někde se stala chyba</h1><a href="window.location.reload()">Obnovit stránku</a></article>'
	}
};

/* Geolocation */

function setCoor(lat, lon, name = "") {
	if (name != "") {
		const search = id("search");
		search.value = name;
	}
	u.lat = lat;
	u.lon = lon;

	const results = document.querySelector("#place .results");
	// u.spage = 0;
	// setGrid();
	resetProfileSearch();
	results.innerHTML = "";
	disclaimer("Poloha nastavena", 2);
}

function getLoc() {
	navigator.geolocation.getCurrentPosition((pos) => {
			loc = pos.coords;
			setCoor(loc.latitude.toString(), loc.longitude.toString());
		},
		(err) => {
			console.warn(`ERROR(${err.code}): ${err.message}`);
			disclaimer("Určení polohy selhalo", 3)
		},
		[false, 5000, 0]);
}

/* Register */

async function register() {
	const newUser = {
		name: id("reg-username").value, // Must be 3-20 chars
		password: id("reg-password").value, // Must be at least 8 chars
		age: Number(id("reg-age").value),
		picture: id("reg-picture").value
	};

	try {
		// Send POST request to /send
		const response = await fetch("https://api.qseznamka.cz/send", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(newUser)
		});

		// Parse response
		const data = await response.json();
		console.log("Registration Response:", data);

		if (response.ok) {
			disclaimer("Uživatel zaregistrován.", 2);
		} else {
			disclaimer("Chyba při registraci", 3);
			console.error("Error: " + data.message);
		}
	} catch (err) {
		disclaimer("Chyba připojení", 3);
		console.error("Network Error:", err);
	}
}

/* Check session */

async function checkSession() {
	try {
		const response = await fetch("https://api.qseznamka.cz/me", {
			method: "GET",
			headers: {
				"Content-Type": "application/json"
			},
			// Important: This tells the browser to send the 'my-kata-cookie'
			credentials: "include"
		}); /*.then(response => {if(response.status === 401) {console.log("Nepřihlášen (401)"); return false;}})*/
		if (response.ok) {
			const userData = await response.json();
			u.name = userData.name;
			u.id = userData.id;
			u.picture = userData.picture;

			// Update your UI here
			//id("username-display").innerText = userData.name;
			if (u.name === undefined) {
				return false
			} else {
				id("chat-button").style.display = "block";
				return true;
			}
		} else {
			// disclaimer("Nejste přihlášeni");
			// Show login button
			return false;
		}
	} catch (err) {
		disclaimer("Chyba ověření přihlášení", 3);
		console.error("Error checking session:", err);
		return false;
	}
}

/* Login */

async function login() {
	const name = document.getElementById("log-username").value;
	const password = document.getElementById("log-password").value;

	try {
		const response = await fetch(`https://api.qseznamka.cz/login`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include",
			body: JSON.stringify({
				name,
				password
			})
		});

		// 1. Debug: Check status first
		console.log(`Server responded with status: ${response.status}`);

		// 2. Read raw text first (to prevent JSON crash on empty/HTML bodies)
		const text = await response.text();
		console.log("Raw response body:", text); // <--- LOOK AT THIS IN CONSOLE

		// 3. Handle empty response explicitly
		if (!text) {
			throw new Error("Server returned an empty response.");
		}

		// 4. Parse manually
		const data = JSON.parse(text);

		if (response.ok && data.status === "success") {
			disclaimer("Úspěšně přihlášeno", 2);
			checkSession();
			id("chat-button").style.display = "block";
			connectWs();
		} else {
			disclaimer(data.message || "Přihlášení selhalo", 3);
			console.log("Login failed:", data);
		}
	} catch (err) {
		console.error("Login Error:", err);
		disclaimer("Chyba přihlášení (viz konzole)", 3);
	}
}

// 2. WEBSOCKET CONNECTION
let socket;
let reconnectTimeout = null;

function connectWs() {
	// Pokud se už připojujeme nebo je otevřeno, nic nedělej
	if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
		return;
	}

	socket = new WebSocket("wss://api.qseznamka.cz/ws");

	socket.onopen = () => {
		// Pokud jsme měli naplánovaný pokus o reconnect, zrušíme ho
		clearTimeout(reconnectTimeout);
		console.log("WS Connected");
	};

	socket.onclose = (event) => {
		console.log("WS Disconnected. Reconnecting in 3s...", event.reason);

		// Zkusit se znovu připojit za 3 sekundy
		clearTimeout(reconnectTimeout);
		reconnectTimeout = setTimeout(() => {
			connectWs();
		}, 3000);
	};

	socket.onerror = (error) => {
		console.error("WS Error:", error);
		socket.close(); // Force close to trigger onclose reconnect
	};

	socket.onmessage = (event) => {
		const msg = JSON.parse(event.data);
		displayMessage(msg.content, false); /*`User ${msg.from_user_id}: ${msg.content}`*/
	};
}


// 3. SEND MESSAGE
function sendMessage() {
	const receiverId = document.getElementById("receiver-id").value;
	const content = document.getElementById("msgsend").value;

	if (!receiverId || !content) {
		disclaimer("Nejprve zvolte uživatele a napište zprávu");
		return;
	}

	// Construct the payload matching 'WsIncomingMessage' struct
	const payload = {
		to_user_id: parseInt(receiverId),
		content: content
	};

	if (socket && socket.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify(payload));

		// Rust backend sends to receiver, but usually not back to sender.
		// We display it locally so we know we sent it.
		displayMessage( /*`Me (to ${receiverId}): ${content}`*/ content, true);

		// Clear input
		document.getElementById("msgsend").value = "";
	} else {
		disclaimer("Socket not connected.");
	}
}

function displayMessage(text, you) {
	const list = document.getElementById("messagebox");
	const msg = document.createElement("div");
	const cla = you ? "you" : "them";
	msg.classList.add(cla);
	msg.textContent = text;
	list.appendChild(msg);
}
/* Profiles */

async function getProfiles() {

	try {

		// Get input values

		const minAge = id("min-age").value;
		const maxAge = id("max-age").value;
		const distance = id("distance").value;
		const search = id("search").value;

		s.q.minAge = minAge;
		s.q.maxAge = maxAge;
		s.q.distance = distance;
		s.q.bar = search;

		// Build query

		let query = "https://api.qseznamka.cz/search";
		let queryArray = [];

		if (minAge != "15" || maxAge != "99") {
			queryArray.push(`age_min=${minAge}&age_max=${maxAge}`);
		}

		if (Object.hasOwn(u, "lat") && distance != "none") {
			const range = Number(distance) * 0.01 * .5;
			const minLat = u.lat - range;
			const maxLat = u.lat + range;
			const minLon = u.lon - range;
			const maxLon = u.lon + range;
			queryArray.push(`lat_min=${minLat}&lat_max=${maxLat}&lon_min=${minLon}&lon_max=${maxLon}`);
		}

		if (s.p > 0) {
			queryArray.push("off=" + s.p * offsetBase);
			s.pCache = s.p;
		}

		for (i = 0; i < queryArray.length; i++) {
			if (i == 0) {
				query += "?"
			} else query += "&";
			query += queryArray[i];
		}

		// Get response from query

		const response = await fetch(query);

		if (!response.ok) {
			throw new Error(`Response status: ${response.status}`);
		}

		const result = await response.json();
		pr = pr.concat(result);

		return result;

	} catch (error) {

		console.error(error.message);
		disclaimer("Nepodařilo se načíst Grid", 3);

		return null;

	}
}

async function generateProfile(profile, place) {
	let gItems = "";

	gItems += `<a class="profile-thumb" href="#">`;

	if (profile.picture == null || profile.picture == "") {

		gItems += `<svg viewBox="0 0 64 64" alt="profilovka ${profile.name}"><use href="#ulogo"></svg>`;

	} else {

		gItems += `<img alt="profilovka ${profile.name}" src="https://qseznamka.cz/img/u/profile/${profile.picture}" fetchpriority=high>`

	}

	gItems += `<div class="profile-thumb-text"><span>${profile.name}</span><div class="online"></div></div></a>`;

	place.innerHTML = gItems;
}

async function showProfiles() {

	try {

		const grid = id(gridId);

		// Create profiles

		const profiles = await getProfiles();

		if (profiles) {

			let gItems = "";

			for (i = 0; i < profiles.length; i++) {

				gItems += `<a class="profile-thumb" href="#">`;

				if (profiles[i].picture == null || profiles[i].picture == "") {

					gItems += `<svg viewBox="0 0 64 64" alt="profilovka ${profiles[i].name}"><use href="#ulogo"></svg>`;

				} else {

					gItems += `<img alt="profilovka ${profiles[i].name}" src="https://qseznamka.cz/img/u/profile/${profiles[i].picture}" fetchpriority=high>`

				}

				gItems += `<div class="profile-thumb-text"><span>${profiles[i].name}</span><div class="online"></div></div></a>`;

			}

			if (document.querySelector(".profile-thumb") == null) {
				grid.innerHTML = gItems;
			} else {
				grid.innerHTML += gItems;
			}

			const currentChildNum = grid.childElementCount;

			if (s.gridChildNum != currentChildNum) {
				s.gridChildNum = currentChildNum;
				s.p++;
			} else {
				s.loadMore = false;
			}

		} else {

			disclaimer("Nepodařilo se stáhnout profily", 3);

		}

	} catch (error) {

		console.error("Failed to load profiles:", error);
		disclaimer("Nepodařilo se načíst profily", 3);

	}

}

function resetProfileSearch() {

	const grid = id(gridId);

	pr = [];
	s.p = 0;
	s.loadMore = true;
	s.gridChildNum = 0;
	grid.innerHTML = "";

	showProfiles();

}

/* Search cities */

async function searchTyping() {

	let citySearch = search.value;
	let cities;

	const results = document.querySelector("#place .results");

	if (citySearch.length > 1) {
		const search = id("search");
		let cityArray = [];
		const name = citySearch.substring(0, 2).toLowerCase();
		try {
			if (lastIns == name) {
				cities = lastRes;
			} else {
				const response = await fetch(`/data/cities/${name}.json`);
				cities = await response.json();

				lastRes = cities;
				lastIns = name;
			}

			for (const city of cities) {
				if (city.name.substring(0, citySearch.length).toLowerCase() == citySearch.toLowerCase()) {
					cityArray.push([city.name, city.lat, city.lon]);
				}
			}

			results.innerHTML = "";

			if (cityArray.length == 0) {
				results.innerHTML = "<button style='text-align: center;'><i>Obec nenalezena</i></button>";
			} else
				for (i = 0; i < cityArray.length; i++) {
					results.innerHTML += `<button onclick="setCoor(${cityArray[i][1]},${cityArray[i][2]},'${cityArray[i][0]}')">${cityArray[i][0]}</button>`;
				}
		} catch (e) {
			console.log(`Selhal fetch měst: ${e}`);
			results.innerHTML = "<button style='text-align: center;'><i>Obec nenalezena</i></button>";
		}

	} else {
		results.innerHTML = "";
	}

}

/* Disclaimer */

function disclaimer(text, type = 0) {
	const disc = document.createElement("span");
	disc.classList.add("disclaimer");
	disc.innerHTML = `<span>${text}</span><button onlick="() => {disc.remove()}"><svg viewBox="0 0 64 64"><path d="m8,8l48,48m-48,0l48,-48"></svg></button>`;

	switch (type) {
		case 1: // Warning
			disc.style.background = "#330";
			break;
		case 2: // Success
			disc.style.background = "#030";
			break;
		case 3: // Error
			disc.style.background = "#300";
			break;
	}

	disCon.appendChild(disc);
	setTimeout(() => {
		disc.remove()
	}, 3000);
}

/* Cookies */

async function get_c() {
	try {
		const response = await fetch("https://api.qseznamka.cz/get_session", {
			credentials: 'include'
		});
		if (!response.ok) {
			throw new Error(`Response status: ${response.status}`);
		}
		const result = await response.text();
		console.log(result);
	} catch (error) {
		console.error(error.message);
	}
}
async function set_c() {
	try {
		const response = await fetch("https://api.qseznamka.cz/set_session", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				message: "123go"
			}),
			credentials: "include"
		});
		if (!response.ok) {
			throw new Error(`Response status: ${response.status}`);
		}
		const result = await response.text();
		console.log(result);
	} catch (error) {
		console.error(error.message);
	}
}

function scroll() {
	// if (u.loc == "/seznamka" && u.sEnd == false) {
	if (u.loc == "/seznamka" && pr.length % 12 == 0) {
		const cR = c.getBoundingClientRect();
		if (cR.bottom < window.innerHeight && s.loadMore && s.p != s.pCache) {
			showProfiles();
		}
	}
}

/* Load documents */

function loadDoc(page) {
	document.title = `${p[page].t} - Qseznamka.cz`;
	const template = id(p[page].c);
	// c.innerHTML = "";
	//
	const articles = document.querySelectorAll("#c > .page");
	console.log(articles);
	if (articles !== null) {
		for (i = 0; i < articles.length; i++) {
			articles[i].style.display = "none";
		}
	}
	let arName = id(p[page].c.slice(3));
	if (document.body.contains(arName)) {
		arName.style.display = ""
	} else {
		c.appendChild(template.content.cloneNode(true));
	}
	if (id(page)) id(page).classList.add("active");
}

/* Chat*/

async function messaged() {
	try {
		if (u.id === undefined) return;
		const response = await fetch("https://api.qseznamka.cz/messaged", {
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			}
		});
		const items = await response.json();
		const itemlist = document.querySelector(".items");

		let gitems = "";

		for (let i = 0; i < items.length; i++) {
			imsg.push(items[i].id)
			gitems += "<button id='m" + items[i].id + "' class='item'>";
			if (items[i].picture != null && items[i].picture != "") {

				gitems += "<img src='https://qseznamka.cz/img/u/profile/" + items[i].picture + "' alt='Profilový obrázek uživatele " + items[i].name + "'>";
			}
			gitems += "<span class='name'>" + items[i].name + "</span></button>";

			itemlist.innerHTML = gitems;
		}
	} catch (err) {
		console.log(err)
	}
}

/* Routing */

function route(e) {
	e.preventDefault();
	urlRoute();
}

const urlRoute = (event) => {
	event = event || window.event;
	event.preventDefault();
	window.history.pushState({}, "", event.target.href);
	urlLocationHandler();
};
const urlLocationHandler = async () => {
	const location = window.location.pathname;
	if (location.length == 0) {
		location = "/";
	}
	u.loc = location;
	[].forEach.call(document.querySelectorAll('nav a'), function(el) {
		el.classList.remove('active');
	});
	let page = "";
	document.body.scrollTop = 0;
	switch (location) {
		case "/":
			loadDoc("domu");
			break;
		case "/komunita":
			loadDoc("komunita");
			break;
		case "/seznamka":
			loadDoc("seznamka");

			if (cached.ageOptions == false) {

				const minAge = id("min-age");
				const maxAge = id("max-age");

				for (i = 15; i < 100; i++) {
					const vMax = 114 - i;
					minAge.innerHTML += `<option value="${i}">${i}</option>`;
					maxAge.innerHTML += `<option value="${vMax}">${vMax}</option>`;
				}

				cached.ageOptions = true;

			}



			const search = id("search");
			const results = document.querySelector("#place .results");
			let cityArray = [];

			const grid = document.querySelector(".profile-grid");
			if (Object.hasOwn(u, "s")) {
				const distance = id("distance");
				minAge.value = u.s.minAge;
				maxAge.value = u.s.maxAge;
				search.value = u.s.bar;
				distance.value = u.s.distance;
			}
			resetProfileSearch();

			break;
		case "/ucet":
			if (await checkSession()) {
				loadDoc("ucet");
				id("ucet-username").innerHTML = ("Zdravím " + u.name + " 👋");
				const pic = id("ucet-picture");
				generateProfile(u, pic);
			} else {
				loadDoc("regloc");
			}
			break;
		case "/clanek":
			loadDoc("clanek");
			break;
		case "/chat":
            if (checkSession()) {
                loadDoc("chat");
                connectWs();
                await messaged();
                let params = new URLSearchParams(document.location.search);
                const iid = params.get("id");
                if (iid != null && iid != u.id) {
                    if (imsg.find(i => i === iid) != undefined) {
                        id(iid).style.background = "#444";
                    } else {
                        const name = params.get("jmeno");
                        const iel = document.createElement("div");
                        iel.classList.add("item");
                        if (name != null) {
                            iel.innerHTML = "<span class='name'>" + name + "</span>";
                        } else {
                            iel.innerHTML = "<span class='name'>Zpráva pro id " + iid + "</span>";
                        }
                        iel.style.background = "#444";
                    }
                    id("receiver-id").value = iid;
                }
            } else document.location.href = '/ucet'
			
			break;
		default:
			loadDoc("nothing");
			break;
	}
};

document.addEventListener("visibilitychange", () => {
	if (u.id === undefined) return;

	if (document.visibilityState === "visible") {
		console.log("Tab focused - checking connection...");

		// Pokud je socket zavřený, hned ho zkusíme nahodit
		if (!socket || socket.readyState === WebSocket.CLOSED) {
			connectWs();
		}
	}
});


/* Window events */

window.onscroll = function() {
	scroll()
};
window.onresize = function() {
	scroll()
};
window.onpopstate = urlLocationHandler;
window.route = urlRoute;
urlLocationHandler();

checkSession();