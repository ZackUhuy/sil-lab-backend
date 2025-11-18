const supabase = require('../config/supabase');

// Logika untuk MEMBUAT Peralatan Baru (Hanya Admin)
exports.createEquipment = async (req, res) => {
    const { nama_alat, kategori, jumlah_total, kondisi } = req.body;

    if (!nama_alat || !kategori || !jumlah_total) {
        return res.status(400).json({ error: 'Nama, kategori, dan jumlah total wajib diisi' });
    }

    try {
        const { data, error } = await supabase
            .from('peralatan')
            .insert([
                { 
                    nama_alat, 
                    kategori, 
                    jumlah_total, 
                    kondisi: kondisi || 'baik',
                    jumlah_tersedia: jumlah_total // Asumsi saat baru, tersedia = total
                }
            ])
            .select();

        if (error) throw error;
        res.status(201).json({ message: 'Peralatan berhasil ditambahkan', data: data[0] });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Logika untuk MELIHAT Semua Peralatan (Semua user boleh)
exports.getEquipment = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('peralatan')
            .select('*');
        
        if (error) throw error;
        res.status(200).json(data);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};