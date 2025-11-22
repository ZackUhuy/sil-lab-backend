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

// 2. Lihat Alat (User & Admin) - LOGIKA PERBAIKAN WAKTU
exports.getEquipment = async (req, res) => {
    try {
        // A. Ambil semua alat
        const { data: tools, error: toolsError } = await supabase
            .from('peralatan')
            .select('*')
            .order('nama_alat', { ascending: true });
        
        if (toolsError) throw toolsError;

        // B. Ambil data peminjaman yang 'disetujui' DAN ambil waktu selesainya
        const { data: loans, error: loansError } = await supabase
            .from('peminjaman_detail_alat')
            .select('alat_id, jumlah_pinjam, peminjaman!inner(status, waktu_selesai)')
            .eq('peminjaman.status', 'disetujui');

        if (loansError) throw loansError;

        const now = new Date(); // Waktu Sekarang

        // C. Hitung Sisa Stok
        const toolsWithRealStock = tools.map(tool => {
            
            const borrowedCount = loans
                .filter(l => {
                    // 1. Pastikan ID alat sama
                    const isSameTool = l.alat_id === tool.id;
                    
                    // 2. LOGIKA BARU: Cek apakah waktu pinjam MASIH BERLAKU?
                    // Barang dianggap "Sedang Dipinjam" HANYA JIKA waktu_selesai > waktu_sekarang
                    const endTime = new Date(l.peminjaman.waktu_selesai);
                    const isStillActive = endTime > now;

                    return isSameTool && isStillActive;
                })
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

// 3. Update Alat
exports.updateEquipment = async (req, res) => {
    const { id } = req.params;
    const { nama_alat, kategori, jumlah_total, kondisi } = req.body;
    try {
        const { data, error } = await supabase.from('peralatan').update({ nama_alat, kategori, jumlah_total, kondisi }).eq('id', id).select();
        if (error) throw error;
        res.json({ message: 'Update sukses', data: data[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
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