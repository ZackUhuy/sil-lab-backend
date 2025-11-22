const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// --- IMPORT ROUTE FILES ---
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const roomRoutes = require('./routes/roomRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
// const userRoutes = require('./routes/userRoutes'); // Sudah dihapus sesuai permintaan
const reportRoutes = require('./routes/reportRoutes');

// --- IMPORT CONTROLLER KHUSUS (Untuk endpoint langsung) ---
const analyticsController = require('./controllers/analyticsController');
const { requireAuth, requireRole } = require('./middleware/authMiddleware');

const app = express();

// --- KONFIGURASI CORS ---
app.use(cors({
    origin: '*', // Izinkan akses dari frontend Vercel
    // Pastikan method PUT ada di sini untuk fitur Edit
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));

app.use(bodyParser.json());

// --- DAFTAR ENDPOINTS API ---
app.use('/api/auth', authRoutes);           // Login & Register
app.use('/api/booking', bookingRoutes);     // Peminjaman & Jadwal
app.use('/api/rooms', roomRoutes);          // Data Ruangan & Maintenance
app.use('/api/equipment', equipmentRoutes); // Data Peralatan
// app.use('/api/users', userRoutes);       // Sudah dihapus sesuai permintaan
app.use('/api/reports', reportRoutes);      // Laporan Kerusakan

// --- ROUTE KHUSUS ANALITIK (Dashboard Admin) ---
// Langsung panggil controller di sini agar praktis
app.get('/api/analytics', requireAuth, requireRole(['admin']), analyticsController.getStats);

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