const express = require("express");
const app = express();
const http = require("http").Server(app);
const cors = require("cors");
const { Console } = require("console");
const { send } = require("process");
const PORT = 4000;
const socketIO = require("socket.io")(http, {
	cors: {
	  origin: "http://localhost:19006",
	  methods: ["GET", "POST"]
	}
  });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

const generateID = () => Math.random().toString(36).substring(2, 10);
let chatchats = [];
let chats = [
	// {
	// 	id: "1",
	// 	members: ["skipper","cabo"],
	// 	messages: [{id: "random2391248",text: "hola",user: "skipper",time: "13:30",},{id: "random2391238",text: "buenas",user: "cabo",time: "13:34",}]
	// },
	// {
	// 	id: "skipper.kovalski",
	// 	members: ["skipper","kovalski"],
	// 	messages: [{id: "random3391248",text: "kovalski, opciones...",user: "skipper",time: "15:33",},{id: "random2341238",text: "una cinta metrica de 5m",user: "kovalski",time: "15:34",}]
	// }
];
let users = [
	
	// { name: "skipper", notifications: ['kovalski'], active: true, location: {"coords": {"accuracy": 3.9000000953674316, "altitude": 0, "altitudeAccuracy": null, "heading": 0, "latitude": -34.8346554, "longitude": -55.9893922, "speed": 0}, "mocked": false, "timestamp": 1676919818451} },
	// { name: "kovalski", location: {latitude,longitude,etc...} },
	// { name: "rico", location: {latitude,longitude,etc...} },
	// { name: "cabo", location: {latitude,longitude,etc...} }
	
];

//To all sockets send an ALL users list
const socketUserUpdate = () => socketIO.sockets.emit("usersList", users);

socketIO.on("connection", (socket) => {
	console.log(`\n⚡: ${socket.id} user just connected!`);

	//Creates a user
	socket.on("createUser", (username, userLocation, CBstatus) => {
		//Check if user with "username" exists
		if (users.filter((user) => user.name == username).length)
		{
			CBstatus("existsExcpetion");
		} else {
			users.push({name: username, active: true, location: userLocation});
			console.log(`\n✅: ${socket.id} created user: '${username}', with location: ${userLocation}\n`, userLocation)
			socketUserUpdate();
			CBstatus("created");
		}
		
	});

	// Log in a user (UNUSED)
	/*socket.on("logInUser", (username, callback) => {
		if (users.filter((user) => user.name == username).length)
		{
			callback("success");
		} else {
			callback("userExistsException");
		}
		
	});*/

	//Request ALL User List (Returns list to that specific socket)
	socket.on("requestUserList", (callback) => {
		callback(users);
	})

	//Create Chat (target name, root name, return callback(chat))
	socket.on("createChat", (target, root, callback) => {
		//Generate random id for this chat
		const uniqueId = generateID();

		//Create Chat
		chats.unshift({id: uniqueId, members: [target, root], messages: []});
		console.log(`\n✅: ${socket.id} as '${root}', created a chat with '${target}'\nChat Id: ${uniqueId}`);
		
		//this (root) socket joins chat
		socket.join(uniqueId);

		//Update users
		socketUserUpdate();
		
		//Return
		callback(chats[0]);
	})

	//Find Chat (target name, root name, return callback(chat))
	socket.on("findChat", (target, root, callback) => {
		//Default value
		let result = "notFoundException";

		//Finds Chat with members: [target, root]
		try {
			chats.forEach(chat => {
				if (chat.members.filter((member) => member == root).length == 1 && chat.members.filter((member) => member == target).length == 1) {
					result = chat;
				}
			});
		} catch (e) {console.error(e)}
		console.log(`\n🔎: ${socket.id} as '${root}', finding chat with '${target}'\nResult: `,result);

		//this (root) socket joins the chat
		result.id ? socket.join(result.id) : console.warn(`\n❌: ${socket.id} as '${root}', failed to join chat with id: '${result.id}'`);
	 	
		//Return
		callback(result);
	})

	//Creates a new Message newMessageData(chat_id, id(optional), text, user, time)
	socket.on("createChatMessage", (newMessageData, CBstatus) => {
		const { chat_id, id, text, user, time } = newMessageData;
		let result = chats.filter((chat) => chat.id == chat_id);
		//Setup Message
		const newChatMessage = {
			id: id ? id : generateID(),
			text: text,
			user: user,
			time: time
		};
		//Add message to the chat messages
		result[0].messages.push(newChatMessage);
		//Callback socket "created" result
		console.log(`\n✅: ${socket.id} as '${user}', created message: ${text} at ${time}\nFor Room ${result[0].id}, with users '${result[0].members}'`);
		CBstatus("created");
		//Send all sockets except this socket in chat new message update
		socketIO.sockets.to(result[0].id).emit("chatMessageUpdate", newChatMessage);
	});

	//Deletes Account
	socket.on("deleteAccount", (username) => {
		try {
			users = users.filter((user) => user.name != username);
			socketUserUpdate();
			console.warn(`\n💣: ${socket.id} deleted user '${username}'`)
		}
		catch (e) { console.warn(e); }
		
	})

	socket.on("disconnect", () => {
		socket.disconnect();
		console.log("🔥: A user disconnected");
	});
});

app.get("/api", (req, res) => {
	res.json(chatchats);
});

http.listen(PORT, () => {
	console.log(`Server listening on ${PORT}`);
});
