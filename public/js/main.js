const checkRectCol = (v1, v2, dist) => {
	return(v1.x > v2.x - dist
		&& v1.x < v2.x + dist
		&& v1.y > v2.y - dist
		&& v1.y < v2.y + dist
	);
}

const getVec2f = (x, y) => {
	return {
		x,
		y,
	};
}

const Vec2f_getCopy = (v) => {
	return getVec2f(v.x, v.y);
}

const Vec2f_getMag = (v) => {
	return Math.sqrt(v.x * v.x + v.y * v.y);
}

const Vec2f_add = (v1, v2) => {
	v1.x += v2.x;
	v1.y += v2.y;
};

const Vec2f_sub = (v1, v2) => {
	v1.x -= v2.x;
	v1.y -= v2.y;
};

const Vec2f_mul = (v, x) => {
	v.x *= x;
	v.y *= x;
}

const Vec2f_getSub = (v1, v2) => {
	return getVec2f(v1.x - v2.x, v1.y - v2.y);
}

const Vec2f_normalize = (v) => {
	const mag = Vec2f_getMag(v);
	if(mag === 0){
		return;
	}
	v.x /= mag;
	v.y /= mag;
}

const Vec2f_reverse = (v) => {
	Vec2f_mul(v, -1);
}

const getNormalizedFloat = (x) => {
	if(x > 0) return 1;
	if(x < 0) return -1;
	return 0;
}

const Player = (x, y, id) => {
	const that = {};

	that.pos = getVec2f(x, y);
	that.velocity = getVec2f(0, 0);
	that.dir = getVec2f(0, 0);
	that.speed = 2.3;

	that.id = id;

	that.ready = false;

	return that;
}

const Bullet = (pos, angle, speed, spread, size, health, damage, playerId, numberId) => {
	const that = {};

	that.playerId = playerId;
	that.numberId = numberId
	that.speed = speed;
	that.health = health;
	that.damage = damage;
	that.size = Vec2f_getCopy(size);
	that.pos = Vec2f_getCopy(pos);

	that.angle = angle + Math.random() * spread - spread / 2;

	that.velocity = getVec2f(Math.cos(that.angle), Math.sin(that.angle));
	Vec2f_normalize(that.velocity);
	Vec2f_mul(that.velocity, that.speed);

	that.shouldBeRemoved = false;

	return that;
}

const Obstacle = (x, y) => {
	const that = {};

	that.pos = getVec2f(x, y);

	that.hit = false;

	that.health = 2;

	return that;
}

const Tnt = (x, y) => {
	const that = {};

	that.pos = getVec2f(x, y);

	that.hit = false;

	that.health = 2;

	that.type = "tnt";

	return that;
}

const Bush = (x, y) => {
	const that = {};

	that.pos = getVec2f(x, y);

	return that;
}

const Crate = (x, y) => {
	const that = {};

	that.pos = getVec2f(x, y);

	return that;
}

window.onload = () => {

	const socket = io();

	const c = document.createElement("canvas");
	const ctx = c.getContext("2d");
	document.body.appendChild(c);

	c.width = 800;
	c.height = 600;

	const GAME_SCREEN_WIDTH = 800;
	const GAME_SCREEN_HEIGHT = 600;
	const GAME_WIDTH = 1600;
	const GAME_HEIGHT = 1200;

	const keys = {
		w: false,
		a: false,
		s: false,
		d: false,
		q: false,
	};

	document.addEventListener("keydown", (e) => {
		keys[e.key] = true;
	});

	document.addEventListener("keyup", (e) => {
		keys[e.key] = false;
	});

	const pointer = {
		down: false,
		pos: getVec2f(0, 0),
	};

	document.addEventListener("mousemove", (e) => {
        const canvasOffset = getVec2f(c.offsetLeft, c.offsetTop);
        pointer.pos = getVec2f(e.pageX, e.pageY);

		Vec2f_sub(pointer.pos, canvasOffset);
		Vec2f_sub(pointer.pos, offset);
	});

	document.addEventListener("mousedown", () => {
		pointer.down = true;
	});

	document.addEventListener("mouseup", () => {
		pointer.down = false;
	});

	const offset = getVec2f(0, 0);

	const obstacles = [];
	const bushes = [];

	const crates = [];

	const bullets = [];
	const newBullets = [];

	let numberOfBullets = 0;

	const enemyPlayers = [];

	const player = Player(-100, -100, false);
	 
	let health = 10;

	//assault rifle specs
	const guns = [
		{
			name: "pistol",
			fireDelay: 500,
			shotSpeed: 0.6 * 1000 / 60,
			damage: 1,
			penetration: 1,
			overheat: 3,
			size: getVec2f(30, 15),
			spread: 0.1,
		},
		{
			name: "assault rifle",
			fireDelay: 200,
			shotSpeed: 1 * 1000 / 60,
			damage: 2,
			penetration: 1,
			overheat: 3,
			size: getVec2f(30, 15),
			spread: 0.1,
		},
		{
			name: "big berta",
			fireDelay: 1000,
			shotSpeed: 0.6 * 1000 / 60,
			damage: 5,
			penetration: 5,
			overheat: 8,
			size: getVec2f(60, 30),
			spread: 0.1,
		},
		{
			name: "minigun",
			fireDelay: 50,
			shotSpeed: 0.6 * 1000 / 60,
			damage: 1,
			penetration: 1,
			overheat: 1,
			size: getVec2f(30, 15),
			spread: 1,
		}
	];

	let currentGun = 0;

	let overheating = 0;

	const hits = [];

	let startGame = false;
	let stopGame = false;

	let map;
	let playerNumber;

	let spawn = getVec2f(0, 0);

	socket.on("init-state", (data) => {
		for(let i = 0; i < data.enemyPlayers.length; i++){
			enemyPlayers.push(Player(-100, -100, data.enemyPlayers[i].id));
			if(data.enemyPlayers[i].ready){
				enemyPlayers[enemyPlayers.length - 1].ready = true;
			}
		}
		player.id = data.id;
	});

	socket.on("player-connected", (data) => {
		enemyPlayers.push(Player(-100, -100, data.player.id));
	});

	socket.on("player-disconnected", (data) => {
		for(let i = 0; i < enemyPlayers.length; i++){
			if(enemyPlayers[i].id === data.id){
				enemyPlayers.splice(i, 1);
			}
		}
	});

	socket.on("ready", (data) => {
		for(let i = 0; i < enemyPlayers.length; i++){
			if(enemyPlayers[i].id === data.id){
				enemyPlayers[i].ready = true;
			}
		}
	});

	socket.on("start-game", (data) => {

		map = data.map;
		for(let i = 0; i < data.players.length; i++){
			console.log(data.players[i].id);
			if(data.players[i].id === player.id){
				playerNumber = i;
			}
		}

		startGame = true;

	});

	socket.on("stop-game", (data) => {
		stopGame = true;
	});

	socket.on("state-update", (data) => {
		for(let i = 0; i < enemyPlayers.length; i++){
			if(enemyPlayers[i].id === data.id){
				enemyPlayers[i].pos = data.playerPos;
			}
		}
		for(let i = 0; i < data.newBullets.length; i++){
			bullets.push(data.newBullets[i]);
		}
		for(let i = 0; i < data.hits.length; i++){
			if(data.hits[i].hitId === player.id){

				health -= data.hits[i].bullet.damage;

				if(health <= 0){
					player.pos = Vec2f_getCopy(spawn);
					health = 10;
					currentGun = Math.floor(Math.random() * guns.length);
				}

				for(let j = 0; j < bullets.length; j++){
					if(bullets[j].playerId === data.hits[i].bullet.playerId
					&& bullets[j].numberId === data.hits[i].bullet.numberId){
						bullets[j].shouldBeRemoved = true;
					}
				}
			}
		}
	});

	let lastShot = -guns[currentGun].fireDelay;
	let time = 0;
	let frames = 0;

	const gameLoop = (timeStamp) => {

		time = timeStamp;

		//update

		if(keys.w){
			player.dir.y = -1;
		}
		if(keys.s){
			player.dir.y = 1;
		}
		if(keys.w && keys.s || !keys.w && !keys.s){
			player.dir.y = 0;
		}
		if(keys.a){
			player.dir.x = -1;
		}
		if(keys.d){
			player.dir.x = 1;
		}
		if(keys.a && keys.d || !keys.a && !keys.d){
			player.dir.x = 0;
		}

		if(stopGame){

			stopGame = false;

			player.ready = false;

			lobbyLoop();

			return;
		}

		const g = guns[currentGun];

		if(overheating > 0){
			overheating -= 1;//0.06 * 1000 / 60;
		}

		if(pointer.down && lastShot + g.fireDelay <= time
		&& overheating < 200){
			const dir = Vec2f_getCopy(player.pos);
			Vec2f_sub(dir, pointer.pos);
			Vec2f_normalize(dir);
			Vec2f_reverse(dir);
			const b = Bullet(player.pos, Math.atan2(dir.y, dir.x), g.shotSpeed, g.spread, g.size, g.penetration, g.damage, player.id, numberOfBullets);
			bullets.push(b);
			newBullets.push(b);
			numberOfBullets++;

			lastShot = time;
			overheating += g.overheat * 1000 / 60;
		}

		player.velocity = player.dir;
		Vec2f_normalize(player.velocity);
		Vec2f_mul(player.velocity, player.speed);

		player.pos.x += player.velocity.x;

		let collidedObstacle = false;

		for(let i = 0; i < obstacles.length; i++){
			if(checkRectCol(player.pos, obstacles[i].pos, 15 + 20)){
				collidedObstacle = obstacles[i];
			}
		}

		if(collidedObstacle){
			player.pos.x = collidedObstacle.pos.x + getNormalizedFloat(-player.velocity.x) * (15 + 20);

			player.velocity.x = 0;
		}

		player.pos.y += player.velocity.y;

		collidedObstacle = false;

		for(let i = 0; i < obstacles.length; i++){
			if(checkRectCol(player.pos, obstacles[i].pos, 15 + 20)){
				collidedObstacle = obstacles[i]
			}
		}

		if(collidedObstacle){
			player.pos.y = collidedObstacle.pos.y + getNormalizedFloat(-player.velocity.y) * (15 + 20);

			player.velocity.y = 0;
		}

		for(let i = 0; i < crates.length; i++){
			if(checkRectCol(player.pos, crates[i].pos, 15 + 10)){
				//MAKE HIT CODE HERE!!! MUST THINK ABOUT SERVER STUFF TOO!!!
			}
		}

		for(let i = 0; i < bullets.length; i++){
			const b = bullets[i];

			Vec2f_add(b.pos, b.velocity);

			if(b.pos.x < 0 || b.pos.y < 0 || b.pos.x > GAME_WIDTH || b.pos.y > GAME_HEIGHT){
				b.shouldBeRemoved = true;
			}

			for(let j = 0; j < obstacles.length; j++){
				if(Vec2f_getMag(Vec2f_getSub(bullets[i].pos, obstacles[j].pos)) < 20 + 5){
					obstacles[j].hit = true;
					b.health--;
				}
			}

			for(let j = 0; j < enemyPlayers.length; j++){
				if(Vec2f_getMag(Vec2f_getSub(bullets[i].pos, enemyPlayers[j].pos)) < 15 + 5 && bullets[i].playerId !== enemyPlayers[j].id){
					hits.push({
						hitId: enemyPlayers[j].id,
						bullet: bullets[i],
					});
					b.shouldBeRemoved = true;
				}
			}

			if(b.shouldBeRemoved || b.health <= 0){
				bullets.splice(i, 1);
				i--;
			}
		}

		for(let i = 0; i < obstacles.length; i++){
			if(obstacles[i].hit){
				obstacles[i].health--;
				obstacles[i].hit = false;
			}
			if(obstacles[i].health <= 0){
				obstacles.splice(i, 1);
				i--;
			}
		}

		offset.x = GAME_SCREEN_WIDTH / 2 - player.pos.x;
		offset.y = GAME_SCREEN_HEIGHT / 2 - player.pos.y;

		if(offset.x > 0){
			offset.x = 0;
		}
		if(offset.y > 0){
			offset.y = 0;
		}

		if(offset.x < GAME_SCREEN_WIDTH - GAME_WIDTH){
			offset.x = GAME_SCREEN_WIDTH - GAME_WIDTH;
		}
		if(offset.y < GAME_SCREEN_HEIGHT - GAME_HEIGHT){
			offset.y = GAME_SCREEN_HEIGHT - GAME_HEIGHT;
		}

		//emit

		const emitData = {
			playerPos: player.pos,
			newBullets,
			hits,
			id: player.id,
		};

		socket.emit("state-update", emitData);

		newBullets.splice(0, newBullets.length);
		hits.splice(0, hits.length);

		//render

		ctx.save();

		ctx.translate(offset.x, offset.y);

		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

		for(let i = 0; i < obstacles.length; i++){
			ctx.fillStyle = "grey";

			if(obstacles[i].type === "tnt"){
				ctx.fillStyle = "orange";
			}

			ctx.globalAlpha = 1;

			if(obstacles[i].health === 1){
				ctx.globalAlpha = 0.5;
			}

			ctx.fillRect(obstacles[i].pos.x - 20, obstacles[i].pos.y - 20, 40, 40);
			ctx.globalAlpha = 1;
		}

		for(let i = 0; i < crates.length; i++){
			ctx.fillStyle = "brown";

			ctx.fillRect(crates[i].pos.x - 10, crates[i].pos.y - 10, 20, 20);
		}

		ctx.fillStyle = "white";
		ctx.fillRect(player.pos.x - 15, player.pos.y - 15, 30, 30);
		for(let i = 0; i < enemyPlayers.length; i++){
			ctx.fillRect(enemyPlayers[i].pos.x - 15, enemyPlayers[i].pos.y - 15, 30, 30);
		}

		ctx.fillStyle = "yellow";
		for(let i = 0; i < bullets.length; i++){
			const b = bullets[i];
			ctx.save();
			ctx.translate(b.pos.x, b.pos.y);
			ctx.rotate(b.angle);
			ctx.fillRect(-b.size.x / 2, -b.size.y / 2, b.size.x, b.size.y);
			ctx.restore();
		}

		for(let i = 0; i < bushes.length; i++){
			ctx.fillStyle = "green";
			ctx.fillRect(bushes[i].pos.x - 20, bushes[i].pos.y - 20, 40, 40);
		}

		//draw hud

		ctx.translate(-offset.x, -offset.y);

		ctx.fillStyle = "orange";
		ctx.fillRect(0, 0, overheating, 10);

		ctx.fillStyle = "red";
		ctx.font = "20px Arial";
		ctx.fillText(health + "/10", 5, 15 + 20);

		ctx.restore();

		frames++;

		requestAnimationFrame(gameLoop);
	}

	const lobbyLoop = () => {

		if(pointer.down && !player.ready){
			player.ready = true;

			socket.emit("ready", { id: player.id });
		}

		if(startGame){

			startGame = false;
			stopGame = false;

			obstacles.splice(0, obstacles.length);
			bushes.splice(0, bushes.lenth);
			hits.splice(0, hits.length);
			bullets.splice(0, bullets.length);
			newBullets.splice(0, newBullets.length);

			for(let i = 0; i < enemyPlayers.length; i++){
				enemyPlayers[i].pos = getVec2f(-100, -100);
			}

			for(let y = 0; y < map.length; y++){
				for(let x = 0; x < map[y].length; x++){
					const pos = getVec2f(x * 40 + 20, y * 40 + 20);
					const tile = map[y][x];
					switch(tile){
						case "#":
							obstacles.push(Obstacle(pos.x, pos.y));
							break;
						case "T":
							obstacles.push(Tnt(pos.x, pos.y));
							break;
						case "B":
							bushes.push(Bush(pos.x, pos.y));
							break;
						case "C":
							crates.push(Crate(pos.x, pos.y));
							break;
						case playerNumber.toString():
							spawn = Vec2f_getCopy(pos);
							break;
					}
				}
			}

			player.pos = Vec2f_getCopy(spawn);
			health = 10;

			gameLoop();

			return;
		}

		//render

		ctx.save();

		ctx.translate(offset.x, offset.y);

		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, c.width, c.height);

		ctx.fillStyle = "white";
		ctx.font = "30px Arial";

		for(let i = 0; i < enemyPlayers.length + 1; i++){
			let text;
			let ready;

			if(i === enemyPlayers.length){
				text = player.id
				ready = player.ready;
			}else{
				text = enemyPlayers[i].id;
				ready = enemyPlayers[i].ready;
			}

			if(ready){
				text += " ready!";
			}
			
			const textWidth = ctx.measureText(text).width;

			ctx.fillText(text, c.width / 2 - textWidth / 2, 100 + 40 * i);

		}

		const text = "Click to ready.";
		const textWidth = ctx.measureText(text).width;
		ctx.fillText(text, c.width / 2 - textWidth / 2, 350);

		ctx.restore();

		requestAnimationFrame(lobbyLoop);
	}

	lobbyLoop();
	
}
