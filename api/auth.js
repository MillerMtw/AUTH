const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lidnepyjxzmcfgvurbbr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZG5lcHlqeHptY2ZndnVyYmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NTQwMTgsImV4cCI6MjA5OTIzMDAxOH0.pxB33GjvYBUMK8oaknCKvANowKU90-visF1XkXHzWPI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, nickname, password, license, client } = req.body;
    const timestamp = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

    try {
        if (action === "register") {
            const { data: existingClient } = await supabase.from('whitelist').select('username').eq('client', client).maybeSingle();
            if (existingClient) {
                return res.status(400).json({ status: "error", message: "Already used on this PC" });
            }

            const { data: existingUser } = await supabase.from('whitelist').select('client').eq('username', nickname).maybeSingle();
            if (existingUser) {
                if (existingUser.client === client) {
                    const { error: updErr } = await supabase.from('whitelist').update({
                        license: license, password: password,
                        log: `Renewed at ${timestamp}`
                    }).eq('username', nickname);
                    if (updErr) return res.status(400).json({ status: "error", message: "Renew failed" });
                    return res.status(200).json({ status: "success" });
                }
                return res.status(400).json({ status: "error", message: "Username taken" });
            }

            const { error } = await supabase.from('whitelist').insert([{
                username: nickname, password: password, license: license || "",
                client: client, log: `Registered at ${timestamp}`
            }]);
            if (error) return res.status(400).json({ status: "error", message: "Username taken" });
            return res.status(200).json({ status: "success" });
        }

        if (action === "login") {
            const { data: user, error } = await supabase.from('whitelist').select('*')
                .eq('username', nickname).eq('password', password).eq('client', client).maybeSingle();
            if (error || !user) {
                const { data: credsOk } = await supabase.from('whitelist').select('client,license')
                    .eq('username', nickname).eq('password', password).maybeSingle();
                if (credsOk) {
                    const jr = await fetch('https://api.jnkie.com/api/v1/whitelist/verifyOpen', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key: credsOk.license, service: "Apxion", identifier: "1150240" })
                    });
                    const jd = await jr.json();
                    if (!jd.valid || (jd.message !== 'KEY_VALID' && jd.message !== 'KEYLESS')) {
                        return res.status(401).json({ status: "error", message: "License expired" });
                    }
                    return res.status(401).json({ status: "error", message: "Reset HWID", savedLicense: credsOk.license });
                }
                return res.status(401).json({ status: "error", message: "Wrong credentials" });
            }
            await supabase.from('whitelist').update({ log: `Last login: ${timestamp}` }).eq('id', user.id);
            return res.status(200).json({ status: "success", license: user.license });
        }

        res.status(404).json({ message: "Not Found" });
    } catch (e) {
        res.status(500).json({ status: "error", message: "Server error" });
    }
};
