const supabase = require('../config/supabase');

// Cek apakah user sudah login (punya token valid)
exports.requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: 'Akses ditolak, token tidak ada' });

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return res.status(401).json({ error: 'Token tidak valid' });

  req.user = user; // Simpan data user di request
  next();
};

// Cek Role (Misal: hanya Admin)
exports.requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        // Ambil data role dari tabel 'public.users' berdasarkan ID auth
        const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', req.user.id) // Asumsi ID di auth sama dengan ID di public.users
            .single();

        if (error || !allowedRoles.includes(data.role)) {
            return res.status(403).json({ error: 'Anda tidak memiliki izin untuk akses ini' });
        }
        next();
    }
}