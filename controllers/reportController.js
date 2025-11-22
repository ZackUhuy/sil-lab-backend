const supabase = require('../config/supabase');

// 1. Buat Laporan Kerusakan Baru
exports.createReport = async (req, res) => {
    const { alat_id, deskripsi_kerusakan } = req.body;
    const userId = req.user.id;

    if (!alat_id || !deskripsi_kerusakan) {
        return res.status(400).json({ error: 'Alat dan deskripsi kerusakan wajib diisi' });
    }

    try {
        const { data, error } = await supabase
            .from('laporan_kerusakan')
            .insert([{
                user_id: userId,
                alat_id: alat_id,
                deskripsi_kerusakan: deskripsi_kerusakan,
                status_laporan: 'baru',
                tanggal_lapor: new Date().toISOString()
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ message: 'Laporan kerusakan berhasil dikirim', data: data[0] });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Lihat Riwayat Laporan Saya (User)
exports.getMyReports = async (req, res) => {
    try {
        // Join dengan tabel peralatan untuk dapat nama alat
        const { data, error } = await supabase
            .from('laporan_kerusakan')
            .select('*, peralatan(nama_alat)')
            .eq('user_id', req.user.id)
            .order('tanggal_lapor', { ascending: false });

        if (error) throw error;
        res.json(data);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Lihat Semua Laporan (Khusus Admin - Nanti dipakai di Admin Dashboard)
exports.getAllReports = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('laporan_kerusakan')
            .select('*, peralatan(nama_alat), users(nama)')
            .order('tanggal_lapor', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};