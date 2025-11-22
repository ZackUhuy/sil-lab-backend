const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// --- IMPORT SEMUA ROUTES ---
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const roomRoutes = require('./routes/roomRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
// const userRoutes = require('./routes/userRoutes'); // Dihapus
const reportRoutes = require('./routes/reportRoutes'); 

const app = express();

// --- KONFIGURASI CORS ---
app.use(cors({
    origin: '*', 
    // Izinkan metode PUT untuk edit
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));

app.use(bodyParser.json());

// --- DAFTAR ROUTES (ENDPOINT) ---
app.use('/api/auth', authRoutes);           
app.use('/api/booking', bookingRoutes);     
app.use('/api/rooms', roomRoutes);          
app.use('/api/equipment', equipmentRoutes); 
// app.use('/api/users', userRoutes); // Dihapus
app.use('/api/reports', reportRoutes);      

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server berjalan di port ${PORT}`);
    });
}

module.exports = app;