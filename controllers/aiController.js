const { GoogleGenAI } = require("@google/genai");
const supabase = require('../config/supabase');
require('dotenv').config();

// Inisialisasi Client
// Pastikan format constructor sesuai dokumentasi versi library yang dipakai
// Untuk @google/genai terbaru, biasanya menggunakan object config
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.chatAvailability = async (req, res) => {
    const { message } = req.body;

    try {
        // 1. SETUP WAKTU
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 7);

        // 2. QUERY DATABASE (Promise.all sudah benar & efisien)
        const [schedulesRes, roomsRes, toolsRes] = await Promise.all([
            supabase.from('peminjaman')
                .select('ruang_id, waktu_mulai, waktu_selesai, ruangan(nama_ruang)')
                .eq('status', 'disetujui')
                .gte('waktu_selesai', today.toISOString()) // Ambil yg belum selesai hari ini
                .lte('waktu_mulai', tomorrow.toISOString()),
            
            supabase.from('ruangan').select('id, nama_ruang, kapasitas'),
            supabase.from('peralatan').select('*')
        ]);

        const schedules = schedulesRes.data || [];
        const rooms = roomsRes.data || [];
        const tools = toolsRes.data || [];

        // 3. SUSUN DATA UNTUK AI
        let contextText = "--- DATA LABORATORIUM ---\n\n";

        // A. Data Ruangan
        contextText += "DAFTAR RUANGAN:\n";
        rooms.forEach(r => contextText += `- ${r.nama_ruang} (Kapasitas: ${r.kapasitas})\n`);
        
        // B. Data Stok Alat
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

        // C. Data Jadwal
        contextText += "\nJADWAL TERISI (YANG TIDAK BISA DIPINJAM):\n";
        if(schedules.length > 0) {
            schedules.forEach(s => {
                const options = { 
                    timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', 
                    month: 'long', hour: '2-digit', minute: '2-digit', hour12: false 
                };
                const start = new Date(s.waktu_mulai).toLocaleString('id-ID', options);
                const end = new Date(s.waktu_selesai).toLocaleTimeString('id-ID', { 
                    timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false
                });
                const namaRuang = s.ruangan ? s.ruangan.nama_ruang : 'Tanpa Ruangan';
                contextText += `- ${namaRuang}: ${start} s/d ${end}\n`;
            });
        } else {
            contextText += "Tidak ada jadwal, semua ruangan kosong.\n";
        }

        // 4. PROMPT FINAL
        const prompt = `
        Kamu adalah Asisten AI SISIL.
        Data Lab:
        ${contextText}
        
        User: "${message}"
        
        Instruksi: Jawab singkat bahasa Indonesia. Cek jadwal dan stok di atas.
        `;

        // --- PERBAIKAN DI SINI (FORMAT CONTENTS) ---
        const response = await genAI.models.generateContent({
            model: "gemini-1.5-flash",
            config: {
                temperature: 0.7 // Opsional, agar jawaban tidak terlalu kaku
            },
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt } // Text harus dibungkus dalam object 'parts'
                    ]
                }
            ]
        });

        // --- PERBAIKAN DI SINI (EXTRACT RESPONSE) ---
        // Library @google/genai biasanya mengembalikan object response
        // Cek apakah response.text() function tersedia, jika tidak ambil dari candidates
        let replyText = "";
        if (typeof response.text === 'function') {
            replyText = response.text();
        } else if (response.candidates && response.candidates.length > 0) {
            replyText = response.candidates[0].content.parts[0].text;
        } else {
            replyText = "Maaf, tidak ada respon dari AI.";
        }

        res.json({ reply: replyText });

    } catch (error) {
        console.error("AI Error Full Log:", JSON.stringify(error, null, 2)); // Debugging lebih detail
        res.status(500).json({ error: "Maaf, AI sedang sibuk." });
    }
};