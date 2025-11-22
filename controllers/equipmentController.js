const supabase = require('../config/supabase');

// 1. Buat Alat (Admin)
exports.createEquipment = async (req, res) => {
    const { nama_alat, kategori, jumlah_total, kondisi } = req.body;
    if (!nama_alat || !kategori || !jumlah_total) return res.status(400).json({ error: 'Data tidak lengkap' });

    try {
        const { data, error } = await supabase
            .from('peralatan')
            .insert([{ nama_alat, kategori, jumlah_total, kondisi: kondisi || 'baik', jumlah_tersedia: jumlah_total }])
            .select();

        if (error) throw error;
        res.status(201).json({ message: 'Sukses', data: data[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. Lihat Alat (User & Admin) - REAL TIME STOCK
exports.getEquipment = async (req, res) => {
    try {
        // A. Ambil semua alat
        const { data: tools, error: toolsError } = await supabase
            .from('peralatan')
            .select('*')
            .order('nama_alat', { ascending: true });
        
        if (toolsError) throw toolsError;

        // B. Ambil data peminjaman yang SEDANG AKTIF
        const { data: loans, error: loansError } = await supabase
            .from('peminjaman_detail_alat')
            .select('alat_id, jumlah_pinjam, peminjaman!inner(status)')
            .eq('peminjaman.status', 'disetujui');

        if (loansError) throw loansError;

        // C. Hitung Sisa Stok
        const toolsWithRealStock = tools.map(tool => {
            const borrowedCount = loans
                .filter(l => l.alat_id === tool.id)
                .reduce((sum, l) => sum + l.jumlah_pinjam, 0);
            
            let realStock = tool.jumlah_total - borrowedCount;
            if (realStock < 0) realStock = 0;

            return {
                ...tool,
                jumlah_tersedia: realStock
            };
        });

        res.status(200).json(toolsWithRealStock);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. --- BARU: EDIT ALAT (Update Stok Total, Nama, dll) ---
exports.updateEquipment = async (req, res) => {
    const { id } = req.params;
    const { nama_alat, kategori, jumlah_total, kondisi } = req.body;

    try {
        // Update data di database
        // Catatan: Kita tidak perlu update 'jumlah_tersedia' secara manual di sini
        // karena 'jumlah_tersedia' dihitung secara real-time di fungsi getEquipment (Read).
        const { data, error } = await supabase
            .from('peralatan')
            .update({ nama_alat, kategori, jumlah_total, kondisi })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ message: 'Data alat berhasil diperbarui', data: data[0] });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Hapus Alat
exports.deleteEquipment = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('peralatan').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Terhapus' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};