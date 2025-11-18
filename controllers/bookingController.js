const supabase = require('../config/supabase');

// 1. Ajukan Peminjaman (User Biasa - Status Pending)
exports.createBooking = async (req, res) => {
  const { ruang_id, waktu_mulai, waktu_selesai, tujuan_peminjaman, alat_ids } = req.body;
  const userId = req.user.id; 

  try {
    // Cek Konflik
    const { data: conflictData, error: conflictError } = await supabase
      .from('peminjaman')
      .select('id')
      .eq('ruang_id', ruang_id)
      .neq('status', 'ditolak') 
      .neq('status', 'dibatalkan')
      .or(`and(waktu_mulai.lte.${waktu_selesai},waktu_selesai.gte.${waktu_mulai})`);

    if (conflictError) throw conflictError;
    if (conflictData.length > 0) {
      return res.status(409).json({ error: 'Ruangan sudah dipesan pada jam tersebut!' });
    }

    // Insert
    const { data: booking, error: bookingError } = await supabase
      .from('peminjaman')
      .insert([{
        user_id: userId,
        ruang_id,
        waktu_mulai,
        waktu_selesai,
        tujuan_peminjaman,
        status: 'pending'
      }])
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Insert Detail Alat (Jika ada)
    if (alat_ids && alat_ids.length > 0) {
        const detailAlat = alat_ids.map(alat => ({
            peminjaman_id: booking.id,
            alat_id: alat.id,
            jumlah_pinjam: alat.jumlah
        }));
        const { error: alatError } = await supabase.from('peminjaman_detail_alat').insert(detailAlat);
        if (alatError) throw alatError;
    }

    res.status(201).json({ message: 'Pengajuan berhasil', data: booking });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. List Peminjaman 
exports.getBookings = async (req, res) => {
    const { data: userData } = await supabase.from('users').select('role').eq('id', req.user.id).single();
    let query = supabase.from('peminjaman').select('*, users(nama), ruangan(nama_ruang)');

    if (userData.role !== 'admin') {
        query = query.eq('user_id', req.user.id);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};

// 3. Approval Status
exports.updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 

    const { data, error } = await supabase
        .from('peminjaman')
        .update({ status })
        .eq('id', id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: `Status berhasil diubah menjadi ${status}`, data });
};

// 4. Jadwal Publik (Untuk Dashboard Monitoring)
exports.getPublicSchedule = async (req, res) => {
    try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('peminjaman')
            .select('ruang_id, waktu_mulai, waktu_selesai')
            .eq('status', 'disetujui')
            .gte('waktu_selesai', now); 

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 5. Hapus Jadwal
exports.deleteBooking = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('peminjaman')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 6. --- BUAT JADWAL MANUAL (Admin Only + Fitur Berulang) ---
exports.createAdminBooking = async (req, res) => {
    const { ruang_id, waktu_mulai, waktu_selesai, tujuan_peminjaman, is_repeat, repeat_count } = req.body;
    const userId = req.user.id;
  
    try {
        // Tentukan berapa kali loop. Jika tidak berulang, loop 1 kali saja.
        const totalMinggu = (is_repeat && repeat_count > 0) ? parseInt(repeat_count) : 1;
        
        const bookingsToInsert = [];
        
        // --- TAHAP 1: VALIDASI SEMUA TANGGAL DULU ---
        for (let i = 0; i < totalMinggu; i++) {
            const startDate = new Date(waktu_mulai);
            const endDate = new Date(waktu_selesai);

            // Tambah 7 hari * i
            startDate.setDate(startDate.getDate() + (i * 7));
            endDate.setDate(endDate.getDate() + (i * 7));

            const startISO = startDate.toISOString();
            const endISO = endDate.toISOString();

            // Cek Konflik
            const { data: conflictData, error: conflictError } = await supabase
                .from('peminjaman')
                .select('id')
                .eq('ruang_id', ruang_id)
                .neq('status', 'ditolak')
                .neq('status', 'dibatalkan')
                .or(`and(waktu_mulai.lte.${endISO},waktu_selesai.gte.${startISO})`);

            if (conflictError) throw conflictError;

            if (conflictData.length > 0) {
                const tglBentrok = startDate.toLocaleDateString('id-ID');
                return res.status(409).json({ 
                    error: `Gagal! Jadwal bentrok pada pertemuan ke-${i+1} (Tanggal ${tglBentrok}). Seluruh proses dibatalkan.` 
                });
            }

            // Masukkan ke antrean insert
            bookingsToInsert.push({
                user_id: userId,
                ruang_id,
                waktu_mulai: startISO,
                waktu_selesai: endISO,
                tujuan_peminjaman: tujuan_peminjaman + (totalMinggu > 1 ? ` (Pertemuan ${i+1})` : ''),
                status: 'disetujui' // Admin otomatis approve
            });
        }

        // --- TAHAP 2: SIMPAN SEMUA ---
        const { data, error } = await supabase
            .from('peminjaman')
            .insert(bookingsToInsert)
            .select();
  
        if (error) throw error;

        res.status(201).json({ 
            message: `Berhasil membuat ${bookingsToInsert.length} jadwal pertemuan.`, 
            data: data 
        });
  
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
};