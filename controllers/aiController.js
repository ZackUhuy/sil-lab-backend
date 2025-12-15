const { GoogleGenAI } = require("@google/genai");
const supabase = require('../config/supabase');
require('dotenv').config();

// Inisialisasi Client (Library Baru)
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

exports.chatAvailability = async (req, res) => {
    const { message } = req.body;

    try {
        // 1. SETUP WAKTU
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 7); 

        // 2. QUERY DATABASE (Jadwal, Ruangan, DAN Alat)
        // Kita gunakan Promise.all agar data alat juga terambil
        const [schedulesRes, roomsRes, toolsRes] = await Promise.all([
            // A. Jadwal
            supabase.from('peminjaman')
                .select('ruang_id, waktu_mulai, waktu_selesai, ruangan(nama_ruang)')
                .eq('status', 'disetujui')
                .gte('waktu_selesai', today.toISOString())
                .lte('waktu_mulai', tomorrow.toISOString()),
            
            // B. Ruangan
            supabase.from('ruangan').select('id, nama_ruang, kapasitas'),

            // C. Alat (PENTING: Agar AI tahu stok)
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
        
        // B. Data Stok Alat (Agar bisa jawab pertanyaan barang)
        contextText += "\nDAFTAR STOK ALAT & BAHAN:\n";
        if (tools.length > 0) {
            tools.forEach(t => {
                // Cek kolom jenis, default 'alat' jika belum ada
                const jenis = t.jenis || 'alat';
                const statusInfo = t.jumlah_tersedia > 0 ? `${t.jumlah_tersedia} unit` : "HABIS";
                contextText += `- ${t.nama_alat} (${jenis}): Sisa ${statusInfo}, Kondisi ${t.kondisi}\n`;
            });
        } else {
            contextText += "Data alat tidak tersedia.\n";
        }

        // C. Data Jadwal (DENGAN FIX TIMEZONE JAKARTA)
        contextText += "\nJADWAL TERISI (YANG TIDAK BISA DIPINJAM):\n";
        if(schedules.length > 0) {
            schedules.forEach(s => {
                // Format Waktu Jakarta
                const options = { 
                    timeZone: 'Asia/Jakarta', 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                };

                const start = new Date(s.waktu_mulai).toLocaleString('id-ID', options);
                
                // Ambil jam selesai saja
                const end = new Date(s.waktu_selesai).toLocaleTimeString('id-ID', { 
                    timeZone: 'Asia/Jakarta', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false
                });

                // Handle jika nama ruang null
                const namaRuang = s.ruangan ? s.ruangan.nama_ruang : 'Tanpa Ruangan';
                contextText += `- ${namaRuang}: ${start} s/d ${end}\n`;
            });
        } else {
            contextText += "Tidak ada jadwal, semua ruangan kosong.\n";
        }

        // 4. PROMPT & REQUEST KE GEMINI
        const prompt = `
        Kamu adalah Asisten AI untuk Sistem Informasi Laboratorium (SISIL).
        Tugasmu menjawab pertanyaan mahasiswa berdasarkan data REAL-TIME di bawah.
        
        DATA LAB:
        ${contextText}
        
        PERTANYAAN USER: "${message}"
        
        JAWABAN KAMU:
        - Jawab ramah dan singkat.
        - Jika tanya ruangan: Cek "JADWAL TERISI". Jika tidak ada di sana, berarti kosong.
        - Jika tanya alat: Cek "DAFTAR STOK".
        - Gunakan Bahasa Indonesia.
        `;

        // Menggunakan library @google/genai
        const response = await genAI.models.generateContent({
            model: "gemini-1.5-flash", // Gunakan 1.5-flash (2.5 belum rilis umum, bisa bikin error 404)
            contents: prompt
        });
        
        // Ambil text dari response (library baru biasanya return object response)
        const text = response.text; 

        res.json({ reply: text });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Maaf, AI sedang sibuk." });
    }
};