const supabase = require('../config/supabase');

// 1. Ajukan Peminjaman (Create)
exports.createBooking = async (req, res) => {
  const { ruang_id, waktu_mulai, waktu_selesai, tujuan_peminjaman, alat_ids } = req.body;
  const userId = req.user.id; // Didapat dari middleware

  try {
    // STEP 1: Pengecekan Konflik Jadwal (Double Booking Check)
    // Logika: Cari booking lain di ruangan yang sama di mana waktunya bertabrakan
    const { data: conflictData, error: conflictError } = await supabase
      .from('peminjaman')
      .select('id')
      .eq('ruang_id', ruang_id)
      .neq('status', 'ditolak') // Abaikan yang sudah ditolak
      .neq('status', 'dibatalkan')
      .or(`and(waktu_mulai.lte.${waktu_selesai},waktu_selesai.gte.${waktu_mulai})`);
      // Query di atas mengecek overlap waktu

    if (conflictError) throw conflictError;
    if (conflictData.length > 0) {
      return res.status(409).json({ error: 'Ruangan sudah dipesan pada jam tersebut!' });
    }

    // STEP 2: Insert Peminjaman ke Database
    const { data: booking, error: bookingError } = await supabase
      .from('peminjaman')
      .insert([{
        user_id: userId,
        ruang_id,
        waktu_mulai,
        waktu_selesai,
        tujuan_peminjaman,
        status: 'pending' // Default status
      }])
      .select()
      .single();

    if (bookingError) throw bookingError;

    // STEP 3: Insert Detail Alat (Jika ada alat yang dipinjam)
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

    res.status(201).json({ message: 'Pengajuan peminjaman berhasil', data: booking });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. List Peminjaman (Admin lihat semua, User lihat punya sendiri)
exports.getBookings = async (req, res) => {
    // Cek role user dulu
    const { data: userData } = await supabase.from('users').select('role').eq('id', req.user.id).single();
    
    let query = supabase.from('peminjaman').select('*, users(nama), ruangan(nama_ruang)');

    // Jika bukan admin, hanya tampilkan data sendiri
    if (userData.role !== 'admin') {
        query = query.eq('user_id', req.user.id);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};

// 3. Approval (Khusus Admin)
exports.updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'disetujui' atau 'ditolak'

    const { data, error } = await supabase
        .from('peminjaman')
        .update({ status })
        .eq('id', id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: `Status berhasil diubah menjadi ${status}`, data });
};