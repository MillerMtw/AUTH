const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fnngvqinfvrbudsecoru.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubmd2cWluZnZyYnVkc2Vjb3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2OTI5MTYsImV4cCI6MjA4NjI2ODkxNn0.PlMtd7_UJCIJEg35ioVdiOYghBN_clVrhjdMaYT5JJ4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, nickname, password, license, client } = req.body;
    const timestamp = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

    if (action === "register") {
        const { data: existingClient } = await supabase.from('whitelist').select('username').eq('client', client).maybeSingle();
        if (existingClient) {
            return res.status(400).json({ status: "error", message: "You already Have Account" });
        }
        const { error } = await supabase.from('whitelist').insert([{
            username: nickname,
            password: password,
            license: license || "",
            client: client,
            log: `Registered at ${timestamp}`
        }]);
        if (error) {
            return res.status(400).json({ status: "error", message: "Username Already Exist" });
        }
        return res.status(200).json({ status: "success" });
    }

    if (action === "login") {
        const { data: user, error } = await supabase.from('whitelist').select('*')
            .eq('username', nickname)
            .eq('password', password)
            .eq('client', client)
            .maybeSingle();
        if (error || !user) {
            return res.status(401).json({ status: "error", message: "Invalid credentials" });
        }
        await supabase.from('whitelist').update({ log: `Last login: ${timestamp}` }).eq('id', user.id);
        return res.status(200).json({ status: "success", license: user.license });
    }

    res.status(404).json({ message: "Not Found" });
};
