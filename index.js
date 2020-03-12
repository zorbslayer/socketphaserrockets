var PORT = process.env.PORT || 3000;
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    io.emit('user connected');

    socket.on('disconnect', function() {
        io.emit('user disconnected');
    });

    socket.on('chat message', function(msg) {
        io.emit('chat message', msg);
    });
});

http.listen(PORT, function() {
    console.log('listening on *:3000');
});