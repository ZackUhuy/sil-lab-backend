const supabase = require('../config/supabase');

exports.getStats = async (req, res) => {
    try {
        // 1. Ambil semua peminjaman (disetujui/selesai) beserta role pembuatnya
        const { data: allBookings, error: bookingError } = await supabase
            .from('peminjaman')
            .select('id, status, user_id, users(role)')
            .in('status', ['disetujui', 'selesai']);

        if (bookingError) throw bookingError;

        // Hitung Admin vs User
        let adminBookings = 0;
        let userBookings = 0;

        if (allBookings) {
            allBookings.forEach(b => {
                if (b.users?.role === 'admin') {
                    adminBookings++;
                } else {
                    userBookings++;
                }
            });
        }

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
        const { data: roomUsage } = await supabase
            .from('peminjaman')
            .select('ruang_id, ruangan(nama_ruang)')
            .in('status', ['disetujui', 'selesai']) 
            .not('ruang_id', 'is', null);

        // 6. Data Grafik 2: Alat Terpopuler
        const { data: toolUsage } = await supabase
            .from('peminjaman_detail_alat')
            .select('alat_id, jumlah_pinjam, peralatan(nama_alat), peminjaman!inner(status)')
            .in('peminjaman.status', ['disetujui', 'selesai']);

        res.json({
            totalBookings: (adminBookings + userBookings),
            countAdmin: adminBookings, // Data baru
            countUser: userBookings,   // Data baru
            pendingBookings: pendingBookings || 0,
            damageReports: damageReports || 0,
            totalTools: totalTools || 0,
            roomUsage: roomUsage || [],
            toolUsage: toolUsage || [] 
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};