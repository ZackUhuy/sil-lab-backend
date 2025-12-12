const supabase = require('../config/supabase');

// 1. AMBIL SEMUA DATA (GET)
exports.getAllEquipment = async (req, res) => {
    try {
        // Mengambil semua kolom termasuk 'jenis', diurutkan berdasarkan nama
        const { data, error } = await supabase
            .from('peralatan')
            .select('*')
            .order('nama_alat', { ascending: true });

        if (error) throw error;
        res.json(data);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. TAMBAH BARANG BARU (POST)
exports.createEquipment = async (req, res) => {
    // Ambil data dari body request (termasuk 'jenis')
    const { nama_alat, kategori, jumlah_total, kondisi, jenis } = req.body;

    try {
        // Validasi input sederhana
        if (!nama_alat || !jumlah_total) {
            return res.status(400).json({ error: "Nama alat dan jumlah total wajib diisi!" });
        }

        const { data, error } = await supabase
            .from('peralatan')
            .insert([{ 
                nama_alat, 
                kategori, 
                jumlah_total, 
                // Saat dibuat, jumlah tersedia = jumlah total
                jumlah_tersedia: jumlah_total, 
                kondisi, 
                // Jika jenis tidak dipilih, default ke 'alat'
                jenis: jenis || 'alat' 
            }])
            .select();

        if (error) throw error;

        res.status(201).json({ 
            message: 'Data berhasil ditambahkan', 
            data 
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. EDIT DATA BARANG (PUT)
exports.updateEquipment = async (req, res) => {
    const { id } = req.params;
    // Ambil data update (termasuk 'jenis')
    const { nama_alat, kategori, jumlah_total, kondisi, jenis } = req.body;

    try {
        // Update data berdasarkan ID
        // Catatan: Di sini kita tidak otomatis mengubah 'jumlah_tersedia' 
        // karena logikanya bisa rumit jika ada peminjaman aktif. 
        // Admin diasumsikan mengatur stok total saja.
        
        const { data, error } = await supabase
            .from('peralatan')
            .update({ 
                nama_alat, 
                kategori, 
                jumlah_total, 
                kondisi, 
                jenis 
            })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({ 
            message: 'Data berhasil diperbarui', 
            data 
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. HAPUS BARANG (DELETE)
exports.deleteEquipment = async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('peralatan')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: 'Data berhasil dihapus' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};