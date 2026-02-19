require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const http = require('http'); // HTTP Module
const socket = require('./utils/socket'); // Socket Utility

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Create HTTP Server
const server = http.createServer(app);

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');

    // Initialize Socket.IO
    const io = socket.init(server);

    server.listen(PORT, '0.0.0.0', () => { // Listen on SERVER, not APP
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`Accessible at http://0.0.0.0:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });
