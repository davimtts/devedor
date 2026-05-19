
let pinGlobal = '';
let hashGlobal = '';

async function sha256(texto) {

    const encoder = new TextEncoder();

    const data = encoder.encode(texto);

    const hash = await crypto.subtle.digest(
        'SHA-256',
        data
    );

    return [...new Uint8Array(hash)]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function sha256Multi(texto, vezes = 1000) {

    let hash = texto;

    for (let i = 0; i < vezes; i++) {
        hash = await sha256(hash);
    }

    return hash;
}

function criptografar(valor, pin) {

    return CryptoJS.AES.encrypt(
        String(valor),
        pin
    ).toString();
}

function descriptografar(valor, pin) {

    return CryptoJS.AES.decrypt(
        valor,
        pin
    ).toString(CryptoJS.enc.Utf8);
}

async function carregar() {

    const pin = document
        .getElementById('pinInput')
        .value
        .trim();

    const status = document.getElementById('status');

    status.innerHTML = 'Carregando...';

    try {

        pinGlobal = pin;

        const hash = await sha256Multi(pin, 1000);

        hashGlobal = hash;

        const req = await fetch(`../pins/${hash}.json`);

        if (!req.ok) {
            throw new Error('PIN inválido');
        }

        const json = await req.json();

        const principal = JSON.parse(
            descriptografar(
                json.data[0],
                pin
            )
        );

        const parcelas = JSON.parse(
            descriptografar(
                json.data[1],
                pin
            )
        );

        document.getElementById('nome').value =
            principal.nome;

        document.getElementById('total').value =
            principal.total;

        document.getElementById('taxa').value =
            principal.taxa;

        document.getElementById('versao').value =
            principal.versao;

        document.getElementById('criadoEm').value =
            principal.criadoEm;

        document.getElementById('parcelas').value =
            parcelas.parcelas;

        const pagas = Array.isArray(parcelas.pagas)
            ? parcelas.pagas
            : [];

        document.getElementById('pagas').value =
            pagas.join(',');

        document
            .getElementById('editor')
            .classList
            .remove('hidden');

        status.innerHTML =
            '<div class="success">JSON carregado com sucesso</div>';

    } catch (err) {

        console.error(err);

        status.innerHTML =
            '<div class="error">Erro ao carregar PIN</div>';
    }
}

function gerarNovoJSON() {

    try {

        const dataPrincipal = {

            nome:
                document.getElementById('nome').value,

            total:
                parseFloat(
                    document.getElementById('total').value
                ),

            taxa:
                parseFloat(
                    document.getElementById('taxa').value
                ),

            versao:
                document.getElementById('versao').value,

            criadoEm:
                document.getElementById('criadoEm').value
        };

        const dataParcelas = {

            parcelas:
                document.getElementById('parcelas').value,

            pagas:
                document
                    .getElementById('pagas')
                    .value
                    .split(',')
                    .map(v => parseFloat(v.trim()))
                    .filter(v => !isNaN(v))
        };

        const enc1 = criptografar(
            JSON.stringify(dataPrincipal),
            pinGlobal
        );

        const enc2 = criptografar(
            JSON.stringify(dataParcelas),
            pinGlobal
        );

        const finalJSON = {

            data: [
                enc1,
                enc2
            ]
        };

        const texto = JSON.stringify(
            finalJSON,
            null,
            4
        );

        document.getElementById('preview')
            .textContent = texto;

        const blob = new Blob(
            [texto],
            { type: 'application/json' }
        );

        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');

        a.href = url;

        a.download = `${hashGlobal}.json`;

        document.body.appendChild(a);

        a.click();

        document.body.removeChild(a);

        URL.revokeObjectURL(url);

    } catch (err) {

        console.error(err);

        alert('Erro ao gerar JSON');
    }
}
