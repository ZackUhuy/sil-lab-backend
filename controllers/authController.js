const supabase = require('../config/supabase');

exports.register = async (req, res) => {
    const { email, password, nama, role } = req.body;
    if (!email || !password || !nama) return res.status(400).json({ error: 'Nama, Email, dan Password wajib diisi.' });

    const emailLower = email.toLowerCase();
    const isMhs = emailLower.endsWith('@mhs.uinsaid.ac.id');
    const isStaff = emailLower.endsWith('@staff.uinsaid.ac.id');

    // Validasi Domain (Bisa dikomentari saat testing Gmail)
    if (!isMhs && !isStaff) {
        // return res.status(400).json({ error: 'Pendaftaran ditolak. Gunakan email @mhs.uinsaid.ac.id atau @staff.uinsaid.ac.id' });
    }

    try {
        const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
        if (existingUser) return res.status(400).json({ error: 'Email ini sudah terdaftar. Silakan Login.' });

        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) return res.status(400).json({ error: authError.message });

        if (authData.user) {
            const { error: profileError } = await supabase.from('users').insert([{ id: authData.user.id, email, nama, role: role || 'mahasiswa' }]);
            if (profileError) return res.status(400).json({ error: 'Gagal menyimpan profil: ' + profileError.message });
        }
        res.status(201).json({ message: 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi.', user: authData.user });
    } catch (err) { res.status(500).json({ error: 'Server error: ' + err.message }); }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan Password wajib diisi.' });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: 'Email atau password salah.' });

    const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', data.user.id).single();
    if (userError || !userData) return res.status(400).json({ error: 'Data user tidak ditemukan.' });

    res.json({ message: 'Login berhasil', token: data.session.access_token, user: userData });
};

// --- BARU: REQUEST RESET PASSWORD (LUPA PASSWORD) ---
exports.forgotPassword = async (req, res) => {
    const { email, redirectUrl } = req.body;
    if (!email) return res.status(400).json({ error: 'Email wajib diisi' });

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl // URL Frontend halaman update password
        });

        if (error) throw error;
        res.json({ message: 'Link reset password telah dikirim ke email Anda.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- BARU: UPDATE PASSWORD BARU ---
exports.updateUserPassword = async (req, res) => {
    const { new_password } = req.body;
    if (!new_password) return res.status(400).json({ error: 'Password baru wajib diisi' });

    try {
        // User harus sudah terautentikasi (punya token dari link email)
        const { data, error } = await supabase.auth.updateUser({ password: new_password });

        if (error) throw error;
        res.json({ message: 'Password berhasil diperbarui. Silakan login kembali.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};