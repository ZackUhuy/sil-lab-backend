const { GoogleGenAI } = require("@google/genai");
const supabase = require('../config/supabase');
require('dotenv').config();

// Inisialisasi Gemini
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

exports.chatAvailability = async (req, res) => {
    const { message } = req.body;

    try {
        // 1. SETUP WAKTU (JAKARTA)
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 7); 

        // 2. QUERY DATABASE (PISAH AGAR LEBIH AMAN)
        
        // A. Ambil Jadwal
        const { data: schedules, error: errSched } = await supabase
            .from('peminjaman')
            .select('ruang_id, waktu_mulai, waktu_selesai, ruangan(nama_ruang)')
            .eq('status', 'disetujui')
            .gte('waktu_selesai', today.toISOString())
            .lte('waktu_mulai', tomorrow.toISOString());
        
        if (errSched) throw new Error(`DB Error (Jadwal): ${errSched.message}`);

        // B. Ambil Ruangan
        const { data: rooms, error: errRooms } = await supabase
            .from('ruangan')
            .select('id, nama_ruang, kapasitas');
            
        if (errRooms) throw new Error(`DB Error (Ruangan): ${errRooms.message}`);

        // C. Ambil Alat (Hanya ambil kolom yang pasti ada dulu untuk keamanan)
        const { data: tools, error: errTools } = await supabase
            .from('peralatan')
            .select('*'); // Select * lebih aman jika nama kolom 'jenis' belum ada
            
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
                // Handle jika kolom 'jenis' belum ada di database lama
                const jenis = t.jenis || 'alat'; 
                const statusInfo = t.jumlah_tersedia > 0 ? `${t.jumlah_tersedia} unit` : "HABIS";
                contextText += `- ${t.nama_alat} (${jenis}): Sisa ${statusInfo}, Kondisi ${t.kondisi}\n`;
            });
        } else {
            contextText += "Data alat tidak ditemukan.\n";
        }

        // 4. KIRIM KE GEMINI
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

        // Gunakan model 1.5 Flash (Lebih Stabil)
        const response = await genAI.models.generateContent({
            model: "gemini-1.5-flash", 
            contents: prompt
        });
        
        const text = response.text();
        res.json({ reply: text });

    } catch (error) {
        console.error("AI CONTROLLER ERROR:", error); // Cek Logs Vercel jika error
        // Kirim pesan error spesifik ke frontend agar tahu salahnya dimana
        res.status(500).json({ 
            error: "Terjadi kesalahan sistem.", 
            details: error.message 
        });
    }
};