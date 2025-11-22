const supabase = require('../config/supabase');

// 1. Buat Laporan (User)
exports.createReport = async (req, res) => {
    const { alat_id, deskripsi_kerusakan } = req.body;
    const userId = req.user.id;

    if (!alat_id || !deskripsi_kerusakan) return res.status(400).json({ error: 'Wajib diisi' });

    try {
        const { data, error } = await supabase
            .from('laporan_kerusakan')
            .insert([{
                user_id: userId,
                alat_id: alat_id,
                deskripsi_kerusakan: deskripsi_kerusakan,
                status_laporan: 'baru', // Default
                tanggal_lapor: new Date().toISOString()
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ message: 'Laporan terkirim', data: data[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. Lihat Laporan Saya (User)
exports.getMyReports = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('laporan_kerusakan')
            .select('*, peralatan(nama_alat)')
            .eq('user_id', req.user.id)
            .order('tanggal_lapor', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. Lihat SEMUA Laporan (Admin)
exports.getAllReports = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('laporan_kerusakan')
            .select('*, peralatan(nama_alat), users(nama)')
            .order('tanggal_lapor', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. --- BARU: UPDATE STATUS LAPORAN (Admin) ---
exports.updateReportStatus = async (req, res) => {
    const { id } = req.params;
    const { status_laporan } = req.body; // 'baru', 'diproses', 'selesai'

    try {
        const { data, error } = await supabase
            .from('laporan_kerusakan')
            .update({ status_laporan })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ message: 'Status laporan diperbarui', data: data[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
};