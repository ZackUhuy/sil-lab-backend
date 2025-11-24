const supabase = require('../config/supabase');

exports.register = async (req, res) => {
    const { email, password, nama, role } = req.body;

    // 1. Validasi Input Dasar
    if (!email || !password || !nama) {
        return res.status(400).json({ error: 'Nama, Email, dan Password wajib diisi.' });
    }

    // 2. Validasi Domain Kampus
    /*
    const emailLower = email.toLowerCase();
    const isMhs = emailLower.endsWith('@mhs.uinsaid.ac.id');
    const isStaff = emailLower.endsWith('@staff.uinsaid.ac.id');

    if (!isMhs && !isStaff) {
        return res.status(400).json({ 
            error: 'Pendaftaran ditolak. Gunakan email @mhs.uinsaid.ac.id atau @staff.uinsaid.ac.id' 
        });
    }
    */
    try {
        // 3. --- CEK EMAIL DI DATABASE (LOGIKA BARU) ---
        // Cek apakah email ini sudah ada di tabel users kita
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle(); // Gunakan maybeSingle agar tidak error jika data kosong

        // Jika user ditemukan, langsung tolak
        if (existingUser) {
            return res.status(400).json({ error: 'Email ini sudah terdaftar. Silakan Login.' });
        }
        // ----------------------------------------------

        // 4. Daftar ke Supabase Auth
        // (Hanya dijalankan jika email belum terdaftar di atas)
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password
        });

        if (authError) return res.status(400).json({ error: authError.message });

        // 5. Simpan data profil ke tabel 'public.users'
        if (authData.user) {
            const { error: profileError } = await supabase
                .from('users')
                .insert([{ 
                    id: authData.user.id, 
                    email, 
                    nama, 
                    role: role || 'mahasiswa' 
                }]);

            if (profileError) {
                return res.status(400).json({ error: 'Gagal menyimpan profil: ' + profileError.message });
            }
        }

        res.status(201).json({ message: 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi sebelum login.', user: authData.user });

    } catch (err) {
        res.status(500).json({ error: 'Terjadi kesalahan server: ' + err.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ error: 'Email dan Password wajib diisi.' });

    // 1. Cek Email & Password ke Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) return res.status(401).json({ error: 'Email atau password salah, atau email belum diverifikasi.' });

    // 2. Ambil data lengkap user dari tabel 'public.users'
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

    if (userError || !userData) {
        return res.status(400).json({ error: 'Data user tidak ditemukan di database sistem.' });
    }

    // 3. Kirim Token + Data User
    res.json({ 
        message: 'Login berhasil', 
        token: data.session.access_token,
        user: userData 
    });
};