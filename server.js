const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Public folder se files serve karne ke liye
app.use(express.static(path.join(__dirname, 'public')));

// Jab koi naya user connect hoga
io.on('connection', (socket) => {
    console.log('Ek naya user connect hua: ' + socket.id);

    // Call join karne ka logic
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId);

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });

    // WebRTC Signaling (Video/Audio exchange)
    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', {
            from: socket.id,
            signal: data.signal
        });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Vishwa-Setu Engine started on port ${PORT}`);
});
      
