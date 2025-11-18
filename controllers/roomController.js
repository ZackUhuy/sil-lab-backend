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

// --- BARU: HAPUS RUANGAN ---
exports.deleteRoom = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('ruangan')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Ruangan berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};