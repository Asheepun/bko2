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

let inGame = false;

io.on("connection", (socket) => {
	//console.log(socket.id + " connected.");

	socket.emit("init-state", { 
		enemyPlayers: players,
		id: socket.id,
	});

	const player = {
		id: socket.id,
		ready: false,
	}

	socket.broadcast.emit("player-connected", {
		player,
	});

	players.push(player);

	socket.on("ready", (data) => {
		player.ready = true;
		socket.broadcast.emit("ready", data);

		let allReady = true;
		for(let i = 0; i < players.length; i++){
			if(!players[i].ready){
				allReady = false;
			}
		}

		if(allReady
		&& players.length > 1
		&& !inGame){

			const map = getGeneratedMap();

			io.emit("start-game", {
				map,
				players,
			});

			inGame = true;
		}
	});

	socket.on("state-update", (data) => {
		socket.broadcast.emit("state-update", data);
	});

	socket.on("disconnect", () => {
		players.splice(players.indexOf(player), 1);
		//console.log(socket.id + " disconnected.");

		socket.broadcast.emit("player-disconnected", {
			id: socket.id
		});

		if(players.length === 1){
			io.emit("stop-game", {});
			players[0].ready = false;
			inGame = false;
		}
	});

})

server.listen(port, (err) => {
	if(err){
		throw err;
	}
	console.log("Listening on port: " + port);
})

//straight up ripped from old game
const getGeneratedMap = () => {

	const replaceAt = (string, index, replacement) => {
        return string.substr(0, index) + replacement+ string.substr(index + replacement.length);
    }

    const strEach = (str, func) => {
        for(let i = 0; i < str.length; i++){
            func(str[i], i);
        }
    };

    const scl = 40;

    const map = [
        "########################################",
        "#,,,................................,,,#",
        "#,0,.........C............C.........,2,#",
        "#,,,................................,,,#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#............C............C............#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#............C............C............#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#,,,................................,,,#",
        "#,3,.........C............C.........,1,#",
        "#,,,................................,,,#",
        "########################################",
    ];   
    
    map.forEach((row, i) => {
        strEach(row, (tile, j) => {
            let x = j*scl;
            let y = i*scl;
            if(tile !== "0" 
            && tile !== "1"
            && tile !== "2"
            && tile !== "3" 
            && tile !== "C"
            && tile !== ","
            && tile !== "T"){
                if(Math.random() < 0.3){
                     if(Math.random() < 0.1) map[i] = replaceAt(map[i], j, "T");
                     else map[i] = replaceAt(map[i], j, "#");
                }
                else if(Math.random() < 0.4) map[i] = replaceAt(map[i], j, "B");
            }
        });
    });

    return map;

}
