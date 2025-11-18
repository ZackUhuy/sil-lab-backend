const supabase = require('../config/supabase');

exports.register = async (req, res) => {
    const { email, password, nama, role } = req.body;

    // 1. Daftar ke Supabase Auth (Sistem Login Bawaan)
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
    });

    if (authError) return res.status(400).json({ error: authError.message });

    // 2. Simpan data profil ke tabel 'public.users' (Tabel Buatan Kita)
    // Kita perlu menyimpan data ini agar bisa mencatat 'role' (admin/mahasiswa)
    if (authData.user) {
        const { error: profileError } = await supabase
            .from('users')
            .insert([{ 
                id: authData.user.id, 
                email, 
                nama, 
                role: role || 'mahasiswa' // Default jadi mahasiswa jika tidak diisi
            }]);

        if (profileError) {
            // Jika gagal simpan ke tabel users, kembalikan error
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

    // -------------------------------------------------------
    // BAGIAN PENTING: MENGAMBIL ROLE USER
    // -------------------------------------------------------
    
    // 2. Ambil data lengkap user dari tabel 'public.users' berdasarkan ID
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

    // Jika user ada di Auth tapi tidak ada di tabel 'users', kita anggap error
    if (userError || !userData) {
        return res.status(400).json({ error: 'Data user tidak ditemukan di database sistem' });
    }

    // 3. Kirim Token + Data User (termasuk Role) ke Frontend
    res.json({ 
        message: 'Login berhasil', 
        token: data.session.access_token,
        user: userData // userData ini berisi { id, nama, email, role }
    });
};