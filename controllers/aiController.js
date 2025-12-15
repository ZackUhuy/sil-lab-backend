const { GoogleGenerativeAI } = require("@google/generative-ai");
const supabase = require('../config/supabase');
require('dotenv').config();

// Inisialisasi Gemini (Pakai Library Standard)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.chatAvailability = async (req, res) => {
    const { message } = req.body;

    try {
        // 1. SETUP WAKTU (JAKARTA)
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 7); 

        // 2. QUERY DATABASE
        const { data: schedules, error: errSched } = await supabase
            .from('peminjaman')
            .select('ruang_id, waktu_mulai, waktu_selesai, ruangan(nama_ruang)')
            .eq('status', 'disetujui')
            .gte('waktu_selesai', today.toISOString())
            .lte('waktu_mulai', tomorrow.toISOString());
        
        if (errSched) throw new Error(`DB Error (Jadwal): ${errSched.message}`);

        const { data: rooms, error: errRooms } = await supabase.from('ruangan').select('id, nama_ruang, kapasitas');
        if (errRooms) throw new Error(`DB Error (Ruangan): ${errRooms.message}`);

        const { data: tools, error: errTools } = await supabase.from('peralatan').select('*');
        if (errTools) throw new Error(`DB Error (Alat): ${errTools.message}`);

        // 3. SUSUN DATA UNTUK AI
        let contextText = "--- DATA LABORATORIUM ---\n\n";

        // List Ruangan
        contextText += "DAFTAR RUANGAN:\n";
        rooms.forEach(r => contextText += `- ${r.nama_ruang} (Kapasitas: ${r.kapasitas} orang)\n`);
        
        // List Jadwal Terisi
        contextText += "\nJADWAL TERISI (RUANGAN TIDAK BISA DIPAKAI):\n";
        if(schedules && schedules.length > 0) {
            schedules.forEach(s => {
                const options = { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false };
                const start = new Date(s.waktu_mulai).toLocaleString('id-ID', options);
                const end = new Date(s.waktu_selesai).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
                const namaRuang = s.ruangan ? s.ruangan.nama_ruang : 'Tanpa Ruangan';
                contextText += `- ${namaRuang}: ${start} s/d ${end}\n`;
            });
        } else {
            contextText += "Tidak ada jadwal, semua ruangan KOSONG dan TERSEDIA.\n";
        }

        // List Stok Alat
        contextText += "\nDAFTAR STOK ALAT & BAHAN:\n";
        if (tools && tools.length > 0) {
            tools.forEach(t => {
                const jenis = t.jenis || 'alat'; 
                const statusInfo = t.jumlah_tersedia > 0 ? `${t.jumlah_tersedia} unit` : "HABIS";
                contextText += `- ${t.nama_alat} (${jenis}): Sisa ${statusInfo}, Kondisi ${t.kondisi}\n`;
            });
        } else {
            contextText += "Data alat tidak ditemukan.\n";
        }

        // 4. KIRIM KE GEMINI (SYNTAX STANDARD)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        Kamu adalah Asisten AI untuk Sistem Informasi Laboratorium (SISIL).
        Tugasmu menjawab pertanyaan mahasiswa berdasarkan data berikut.
        
        DATA REAL-TIME:
        ${contextText}
        
        PERTANYAAN USER: "${message}"
        
        INSTRUKSI:
        - Jawab berdasarkan data di atas saja.
        - Jika ditanya ruangan kosong, cek bagian "JADWAL TERISI". Jika tidak ada di daftar itu, berarti kosong.
        - Jika ditanya alat, cek "DAFTAR STOK".
        - Gunakan Bahasa Indonesia yang sopan dan ramah.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        res.json({ reply: text });

    } catch (error) {
        console.error("AI CONTROLLER ERROR:", error);
        res.status(500).json({ 
            error: "Terjadi kesalahan sistem.", 
            details: error.message 
        });
    }
};