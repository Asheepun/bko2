const Vec2f = (x, y) => {
	return {
		x,
		y,
	};
}

const Vec2f_getCopy = (v) => {
	return Vec2f(v.x, v.y);
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
	return Vec2f(v1.x - v2.x, v1.y - v2.y);
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

const Player = (x, y, id) => {
	const that = {};

	that.pos = Vec2f(x, y);
	that.velocity = Vec2f(0, 0);
	that.dir = Vec2f(0, 0);
	that.speed = 2.3;

	that.id = id;

	return that;
}

const Bullet = (x, y, angle, speed, size, playerId, numberId) => {
	const that = {};

	that.playerId = playerId;
	that.numberId = numberId

	that.pos = Vec2f(x, y);
	that.velocity = Vec2f(Math.cos(angle) * speed, Math.sin(angle) * speed);

	that.shouldBeRemoved = false;

	return that;
}

window.onload = () => {

	const socket = io();

	const c = document.createElement("canvas");
	const ctx = c.getContext("2d");
	document.body.appendChild(c);

	c.width = 800;
	c.height = 600;

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
		pos: Vec2f(0, 0),
	};

	document.addEventListener("mousemove", (e) => {
        const offset = Vec2f(c.offsetLeft, c.offsetTop);
        pointer.pos = Vec2f(e.pageX, e.pageY);
		Vec2f_sub(pointer.pos, offset);
	});

	document.addEventListener("mousedown", () => {
		pointer.down = true;
	});

	document.addEventListener("mouseup", () => {
		pointer.down = false;
	});

	const bullets = [];
	const newBullets = [];

	let numberOfBullets = 0;

	const enemyPlayers = [];

	const player = Player(100, 100, false);

	const fireDelay = 10;

	const hits = [];

	socket.on("init-state", (data) => {
		for(let i = 0; i < data.enemyPlayers.length; i++){
			enemyPlayers.push(Player(-100, -100, data.enemyPlayers[i].id));
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

				player.pos = Vec2f(100, 100);

				console.log("hit!");
				for(let j = 0; j < bullets.length; j++){
					if(bullets[j].playerId === data.hits[i].bullet.playerId
					&& bullets[j].numberId === data.hits[i].bullet.numberId){
						bullets[j].shouldBeRemoved = true;
					}
				}
			}
		}
	});

	let fireDelayCounter = 0;

	const loop = () => {

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

		fireDelayCounter--;

		if(pointer.down && fireDelayCounter <= 0){
			const dir = Vec2f_getCopy(player.pos);
			Vec2f_sub(dir, pointer.pos);
			Vec2f_reverse(dir);
			const b = Bullet(player.pos.x, player.pos.y, Math.atan2(dir.y, dir.x), 3, undefined, player.id, numberOfBullets);
			bullets.push(b);
			newBullets.push(b);
			numberOfBullets++;

			fireDelayCounter = fireDelay;
		}

		player.velocity = player.dir;
		Vec2f_normalize(player.velocity);
		Vec2f_mul(player.velocity, player.speed);

		Vec2f_add(player.pos, player.velocity);

		for(let i = 0; i < bullets.length; i++){
			const b = bullets[i];

			Vec2f_add(b.pos, b.velocity);

			if(b.pos.x < 0 || b.pos.y < 0 || b.pos.x > c.width || b.pos.y > c.height){
				b.shouldBeRemoved = true;
			}

			for(let j = 0; j < enemyPlayers.length; j++){
				//console.log(Vec2f_getMag(Vec2f_getSub(bullets[i].pos, enemyPlayers[j].pos)));
				if(Vec2f_getMag(Vec2f_getSub(bullets[i].pos, enemyPlayers[j].pos)) < 15 + 5 && bullets[i].playerId !== enemyPlayers[j].id){
					hits.push({
						hitId: enemyPlayers[j].id,
						bullet: bullets[i],
					});
					b.shouldBeRemoved = true;
				}
			}

			if(b.shouldBeRemoved){
				bullets.splice(i, 1);
				i--;
			}
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

		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, c.width, c.height);

		ctx.fillStyle = "white";
		ctx.fillRect(player.pos.x - 15, player.pos.y - 15, 30, 30);
		for(let i = 0; i < enemyPlayers.length; i++){
			ctx.fillRect(enemyPlayers[i].pos.x - 15, enemyPlayers[i].pos.y - 15, 30, 30);
		}

		ctx.fillStyle = "yellow";
		for(let i = 0; i < bullets.length; i++){
			ctx.fillRect(bullets[i].pos.x - 5, bullets[i].pos.y - 5, 10, 10);
		}

		ctx.fillStyle = "grey";
		ctx.fillRect(200, 120, 40, 40);

		requestAnimationFrame(loop);
	}

	loop();
	
}
