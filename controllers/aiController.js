const { GoogleGenAI } = require("@google/genai");
const supabase = require('../config/supabase');
require('dotenv').config();

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

exports.chatAvailability = async (req, res) => {
    const { message } = req.body;

    try {
        // 1. Ambil Data Jadwal & Ruangan dari Database (Konteks)
        // Kita ambil semua jadwal aktif (disetujui) hari ini dan seminggu ke depan
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 7); 

        const { data: schedules } = await supabase
            .from('peminjaman')
            .select('ruang_id, waktu_mulai, waktu_selesai, ruangan(nama_ruang)')
            .eq('status', 'disetujui')
            .gte('waktu_selesai', today.toISOString()) // Ambil yang belum selesai
            .lte('waktu_mulai', tomorrow.toISOString());
        
        const { data: rooms } = await supabase.from('ruangan').select('id, nama_ruang, kapasitas');

        // 2. Format Data untuk AI
        let contextText = "DATA RUANGAN:\n";
        rooms.forEach(r => contextText += `- ${r.nama_ruang} (Kapasitas: ${r.kapasitas})\n`);
        
        contextText += "\nJADWAL TERISI (YANG TIDAK BISA DIPINJAM):\n";
        
        // --- LOGIKA WAKTU JAKARTA (DIPERBARUI) ---
        if(schedules && schedules.length > 0) {
            schedules.forEach(s => {
                // Format lengkap dengan Timezone Asia/Jakarta
                // Penting agar jam tidak ngaco saat di-deploy ke server luar (Vercel)
                const options = { 
                    timeZone: 'Asia/Jakarta', 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false // Format 24 jam
                };

                const start = new Date(s.waktu_mulai).toLocaleString('id-ID', options);
                
                // Waktu selesai
                const end = new Date(s.waktu_selesai).toLocaleTimeString('id-ID', { 
                    timeZone: 'Asia/Jakarta', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false
                });

                contextText += `- ${s.ruangan.nama_ruang}: ${start} sampai ${end}\n`;
            });
        } else {
            contextText += "Tidak ada jadwal, semua ruangan kosong.\n";
        }
        // -----------------------------------------

        const prompt = `
        Kamu adalah Asisten AI untuk Sistem Informasi Laboratorium (SISIL).
        Tugasmu adalah membantu mahasiswa mengecek ketersediaan ruangan.
        
        Berikut adalah DATA REAL-TIME jadwal laboratorium:
        ${contextText}
        
        PERTANYAAN USER: "${message}"
        
        JAWABAN KAMU:
        Jawablah dengan ramah, singkat, dan langsung pada intinya. 
        Jika user bertanya ruangan kosong, cek daftar "JADWAL TERISI" di atas. 
        Jika jadwal tidak ada di daftar terisi pada jam yang diminta, berarti kosong.
        Gunakan Bahasa Indonesia yang sopan.
        `;

        // Request ke Gemini AI
        const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash", // Menggunakan model flash agar lebih cepat
            contents: prompt
        });
        
        const text = response.text(); // Ambil text response

        res.json({ reply: text });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Maaf, AI sedang sibuk. Coba cek manual di tabel." });
    }
};