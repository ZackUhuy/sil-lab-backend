const supabase = require('../config/supabase');

// 1. Ajukan Peminjaman
exports.createBooking = async (req, res) => {
  const { ruang_id, waktu_mulai, waktu_selesai, tujuan_peminjaman, alat_ids } = req.body;
  const userId = req.user.id; 

  try {
    // --- LOGIKA BARU: Cek Konflik HANYA JIKA ada ruangan yang dipilih ---
    if (ruang_id) {
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
    }
    // ---------------------------------------------------------------------

    // Insert Peminjaman (ruang_id bisa null jika cuma pinjam alat)
    const { data: booking, error: bookingError } = await supabase
      .from('peminjaman')
      .insert([{
        user_id: userId,
        ruang_id: ruang_id || null, // Izinkan Null
        waktu_mulai,
        waktu_selesai,
        tujuan_peminjaman,
        status: 'pending'
      }])
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Insert Detail Alat
    if (alat_ids && alat_ids.length > 0) {
        const detailAlat = alat_ids.map(alat => ({
            peminjaman_id: booking.id,
            alat_id: alat.id,
            jumlah_pinjam: alat.jumlah
        }));
        
        const { error: alatError } = await supabase
            .from('peminjaman_detail_alat')
            .insert(detailAlat);
            
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
    let query = supabase.from('peminjaman').select('*, users(nama), ruangan(nama_ruang), peminjaman_detail_alat(jumlah_pinjam, peralatan(nama_alat))');

    if (userData.role !== 'admin') {
        query = query.eq('user_id', req.user.id);
    }

    // Urutkan dari yang terbaru
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};

// ... (Fungsi updateStatus, getPublicSchedule, deleteBooking, createAdminBooking TETAP SAMA seperti sebelumnya) ...
// ... (Agar file tidak terlalu panjang, pastikan bagian bawah file ini tetap ada/sama) ...
// Copy paste bagian bawah dari file sebelumnya jika perlu, atau minta saya kirim full file jika ragu.

// 3. Approval Status
exports.updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 
    const { data, error } = await supabase.from('peminjaman').update({ status }).eq('id', id).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: `Status berhasil diubah menjadi ${status}`, data });
};

// 4. Jadwal Publik
exports.getPublicSchedule = async (req, res) => {
    try {
        const now = new Date().toISOString();
        const { data, error } = await supabase.from('peminjaman').select('ruang_id, waktu_mulai, waktu_selesai').eq('status', 'disetujui').gte('waktu_selesai', now); 
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 5. Hapus Booking
exports.deleteBooking = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('peminjaman').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Data berhasil dihapus' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 6. Admin Create
exports.createAdminBooking = async (req, res) => {
    const { ruang_id, waktu_mulai, waktu_selesai, tujuan_peminjaman, is_repeat, repeat_count } = req.body;
    const userId = req.user.id;
    try {
        const totalMinggu = (is_repeat && repeat_count > 0) ? parseInt(repeat_count) : 1;
        const bookingsToInsert = [];
        for (let i = 0; i < totalMinggu; i++) {
            const startDate = new Date(waktu_mulai);
            const endDate = new Date(waktu_selesai);
            startDate.setDate(startDate.getDate() + (i * 7));
            endDate.setDate(endDate.getDate() + (i * 7));
            const startISO = startDate.toISOString();
            const endISO = endDate.toISOString();

            if(ruang_id) {
                const { data: conflictData, error: conflictError } = await supabase.from('peminjaman').select('id').eq('ruang_id', ruang_id).neq('status', 'ditolak').neq('status', 'dibatalkan').or(`and(waktu_mulai.lte.${endISO},waktu_selesai.gte.${startISO})`);
                if (conflictError) throw conflictError;
                if (conflictData.length > 0) return res.status(409).json({ error: `Bentrok pertemuan ke-${i+1}` });
            }

            bookingsToInsert.push({ user_id: userId, ruang_id: ruang_id || null, waktu_mulai: startISO, waktu_selesai: endISO, tujuan_peminjaman: tujuan_peminjaman + (totalMinggu > 1 ? ` (Pert. ${i+1})` : ''), status: 'disetujui' });
        }
        const { data, error } = await supabase.from('peminjaman').insert(bookingsToInsert).select();
        if (error) throw error;
        res.status(201).json({ message: `Berhasil`, data: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};