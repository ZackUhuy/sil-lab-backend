const { GoogleGenAI } = require("@google/genai");
const supabase = require('../config/supabase');
require('dotenv').config();

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

exports.chatAvailability = async (req, res) => {
    const { message } = req.body;

    try {
        // 1. Ambil Data Jadwal & Ruangan dari Database (Konteks)
        // Kita ambil semua jadwal aktif (disetujui) hari ini dan besok untuk efisiensi
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 7); // Ambil data seminggu ke depan

        const { data: schedules } = await supabase
            .from('peminjaman')
            .select('ruang_id, waktu_mulai, waktu_selesai, ruangan(nama_ruang)')
            .eq('status', 'disetujui')
            .gte('waktu_mulai', today.toISOString())
            .lte('waktu_mulai', tomorrow.toISOString());
        
        const { data: rooms } = await supabase.from('ruangan').select('id, nama_ruang, kapasitas');

        // 2. Format Data untuk AI
        // Kita buat ringkasan teks agar AI paham
        let contextText = "DATA RUANGAN:\n";
        rooms.forEach(r => contextText += `- ${r.nama_ruang} (Kapasitas: ${r.kapasitas})\n`);
        
        contextText += "\nJADWAL TERISI (YANG TIDAK BISA DIPINJAM):\n";
        if(schedules && schedules.length > 0) {
            schedules.forEach(s => {
                const start = new Date(s.waktu_mulai).toLocaleString('id-ID', { weekday: 'long', hour: '2-digit', minute: '2-digit', day: 'numeric' });
                const end = new Date(s.waktu_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                contextText += `- ${s.ruangan.nama_ruang}: ${start} sampai ${end}\n`;
            });
        } else {
            contextText += "Tidak ada jadwal, semua ruangan kosong.\n";
        }

        const prompt = `
        Kamu adalah Asisten AI untuk Sistem Informasi Laboratorium (SISIL).
        Tugasmu adalah membantu mahasiswa mengecek ketersediaan ruangan.
        
        Berikut adalah DATA REAL-TIME jadwal laboratorium:
        ${contextText}
        
        PERTANYAAN USER: "${message}"
        
        JAWABAN KAMU:
        Jawablah dengan ramah, singkat, dan langsung pada intinya. 
        Jika user bertanya ruangan kosong, cek daftar "JADWAL TERISI" di atas. 
        Jika jadwal tidak ada di daftar terisi, berarti kosong.
        Gunakan Bahasa Indonesia yang sopan.
        `;

        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        })
        const text = response.text;

        res.json({ reply: text });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Maaf, AI sedang sibuk. Coba cek manual di tabel." });
    }
};