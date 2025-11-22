const supabase = require('../config/supabase');

// 1. Buat Ruangan
exports.createRoom = async (req, res) => {
    const { nama_ruang, kapasitas, lokasi } = req.body;
    if (!nama_ruang || !kapasitas || !lokasi) return res.status(400).json({ error: 'Semua field wajib diisi' });

    try {
        const { data, error } = await supabase
            .from('ruangan')
            .insert([{ nama_ruang, kapasitas, lokasi, status: 'tersedia' }]) // Default tersedia
            .select();

        if (error) throw error;
        res.status(201).json({ message: 'Ruangan berhasil ditambahkan', data: data[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. Lihat Ruangan
exports.getRooms = async (req, res) => {
    try {
        const { data, error } = await supabase.from('ruangan').select('*').order('nama_ruang', { ascending: true });
        if (error) throw error;
        res.status(200).json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. --- BARU: UPDATE STATUS MAINTENANCE ---
exports.updateRoomStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'tersedia' atau 'maintenance'

    try {
        const { data, error } = await supabase
            .from('ruangan')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ message: `Status ruangan berhasil diubah menjadi ${status}`, data: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Hapus Ruangan
exports.deleteRoom = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('ruangan').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Ruangan berhasil dihapus' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};