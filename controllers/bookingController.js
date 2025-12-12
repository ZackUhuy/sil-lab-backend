const supabase = require('../config/supabase');

// 1. Ajukan Peminjaman (User/Mahasiswa)
exports.createBooking = async (req, res) => {
  const { ruang_id, waktu_mulai, waktu_selesai, tujuan_peminjaman, alat_ids } = req.body;
  const userId = req.user.id; 

  try {
    // Cek Bentrok Ruangan (Jika ada ruang_id)
    if(ruang_id) {
        const { data: c, error: e } = await supabase
            .from('peminjaman')
            .select('id')
            .eq('ruang_id', ruang_id)
            .neq('status', 'ditolak')
            .neq('status', 'dibatalkan')
            .or(`and(waktu_mulai.lte.${waktu_selesai},waktu_selesai.gte.${waktu_mulai})`);
        
        if (e) throw e; 
        if (c.length > 0) return res.status(409).json({ error: 'Ruangan bentrok dengan jadwal lain!' });
    }

    // Insert Peminjaman Utama
    const { data: b, error: be } = await supabase
        .from('peminjaman')
        .insert([{ 
            user_id: userId, 
            ruang_id: ruang_id || null, 
            waktu_mulai, 
            waktu_selesai, 
            tujuan_peminjaman, 
            status: 'pending' 
        }])
        .select()
        .single();

    if (be) throw be;

    // Insert Detail Alat (Jika ada)
    if (alat_ids?.length > 0) {
        const da = alat_ids.map(a => ({ 
            peminjaman_id: b.id, 
            alat_id: a.id, 
            jumlah_pinjam: a.jumlah 
        }));
        const { error: ae } = await supabase.from('peminjaman_detail_alat').insert(da);
        if (ae) throw ae;
    }

    res.status(201).json({ message: 'Peminjaman berhasil diajukan', data: b });

  } catch (err) { 
      res.status(500).json({ error: err.message }); 
  }
};

// 2. List Peminjaman (Untuk Tabel Admin & Riwayat User)
exports.getBookings = async (req, res) => {
    try {
        // Cek Role User yang request
        const { data: u } = await supabase.from('users').select('role').eq('id', req.user.id).single();
        
        // Query Dasar (Ambil Role User Peminjam juga agar Admin Dashboard berwarna)
        let q = supabase.from('peminjaman')
            .select(`
                *, 
                users(nama, role, email), 
                ruangan(nama_ruang), 
                peminjaman_detail_alat(
                    jumlah_pinjam, 
                    peralatan(nama_alat, jenis)
                )
            `);
        
        // Jika bukan admin, hanya bisa lihat data sendiri (Riwayat Saya)
        if (u.role !== 'admin') {
            q = q.eq('user_id', req.user.id);
        }

        const { data, error } = await q.order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Update Status (LOGIKA BARU: Potong Stok Bahan)
exports.updateStatus = async (req, res) => {
    const { id } = req.params; 
    const { status } = req.body; 
    
    try {
        // A. Update Status Peminjaman Dulu
        const { data: booking, error: errUpdate } = await supabase
            .from('peminjaman')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (errUpdate) throw errUpdate;

        // B. LOGIKA POTONG STOK (Hanya jika status jadi 'disetujui')
        if (status === 'disetujui') {
            
            // 1. Ambil detail barang yang dipinjam
            const { data: details, error: errDetail } = await supabase
                .from('peminjaman_detail_alat')
                .select('jumlah_pinjam, peralatan(id, nama_alat, jenis, jumlah_total)')
                .eq('peminjaman_id', id);

            if (errDetail) throw errDetail;

            // 2. Loop cek setiap barang
            for (let item of details) {
                // HANYA JIKA JENISNYA 'BAHAN' (Habis Pakai)
                if (item.peralatan && item.peralatan.jenis === 'bahan') {
                    
                    const stokBaru = item.peralatan.jumlah_total - item.jumlah_pinjam;
                    
                    // Cek stok cukup gak
                    if (stokBaru < 0) {
                        // Jika stok kurang, batalkan approval (Rollback manual)
                        await supabase.from('peminjaman').update({ status: 'pending' }).eq('id', id);
                        return res.status(400).json({ 
                            error: `Gagal! Stok bahan "${item.peralatan.nama_alat}" tidak cukup. Sisa: ${item.peralatan.jumlah_total}` 
                        });
                    }

                    // Update Master Data Peralatan (Kurangi Permanen)
                    // Kita update jumlah_total DAN jumlah_tersedia karena bahan sifatnya langsung hilang
                    await supabase
                        .from('peralatan')
                        .update({ 
                            jumlah_total: stokBaru,
                            jumlah_tersedia: stokBaru 
                        })
                        .eq('id', item.peralatan.id);
                }
            }
        }

        res.json({ message: `Status berhasil diubah menjadi ${status}`, data: booking });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Jadwal Publik (Untuk Dashboard User - Transparan)
exports.getPublicSchedule = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0,0,0,0); 

        // Mengambil data lengkap agar User bisa lihat siapa yang pinjam
        const { data, error } = await supabase
            .from('peminjaman')
            .select(`
                id, 
                ruang_id, 
                waktu_mulai, 
                waktu_selesai, 
                tujuan_peminjaman, 
                users(nama, role), 
                peminjaman_detail_alat(jumlah_pinjam, peralatan(nama_alat))
            `)
            .eq('status', 'disetujui') 
            .gte('waktu_mulai', today.toISOString());

        if (error) throw error; 
        res.json(data);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// 5. Hapus Peminjaman
exports.deleteBooking = async (req, res) => {
    const { id } = req.params;
    try { 
        const { error } = await supabase.from('peminjaman').delete().eq('id', id); 
        if (error) throw error; 
        res.json({ message: 'Data peminjaman berhasil dihapus' }); 
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// 6. Admin Create (Fitur Jadwal Berulang)
exports.createAdminBooking = async (req, res) => {
    const { ruang_id, waktu_mulai, waktu_selesai, tujuan_peminjaman, is_repeat, repeat_count } = req.body;
    const userId = req.user.id;

    try {
        const total = (is_repeat && repeat_count > 0) ? parseInt(repeat_count) : 1;
        const inserts = [];

        for (let i = 0; i < total; i++) {
            const start = new Date(waktu_mulai); 
            const end = new Date(waktu_selesai);
            
            start.setDate(start.getDate() + (i * 7)); 
            end.setDate(end.getDate() + (i * 7));
            
            const sISO = start.toISOString(); 
            const eISO = end.toISOString();

            if(ruang_id) {
                const { data: c, error: e } = await supabase
                    .from('peminjaman')
                    .select('id')
                    .eq('ruang_id', ruang_id)
                    .neq('status', 'ditolak')
                    .neq('status', 'dibatalkan')
                    .or(`and(waktu_mulai.lte.${eISO},waktu_selesai.gte.${sISO})`);
                
                if (e) throw e; 
                if (c.length > 0) return res.status(409).json({ error: `Bentrok pada pertemuan ke-${i+1} (${start.toLocaleDateString()})` });
            }

            inserts.push({ 
                user_id: userId, 
                ruang_id: ruang_id || null, 
                waktu_mulai: sISO, 
                waktu_selesai: eISO, 
                tujuan_peminjaman: tujuan_peminjaman + (total > 1 ? ` (Pert. ${i+1})` : ''), 
                status: 'disetujui' // Admin langsung ACC
            });
        }

        const { data, error } = await supabase.from('peminjaman').insert(inserts).select();
        if (error) throw error; 
        res.status(201).json({ message: 'Jadwal kuliah berhasil dibuat', data });

    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// 7. Active Tool Loans (Untuk Popup "Lihat Peminjam")
exports.getActiveToolLoans = async (req, res) => {
    try {
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('peminjaman_detail_alat')
            .select(`
                jumlah_pinjam,
                alat_id,
                peminjaman!inner (
                    status,
                    waktu_mulai,
                    waktu_selesai,
                    users (nama, email, role) 
                )
            `)
            .eq('peminjaman.status', 'disetujui')
            .gt('peminjaman.waktu_selesai', now); 

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};