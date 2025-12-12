const supabase = require('../config/supabase');

// 1. Ajukan Peminjaman
exports.createBooking = async (req, res) => {
  const { ruang_id, waktu_mulai, waktu_selesai, tujuan_peminjaman, alat_ids } = req.body;
  const userId = req.user.id; 
  try {
    if(ruang_id) {
        const { data: c, error: e } = await supabase.from('peminjaman').select('id').eq('ruang_id', ruang_id).neq('status', 'ditolak').neq('status', 'dibatalkan').or(`and(waktu_mulai.lte.${waktu_selesai},waktu_selesai.gte.${waktu_mulai})`);
        if (e) throw e; if (c.length > 0) return res.status(409).json({ error: 'Ruangan bentrok!' });
    }
    const { data: b, error: be } = await supabase.from('peminjaman').insert([{ user_id: userId, ruang_id: ruang_id || null, waktu_mulai, waktu_selesai, tujuan_peminjaman, status: 'pending' }]).select().single();
    if (be) throw be;
    if (alat_ids?.length > 0) {
        const da = alat_ids.map(a => ({ peminjaman_id: b.id, alat_id: a.id, jumlah_pinjam: a.jumlah }));
        const { error: ae } = await supabase.from('peminjaman_detail_alat').insert(da);
        if (ae) throw ae;
    }
    res.status(201).json({ message: 'Sukses', data: b });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. List Peminjaman (DIPERBAIKI: users(nama, role))
exports.getBookings = async (req, res) => {
    const { data: u } = await supabase.from('users').select('role').eq('id', req.user.id).single();
    
    // --- PERUBAHAN DI SINI: Menambahkan 'role' ---
    let q = supabase.from('peminjaman')
        .select('*, users(nama, role), ruangan(nama_ruang), peminjaman_detail_alat(jumlah_pinjam, peralatan(nama_alat))');
    
    if (u.role !== 'admin') q = q.eq('user_id', req.user.id);
    const { data, error } = await q.order('created_at', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};

// 3. Status
exports.updateStatus = async (req, res) => {
    const { id } = req.params; const { status } = req.body; 
    const { data, error } = await supabase.from('peminjaman').update({ status }).eq('id', id).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: `Status: ${status}`, data });
};

// 4. Jadwal Publik (Realtime Check)
exports.getPublicSchedule = async (req, res) => {
    try {
        const now = new Date().toISOString();
        const { data, error } = await supabase.from('peminjaman').select('ruang_id, waktu_mulai, waktu_selesai').eq('status', 'disetujui').gte('waktu_selesai', now); 
        if (error) throw error; res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 5. Hapus
exports.deleteBooking = async (req, res) => {
    const { id } = req.params;
    try { const { error } = await supabase.from('peminjaman').delete().eq('id', id); if (error) throw error; res.json({ message: 'Terhapus' }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

// 6. Admin Create
exports.createAdminBooking = async (req, res) => {
    const { ruang_id, waktu_mulai, waktu_selesai, tujuan_peminjaman, is_repeat, repeat_count } = req.body;
    const userId = req.user.id;
    try {
        const total = (is_repeat && repeat_count > 0) ? parseInt(repeat_count) : 1;
        const inserts = [];
        for (let i = 0; i < total; i++) {
            const start = new Date(waktu_mulai); const end = new Date(waktu_selesai);
            start.setDate(start.getDate() + (i * 7)); end.setDate(end.getDate() + (i * 7));
            const sISO = start.toISOString(); const eISO = end.toISOString();
            if(ruang_id) {
                const { data: c, error: e } = await supabase.from('peminjaman').select('id').eq('ruang_id', ruang_id).neq('status', 'ditolak').neq('status', 'dibatalkan').or(`and(waktu_mulai.lte.${eISO},waktu_selesai.gte.${sISO})`);
                if (e) throw e; if (c.length > 0) return res.status(409).json({ error: `Bentrok pertemuan ${i+1}` });
            }
            inserts.push({ user_id: userId, ruang_id: ruang_id||null, waktu_mulai: sISO, waktu_selesai: eISO, tujuan_peminjaman: tujuan_peminjaman+(total>1?` (Pert. ${i+1})`:''), status: 'disetujui' });
        }
        const { data, error } = await supabase.from('peminjaman').insert(inserts).select();
        if (error) throw error; res.status(201).json({ message: 'Sukses', data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 7. --- ACTIVE TOOL LOANS (DIPERBAIKI: users(nama, email, role)) ---
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
            `) // ^-- Ditambahkan 'role' di sini juga agar popup alat lengkap
            .eq('peminjaman.status', 'disetujui')
            .gt('peminjaman.waktu_selesai', now);

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};