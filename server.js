const http = require("http");
const fs = require("fs");
const path = require("path");
const socketIO = require("socket.io");

const port = process.env.PORT || 3000;

const mimeTypes = {
	".html": "text/html",
	".css": "text/css",
	".js": "text/javascript",
	".json": "text/json",
	".png": "image/png",
	".jpg": "image/jpg",
	".gif": "image/gif",
	".wav": "audio/wav",
};

const requestHandler = (req, res) => {
	
	if(req.method === "GET"){

		let filePath;

		if(req.url === "/"){
			filePath = "./index.html";
		}else{
			filePath = "./public" + req.url;
		}

		const extName = String(path.extname(filePath)).toLowerCase();

		const contentType = mimeTypes[extName] || "application/octet-stream";

		fs.readFile(filePath, (err, data) => {
			if(err){
				res.writeHead(200, {
					"Content-Type": "text/plain",
				});

				res.end("Could not find file: " + req.url, "utf-8");
			}else{

				res.writeHead(200, {
					"Content-Type": contentType,
				});

				res.end(data, "utf-8");
			
			}
		});

	}
}

const server = http.createServer(requestHandler);
const io = socketIO(server);

const players = [];

io.on("connection", (socket) => {
	console.log(socket.id + " connected.");

	socket.emit("init-state", { 
		enemyPlayers: players,
		id: socket.id,
	});

	const player = {
		id: socket.id,
	}

	socket.broadcast.emit("player-connected", {
		player,
	});

	players.push(player);

	socket.on("state-update", (data) => {

		socket.broadcast.emit("state-update", data);
	});

	socket.on("disconnect", () => {
		players.splice(players.indexOf(player), 1);
		console.log(socket.id + " disconnected.");

		socket.broadcast.emit("player-disconnected", {
			id: socket.id
		});
	});

})

server.listen(port, (err) => {
	if(err){
		throw err;
	}
	console.log("Listening on port: " + port);
})
