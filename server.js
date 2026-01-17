const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});
const path = require('path');

// Public folder se frontend files uthane ke liye
app.use(express.static(path.join(__dirname, 'public')));

// Room Management System
const rooms = {};

io.on('connection', (socket) => {
    console.log('>>> [SYSTEM]: Naya Neural Node Connect Hua: ' + socket.id);

    socket.on('join-room', (roomId, userId) => {
        console.log(`>>> [ROOM]: User ${userId} ne Room ${roomId} Join kiya.`);
        socket.join(roomId);

        // Pehle se maujood logon ko batana ki naya banda aaya hai
        socket.to(roomId).emit('user-connected', userId);

        socket.on('disconnect', () => {
            console.log(`>>> [DISCONNECT]: User ${userId} chala gaya.`);
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });

    // WebRTC Signaling (Video/Audio Handshake)
    socket.on('signal', (data) => {
        if (data.to) {
            io.to(data.to).emit('signal', {
                from: socket.id,
                signal: data.signal
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` VISHWA-SETU V6 ENGINE IS LIVE ON PORT ${PORT}`);
    console.log(` DEVELOPED BY AMAR KUMAR - GOD MODE ACTIVE`);
    console.log(`=========================================`);
});
    
