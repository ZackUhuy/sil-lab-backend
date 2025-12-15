const { GoogleGenerativeAI } = require("@google/generative-ai");
const supabase = require('../config/supabase');
require('dotenv').config();

// Inisialisasi Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// PERBAIKAN DI SINI: Gunakan "gemini-1.5-flash-001" (Nama lengkap versi stabil)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

exports.chatAvailability = async (req, res) => {
    const { message } = req.body;

    try {
        // --- 1. SETUP WAKTU & QUERY DATABASE ---
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

        // --- 2. SUSUN KONTEKS ---
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

        // --- 3. PROMPT ---
        const prompt = `
        Kamu adalah Asisten AI SISIL (Sistem Informasi Laboratorium).
        Data Lab Real-time:
        ${contextText}
        
        Pertanyaan User: "${message}"
        
        Instruksi:
        1. Jawab dengan ramah dan ringkas dalam Bahasa Indonesia.
        2. Jika user bertanya ketersediaan ruang, cek bagian "JADWAL TERISI". Jika jam yang diminta user TIDAK ada di daftar itu, berarti KOSONG/BISA DIPINJAM.
        3. Jika user bertanya alat, sebutkan stoknya.
        `;

        // --- 4. REQUEST KE GEMINI ---
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (error) {
        console.error("AI Error:", error); 
        res.status(500).json({ error: "Maaf, AI sedang sibuk. Silakan cek tabel manual." });
    }
};