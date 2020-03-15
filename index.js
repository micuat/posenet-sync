// Setup basic express server
var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var port = process.env.PORT || 3000;

server.listen(port, function() {
  console.log("Server listening at port %d", port);
});

// Routing
app.use(express.static("public"));

// DB https://glitch.com/~hello-sqlite
const fs = require("fs");

// init sqlite db
const dbFile = "./.data/sqliteImg.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(dbFile);

let ibase = 0;
db.serialize(() => {
  if (!exists) {
    db.run(
      "CREATE TABLE Count (id INTEGER PRIMARY KEY AUTOINCREMENT, base TEXT)"
    );

    db.serialize(() => {
      for (let i = 0; i < 1; i++) {
        db.run(`INSERT INTO Count (base) VALUES ('${ibase}')`);
      }
    });
  } else {
    db.each("SELECT * from Count", (err, row) => {
      if (row) {
        //console.log(`record: ${row.base}`);
      }
    });
  }
});

// Chatroom

var numUsers = 0;

db.all("SELECT * from Count", (err, rows) => {
  for (let i = 0; i < rows.length; i++) {
    const s = rows[i].base;
    ibase = parseInt(s);
  }
});

io.on("connection", function(socket) {
  ibase += 1;
  socket.on("get visitor count", function() {
    socket.emit("visitor count", { num: ibase });
    socket.broadcast.emit("visitor count", { num: ibase });
  });
  //socket.broadcast.emit("visitor count", {num: ibase});
  db.run(`UPDATE Count SET (base) = (?)`, ibase, error => {
    console.log("upload " + (error == undefined ? "success" : error));
  });
  console.log("new user");
  socket.on("probe", function(data) {
    console.log("probing");
  });

  var addedUser = false;

  // when the user disconnects.. perform this
  socket.on("disconnect", function() {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit("user left", {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
