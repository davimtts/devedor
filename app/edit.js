const TOKEN_CRIPTOGRAFADO = 'U2FsdGVkX195wvST+5q9FgwiR+GQf9gFXfmB8iCAXZAER26ndI2C3xQ7Jdx2+EEDeBHBtZMpJcZJ8s1G2PGqig==';
let GITHUB_TOKEN = '';
const REPO = 'davimtts/devedor';
const BRANCH = 'main';

let pinGlobal = '';
let hashGlobal = '';


function entrar() {

    const senha = document
        .getElementById('passInput')
        .value
        .trim();

    const status = document.getElementById('statusSenha');

    try {

        const token =
            CryptoJS.AES.decrypt(
                TOKEN_CRIPTOGRAFADO,
                senha
            ).toString(CryptoJS.enc.Utf8);

        if (
            !token.startsWith('ghp_') &&
            !token.startsWith('github_pat_')
        ) {

            throw new Error('Senha inválida');
        }

        GITHUB_TOKEN = token;

        document
            .getElementById('senha')
            .classList
            .add('hidden');

        document
            .getElementById('pin')
            .classList
            .remove('hidden');

        document
            .getElementById('create')
            .classList
            .remove('hidden');

        status.innerHTML =
            '<div class="success">Acesso liberado</div>';

    } catch (err) {

        console.error(err);

        status.innerHTML =
            '<div class="error">Senha inválida</div>';
    }
}

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
            '<div class="success">Dados carregado com sucesso</div>';

    } catch (err) {

        console.error(err);

        status.innerHTML =
            '<div class="error">Erro ao carregar PIN</div>';
    }
}

async function gerarNovoJSON() {

    const status = document.getElementById('status');

    try {

        status.innerHTML =
            '<div>Atualizando Dados...</div>';

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

        const path = `pins/${hashGlobal}.json`;

        // PEGA SHA DO ARQUIVO ATUAL

        const getReq = await fetch(
            `https://api.github.com/repos/${REPO}/contents/${path}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${GITHUB_TOKEN}`
                }
            }
        );

        if (!getReq.ok) {
            throw new Error('Erro ao localizar arquivo');
        }

        const arquivoAtual = await getReq.json();

        // ENVIA NOVA VERSÃO

        const updateReq = await fetch(
            `https://api.github.com/repos/${REPO}/contents/${path}`,
            {
                method: 'PUT',

                headers: {
                    Authorization:
                        `Bearer ${GITHUB_TOKEN}`,

                    'Content-Type':
                        'application/json'
                },

                body: JSON.stringify({

                    message:
                        `Atualiza ${hashGlobal}.json`,

                    content:
                        btoa(
                            unescape(
                                encodeURIComponent(texto)
                            )
                        ),

                    sha:
                        arquivoAtual.sha,

                    branch:
                        BRANCH
                })
            }
        );

        if (!updateReq.ok) {

            const erro = await updateReq.json();

            console.error(erro);

            throw new Error(
                erro.message || 'Erro ao atualizar'
            );
        }

        status.innerHTML =
            '<div class="success">Dados atualizados com sucesso.</div>';

    } catch (err) {

        console.error(err);

        status.innerHTML =
            `<div class="error">${err.message}</div>`;
    }
}


async function criarNovoJSON() {
    const status = document.getElementById('create-status');
    const preview =
        document.getElementById('create-preview');

    try {

        status.innerHTML =
            'Criando JSON...';

        let pin = document
            .getElementById('create-pin')
            .value
            .trim();

        // GERA PIN AUTOMÁTICO

        if (!pin) {

            pin =
                Math.random()
                    .toString(36)
                    .slice(2, 10);
        }

        const hash =
            await sha256Multi(pin, 1000);

        const dataPrincipal = {

            nome:
                document
                    .getElementById('create-nome')
                    .value,

            total:
                parseFloat(
                    document
                        .getElementById('create-total')
                        .value
                ),

            taxa:
                parseFloat(
                    document
                        .getElementById('create-taxa')
                        .value
                ),

            versao:
                '1.0',

            criadoEm:
                new Date()
                    .toISOString()
        };

        const dataParcelas = {

            parcelas:
                document
                    .getElementById('create-parcelas')
                    .value,

            pagas: []
        };

        const enc1 = criptografar(
            JSON.stringify(dataPrincipal),
            pin
        );

        const enc2 = criptografar(
            JSON.stringify(dataParcelas),
            pin
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

        const path =
            `pins/${hash}.json`;

        // VERIFICA SE JÁ EXISTE

        const checkReq = await fetch(
            `https://api.github.com/repos/${REPO}/contents/${path}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${GITHUB_TOKEN}`
                }
            }
        );

        if (checkReq.ok) {

            throw new Error(
                'PIN já existe'
            );
        }

        // CRIA ARQUIVO

        const createReq = await fetch(
            `https://api.github.com/repos/${REPO}/contents/${path}`,
            {
                method: 'PUT',

                headers: {

                    Authorization:
                        `Bearer ${GITHUB_TOKEN}`,

                    'Content-Type':
                        'application/json'
                },

                body: JSON.stringify({

                    message:
                        `Cria ${hash}.json`,

                    content:
                        btoa(
                            unescape(
                                encodeURIComponent(texto)
                            )
                        ),

                    branch:
                        BRANCH
                })
            }
        );

        if (!createReq.ok) {

            const erro =
                await createReq.json();

            console.error(erro);

            throw new Error(
                erro.message ||
                'Erro ao criar'
            );
        }

        status.innerHTML = `<div class="success">Devedor criado com sucesso</div`

        preview.innerHTML = `https://davimtts.github.io/devedor/?PIN=${pin}`;

    } catch (err) {

        console.error(err);

        status.innerHTML = `
            <div class="error">
                ${err.message}
            </div>
        `;
    }
}
