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

// 2. Lihat Alat (User & Admin) - DENGAN PERHITUNGAN REAL-TIME
exports.getEquipment = async (req, res) => {
    try {
        // A. Ambil semua alat
        const { data: tools, error: toolsError } = await supabase
            .from('peralatan')
            .select('*')
            .order('nama_alat', { ascending: true });
        
        if (toolsError) throw toolsError;

        // B. Ambil data peminjaman yang SEDANG AKTIF (Status 'disetujui')
        // Kita hitung berapa banyak alat yang sedang keluar
        const { data: loans, error: loansError } = await supabase
            .from('peminjaman_detail_alat')
            .select('alat_id, jumlah_pinjam, peminjaman!inner(status)')
            .eq('peminjaman.status', 'disetujui');

        if (loansError) throw loansError;

        // C. Gabungkan & Hitung Sisa Stok
        const toolsWithRealStock = tools.map(tool => {
            // Hitung total yang sedang dipinjam untuk alat ini
            const borrowedCount = loans
                .filter(l => l.alat_id === tool.id)
                .reduce((sum, l) => sum + l.jumlah_pinjam, 0);
            
            // Sisa = Total - Dipinjam
            let realStock = tool.jumlah_total - borrowedCount;
            if (realStock < 0) realStock = 0; // Safety check

            return {
                ...tool,
                jumlah_tersedia: realStock // Override nilai database dengan hasil hitungan
            };
        });

        // Opsional: Filter hanya yang stok > 0 jika ingin menyembunyikan yang habis
        // const availableTools = toolsWithRealStock.filter(t => t.jumlah_tersedia > 0);

        res.status(200).json(toolsWithRealStock);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Hapus Alat
exports.deleteEquipment = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('peralatan').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Terhapus' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};