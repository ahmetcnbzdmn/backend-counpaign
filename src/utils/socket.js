let io;

module.exports = {
    init: (httpServer) => {
        io = require('socket.io')(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        console.log('✅ Socket.IO Initialized');

        io.on('connection', (socket) => {
            // Allow clients to join a room based on their USER ID
            socket.on('join', (userId) => {
                console.log(`🔌 Socket joined room: ${userId}`);
                socket.join(userId);
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    }
};
