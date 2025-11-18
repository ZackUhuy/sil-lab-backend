const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
// Import routes lain sesuai kebutuhan...

const app = express();

// --- PERUBAHAN UNTUK VERCEL (CORS) ---
// Middleware
// Ini mengizinkan Vercel Frontend mengakses Vercel Backend
app.use(cors({
    // Nanti setelah deploy, ganti '*' ini dengan URL Vercel Frontend Anda
    // Contoh: 'https://sil-lab-frontend.vercel.app'
    origin: '*', 
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
}));
app.use(bodyParser.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/booking', bookingRoutes);

// --- PERUBAHAN UNTUK VERCEL & LOKAL ---
const PORT = process.env.PORT || 3000;

// Logika ini agar file bisa jalan di Vercel (serverless) 
// DAN di laptop Anda (long-running process)

if (require.main === module) {
    // Ini akan jalan jika Anda ketik 'npm run dev'
    // '0.0.0.0' ditambahkan agar bisa diakses via WiFi (sesuai request Anda sebelumnya)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server berjalan di port ${PORT}`);
    });
}

// Ini WAJIB agar Vercel bisa menjalankan file ini sebagai Serverless Function
module.exports = app;