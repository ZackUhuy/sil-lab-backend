const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
// --- TAMBAHAN BARU (WAJIB ADA) ---
const roomRoutes = require('./routes/roomRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
// ---------------------------------

const app = express();

// --- PERUBAHAN UNTUK VERCEL (CORS) ---
app.use(cors({
    // Nanti setelah deploy, ganti '*' ini dengan URL Vercel Frontend Anda
    origin: '*', 
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
}));
app.use(bodyParser.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/booking', bookingRoutes);

// --- PENDAFTARAN ROUTE BARU (WAJIB ADA) ---
// Tanpa dua baris ini, fitur Ruangan & Peralatan tidak akan jalan
app.use('/api/rooms', roomRoutes);
app.use('/api/equipment', equipmentRoutes);
// ------------------------------------------

const PORT = process.env.PORT || 3000;

// Logika agar jalan di Vercel (Serverless) DAN Laptop (Local)
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server berjalan di port ${PORT}`);
    });
}

module.exports = app;