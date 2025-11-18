const supabase = require('../config/supabase');

// Logika untuk MEMBUAT Ruangan Baru (Hanya Admin)
exports.createRoom = async (req, res) => {
    const { nama_ruang, kapasitas, lokasi } = req.body;

    if (!nama_ruang || !kapasitas || !lokasi) {
        return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    try {
        const { data, error } = await supabase
            .from('ruangan')
            .insert([
                { nama_ruang, kapasitas, lokasi }
            ])
            .select();

        if (error) throw error;
        res.status(201).json({ message: 'Ruangan berhasil ditambahkan', data: data[0] });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Logika untuk MELIHAT Semua Ruangan (Semua user boleh)
// Ini akan kita pakai di form peminjaman user biasa nanti
exports.getRooms = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ruangan')
            .select('*');
        
        if (error) throw error;
        res.status(200).json(data);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};