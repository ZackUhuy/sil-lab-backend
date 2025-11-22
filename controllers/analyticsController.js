const supabase = require('../config/supabase');

exports.getStats = async (req, res) => {
    try {
        // 1. Hitung Total Peminjaman (Semua status)
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

        // 4. Hitung Total Alat
        const { count: totalTools } = await supabase
            .from('peralatan')
            .select('*', { count: 'exact', head: true });

        // 5. Data Grafik: Peminjaman per Ruangan (Group by Room)
        // Karena supabase v1/v2 agak terbatas di grouping complex, kita ambil raw data 'disetujui'
        // lalu hitung di JS (masih ringan untuk skala lab kampus)
        const { data: roomUsage } = await supabase
            .from('peminjaman')
            .select('ruang_id, ruangan(nama_ruang)')
            .eq('status', 'disetujui');

        res.json({
            totalBookings: totalBookings || 0,
            pendingBookings: pendingBookings || 0,
            damageReports: damageReports || 0,
            totalTools: totalTools || 0,
            roomUsage: roomUsage || []
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};