// GANTI import library ke yang stable
const { GoogleGenerativeAI } = require("@google/generative-ai");
const supabase = require('../config/supabase');
require('dotenv').config();

// Inisialisasi Client (Cara Stable)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Pilih Model di luar handler agar tidak inisialisasi ulang terus
// Pastikan nama model benar: "gemini-1.5-flash" (bukan 2.5)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

exports.chatAvailability = async (req, res) => {
    const { message } = req.body;

    try {
        // --- LOGIKA DATABASE (SAMA SEPERTI SEBELUMNYA) ---
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 7);

        const [schedulesRes, roomsRes, toolsRes] = await Promise.all([
            supabase.from('peminjaman')
                .select('ruang_id, waktu_mulai, waktu_selesai, ruangan(nama_ruang)')
                .eq('status', 'disetujui')
                .gte('waktu_selesai', today.toISOString())
                .lte('waktu_mulai', tomorrow.toISOString()),
            supabase.from('ruangan').select('id, nama_ruang, kapasitas'),
            supabase.from('peralatan').select('*')
        ]);

        const schedules = schedulesRes.data || [];
        const rooms = roomsRes.data || [];
        const tools = toolsRes.data || [];

        // --- MENYUSUN KONTEKS (SAMA) ---
        let contextText = "--- DATA LABORATORIUM ---\n\n";

        contextText += "DAFTAR RUANGAN:\n";
        rooms.forEach(r => contextText += `- ${r.nama_ruang} (Kapasitas: ${r.kapasitas})\n`);
        
        contextText += "\nDAFTAR STOK ALAT & BAHAN:\n";
        if (tools.length > 0) {
            tools.forEach(t => {
                const jenis = t.jenis || 'alat';
                const statusInfo = t.jumlah_tersedia > 0 ? `${t.jumlah_tersedia} unit` : "HABIS";
                contextText += `- ${t.nama_alat} (${jenis}): Sisa ${statusInfo}, Kondisi ${t.kondisi}\n`;
            });
        } else {
            contextText += "Data alat tidak tersedia.\n";
        }

        contextText += "\nJADWAL TERISI (YANG TIDAK BISA DIPINJAM):\n";
        if(schedules.length > 0) {
            schedules.forEach(s => {
                const options = { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false };
                const start = new Date(s.waktu_mulai).toLocaleString('id-ID', options);
                const end = new Date(s.waktu_selesai).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
                const namaRuang = s.ruangan ? s.ruangan.nama_ruang : 'Tanpa Ruangan';
                contextText += `- ${namaRuang}: ${start} s/d ${end}\n`;
            });
        } else {
            contextText += "Tidak ada jadwal, semua ruangan kosong.\n";
        }

        // --- PROMPT ---
        const prompt = `
        Kamu adalah Asisten AI SISIL.
        Data Lab:
        ${contextText}
        
        Pertanyaan User: "${message}"
        
        Instruksi: Jawab ramah, singkat, Bahasa Indonesia. Cek jadwal dan stok di atas.
        `;

        // --- CARA REQUEST STABLE (Perbedaan Utama) ---
        // Library stable menerima string langsung, tidak perlu struktur rumit
        const result = await model.generateContent(prompt);
        
        // Ambil respon
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (error) {
        console.error("AI Controller Error:", error);

        // Log specific details for better debugging
        if (error.response) {
            // Error from Google AI API (e.g., authentication, invalid model)
            console.error("AI API Response Error:", error.response.data);
        } else if (error.request) {
            // Request was made, but no response received
            console.error("AI API No Response:", error.request);
        } else {
            // Something else went wrong
            console.error("Error Message:", error.message);
        }
        
        res.status(500).json({ 
            error: "Maaf, terjadi kesalahan pada server AI.",
            details: error.message // Optionally send a sanitized error message
        });
    }
};