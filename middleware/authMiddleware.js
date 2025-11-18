const supabase = require('../config/supabase');

// Middleware untuk mengecek apakah user sudah login (token valid)
exports.requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak, token tidak ada' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Token tidak valid atau kadaluarsa' });
  }

  // Simpan data user di request agar bisa dipakai controller
  req.user = user; 
  next(); // Lanjut ke fungsi controller
};

// Middleware untuk mengecek Role (misal: 'admin')
exports.requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        // Ambil data role user dari tabel 'public.users'
        // Kita menggunakan req.user.id yang didapat dari requireAuth
        const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', req.user.id)
            .single();

        // --- PERBAIKAN LOGIKA ERROR ADA DI SINI ---

        // 1. Cek error database DULU
        if (error || !data) {
            return res.status(403).json({ error: 'Gagal memverifikasi role user' });
        }

        // 2. BARU cek role-nya
        if (!allowedRoles.includes(data.role)) {
            return res.status(403).json({ error: 'Akses ditolak. Anda bukan Admin.' });
        }
        
        // --- AKHIR PERBAIKAN ---
        
        // Jika role sesuai, lanjut
        next();
    }
}