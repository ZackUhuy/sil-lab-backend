const { GoogleGenAI } = require("@google/genai");
const supabase = require('../config/supabase');
require('dotenv').config();

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

exports.chatAvailability = async (req, res) => {
    const { message } = req.body;

    try {
        // 1. SIAPKAN DATA WAKTU
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 7); 

        // 2. AMBIL DATA DARI DATABASE (PARALEL AGAR CEPAT)
        const [schedulesRes, roomsRes, toolsRes] = await Promise.all([
            // A. Data Jadwal (Disetujui, Hari ini s/d 7 hari ke depan)
            supabase.from('peminjaman')
                .select('ruang_id, waktu_mulai, waktu_selesai, ruangan(nama_ruang)')
                .eq('status', 'disetujui')
                .gte('waktu_selesai', today.toISOString())
                .lte('waktu_mulai', tomorrow.toISOString()),

            // B. Data Ruangan
            supabase.from('ruangan').select('id, nama_ruang, kapasitas'),

            // C. Data Alat (INI YANG BARU DITAMBAHKAN)
            supabase.from('peralatan').select('nama_alat, jumlah_tersedia, kondisi, jenis')
        ]);

        const schedules = schedulesRes.data || [];
        const rooms = roomsRes.data || [];
        const tools = toolsRes.data || [];

        // 3. SUSUN KONTEKS UNTUK AI
        let contextText = "--- DATA LABORATORIUM ---\n\n";

        // Masukkan Data Ruangan
        contextText += "DAFTAR RUANGAN:\n";
        rooms.forEach(r => contextText += `- ${r.nama_ruang} (Kapasitas: ${r.kapasitas} orang)\n`);
        
        // Masukkan Data Alat (NEW)
        contextText += "\nDAFTAR STOK ALAT & BAHAN:\n";
        if (tools.length > 0) {
            tools.forEach(t => {
                const statusInfo = t.jumlah_tersedia > 0 ? `${t.jumlah_tersedia} unit` : "HABIS";
                contextText += `- ${t.nama_alat} (${t.jenis}): Sisa ${statusInfo}, Kondisi ${t.kondisi}\n`;
            });
        } else {
            contextText += "Data alat tidak tersedia.\n";
        }

        // Masukkan Data Jadwal Terisi
        contextText += "\nJADWAL TERISI (RUANGAN TIDAK BISA DIPAKAI):\n";
        if(schedules.length > 0) {
            schedules.forEach(s => {
                const options = { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false };
                const start = new Date(s.waktu_mulai).toLocaleString('id-ID', options);
                const end = new Date(s.waktu_selesai).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
                
                // Pastikan nama ruangan ada (jaga-jaga jika pinjam alat saja tanpa ruangan)
                const namaRuang = s.ruangan ? s.ruangan.nama_ruang : 'Tanpa Ruangan (Hanya Alat)';
                contextText += `- ${namaRuang}: ${start} s/d ${end}\n`;
            });
        } else {
            contextText += "Tidak ada jadwal, semua ruangan kosong.\n";
        }

        // 4. KIRIM PROMPT KE GEMINI
        const prompt = `
        Kamu adalah Asisten AI untuk Sistem Informasi Laboratorium (SISIL).
        Tugasmu menjawab pertanyaan mahasiswa terkait ketersediaan Ruangan DAN Alat.
        
        Berikut adalah DATA REAL-TIME (Jujur sesuai data ini):
        ${contextText}
        
        PERTANYAAN USER: "${message}"
        
        PANDUAN MENJAWAB:
        1. Jika user tanya ruangan, cek bagian "JADWAL TERISI".
        2. Jika user tanya alat/barang, cek bagian "DAFTAR STOK ALAT". Beritahu sisa stoknya.
        3. Jika stok habis, katakan habis.
        4. Jawab ramah, singkat, bahasa Indonesia sopan.
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