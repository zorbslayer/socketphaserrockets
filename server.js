var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
const gameWidth = 3840;
const gameHeight = 2160;
const maxStars = 50;

var players = {};
var stars = {};

for (i = 0; i < maxStars; i++) {
  stars[i] = {
    x: Math.floor(Math.random() * gameWidth - 100) + 50,
    y: Math.floor(Math.random() * gameHeight - 100) + 50,
  };
}

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
  console.log('a user connected');

  socket.on('playerJoined', function (username) {
    //create a new player and add it to the players object
    players[socket.id] = {
      rotation: 0,
      x: Math.floor(Math.random() * gameWidth - 100) + 50,
      y: Math.floor(Math.random() * gameHeight - 100) + 50,
      playerId: socket.id,
      team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue',
      score: 0,
      name: username
    };

    //send the player's object to the new player
    socket.emit('currentPlayers', players);
    //send the star object to the new player
    socket.emit('starLocation', stars, maxStars);
    //send the current scores
    socket.emit('scoreUpdate', players);

    //update all other players of the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);
    //update all other player's scoreboards
    socket.broadcast.emit('scoreUpdate', players);
  });

  socket.on('disconnect', function () {
    console.log('a user disconnected');

    //remove this player from our players object
    delete players[socket.id];

    //emit a message to all players to remove this player
    io.emit('disconnect', socket.id);
    //update all other player's scoreboards to remove this player
    socket.broadcast.emit('scoreUpdate', players);
  });

  //when a player moves, update the player data
  socket.on('playerMovement', function(movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;

    //emit a message to all players about the player that moved
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  //when a player colects a star, update the score
  socket.on('starCollected', function(star) {
    players[socket.id].score += 10;
      for (i = 0; i < maxStars; i++) {
        if (stars[i].x == star.x && stars[i].y == star.y) {
          stars[i].x = Math.floor(Math.random() * gameWidth - 100) + 50;
          stars[i].y = Math.floor(Math.random() * gameHeight - 100) + 50;
          io.emit('starLocation', stars, maxStars);
          io.emit('scoreUpdate', players);
        }
      }
  });

});

server.listen(8081, function () {
  console.log(`Listening on ${server.address().port}`);
});