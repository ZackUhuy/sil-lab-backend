const supabase = require('../config/supabase');

exports.register = async (req, res) => {
    const { email, password, nama, role } = req.body;

    // --- VALIDASI DOMAIN (BARU) ---
    // Pastikan email diakhiri dengan @uinsaid.ac.id
    // Kita ubah ke lowercase dulu agar tidak sensitif huruf besar/kecil
    if (!email || !email.toLowerCase().endsWith('@uinsaid.ac.id')) {
        return res.status(400).json({ 
            error: 'Maaf, pendaftaran hanya khusus email institusi (@uinsaid.ac.id)' 
        });
    }
    // ------------------------------

    // 1. Daftar ke Supabase Auth (Sistem Login Bawaan)
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
    });

    if (authError) return res.status(400).json({ error: authError.message });

    // 2. Simpan data profil ke tabel 'public.users' (Tabel Buatan Kita)
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
            return res.status(400).json({ error: profileError.message });
        }
    }

    res.status(201).json({ message: 'Registrasi berhasil, silakan cek email untuk verifikasi', user: authData.user });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    // 1. Cek Email & Password ke Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) return res.status(401).json({ error: 'Email atau password salah' });

    // 2. Ambil data lengkap user dari tabel 'public.users' berdasarkan ID
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

    if (userError || !userData) {
        return res.status(400).json({ error: 'Data user tidak ditemukan di database sistem' });
    }

    // 3. Kirim Token + Data User (termasuk Role) ke Frontend
    res.json({ 
        message: 'Login berhasil', 
        token: data.session.access_token,
        user: userData 
    });
};