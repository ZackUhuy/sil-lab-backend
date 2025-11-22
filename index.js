const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// --- IMPORT SEMUA ROUTES ---
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const roomRoutes = require('./routes/roomRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes'); // Fitur Lapor Kerusakan

const app = express();

// --- KONFIGURASI CORS ---
app.use(cors({
    origin: '*', // Izinkan akses dari semua domain (Frontend Vercel dll)
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
}));

app.use(bodyParser.json());

// --- DAFTAR ROUTES (ENDPOINT) ---
app.use('/api/auth', authRoutes);           // Login & Register
app.use('/api/booking', bookingRoutes);     // Peminjaman & Jadwal
app.use('/api/rooms', roomRoutes);          // Data Ruangan
app.use('/api/equipment', equipmentRoutes); // Data Peralatan
app.use('/api/users', userRoutes);          // Manajemen User (Admin)
app.use('/api/reports', reportRoutes);      // Laporan Kerusakan

// --- PORT & SERVER START ---
const PORT = process.env.PORT || 3000;

// Logika agar jalan di Local (npm run dev) maupun Vercel (Serverless)
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server berjalan di port ${PORT}`);
    });
}

// Wajib export app untuk Vercel
module.exports = app;