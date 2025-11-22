const supabase = require('../config/supabase');

exports.getStats = async (req, res) => {
    try {
        // 1. Hitung Total Peminjaman
        const { count: totalBookings } = await supabase
            .from('peminjaman')
            .select('*', { count: 'exact', head: true });

        // 2. Hitung Permintaan Pending
        const { count: pendingBookings } = await supabase
            .from('peminjaman')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        // 3. Hitung Laporan Kerusakan Baru
        const { count: damageReports } = await supabase
            .from('laporan_kerusakan')
            .select('*', { count: 'exact', head: true })
            .eq('status_laporan', 'baru');

        // 4. Hitung Total Aset Alat
        const { count: totalTools } = await supabase
            .from('peralatan')
            .select('*', { count: 'exact', head: true });

        // 5. Data Grafik 1: Peminjaman per Ruangan
        // Ambil data peminjaman yang disetujui dan memiliki ruangan
        const { data: roomUsage } = await supabase
            .from('peminjaman')
            .select('ruang_id, ruangan(nama_ruang)')
            .eq('status', 'disetujui')
            .not('ruang_id', 'is', null);

        // 6. Data Grafik 2: Peminjaman Alat Terpopuler (BARU)
        // Ambil data detail peminjaman alat
        const { data: toolUsage } = await supabase
            .from('peminjaman_detail_alat')
            .select('alat_id, jumlah_pinjam, peralatan(nama_alat)');

        res.json({
            totalBookings: totalBookings || 0,
            pendingBookings: pendingBookings || 0,
            damageReports: damageReports || 0,
            totalTools: totalTools || 0,
            roomUsage: roomUsage || [],
            toolUsage: toolUsage || [] // Kirim data alat ke frontend
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};