const painelCreate = document.getElementById('create-panel')


const nomeInput = document.getElementById('nome');
const totalInput = document.getElementById('total');
const taxaInput = document.getElementById('taxa');
const parcelasSelect = document.getElementById('parcelas');
const pinCustom = document.getElementById('pinCustom');

const criarButton = document.getElementById('criarBtn');
const resultContainer = document.querySelector('.resultContainer');
const pinSpan = document.getElementById('pinResult');
const devidendoDataSpan = document.getElementById('devidendoData');
const toast = document.getElementById('toastMsg');
let hash = '';
let pin = '';

function showToast(message, isError = false) {
    toast.textContent = message || (isError ? '❌ Erro' : '✔️ Copiado!');
    toast.style.backgroundColor = isError ? '#a1224acc' : '#1e1e2fcc';
    toast.style.borderColor = isError ? '#f43f5e' : '#8b5cf6';
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) scale(1)';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) scale(0.9)';
    }, 2000);
}

function criptografar(valor, pin) {
    return CryptoJS.AES.encrypt(String(valor), pin).toString();
}

function gerarPin() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let pin = '';
    for (let i = 0; i < 6; i++) {
        pin += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return pin;
}

function setButtonLoading(loading) {
    if (loading) {
        const originalHTML = criarButton.innerHTML;
        criarButton.setAttribute('data-original', originalHTML);
        criarButton.innerHTML = '<span class="loading-spinner"></span><span> Processando...</span>';
        criarButton.disabled = true;
        criarButton.style.opacity = '0.8';
    } else {
        const original = criarButton.getAttribute('data-original');
        if (original) criarButton.innerHTML = original;
        else criarButton.innerHTML = '<span>✨ Criar Devidendo</span>';
        criarButton.disabled = false;
        criarButton.style.opacity = '1';
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

async function criarDevidendo() {
    const nome = nomeInput.value.trim();
    const totalRaw = totalInput.value.trim();
    const taxaRaw = taxaInput.value.trim();

    if (!nome) {
        showToast('❌ Informe o nome do devedor', true);
        nomeInput.focus();
        return;
    }
    if (totalRaw === '') {
        showToast('❌ Digite o valor total da dívida', true);
        totalInput.focus();
        return;
    }
    if (taxaRaw === '') {
        showToast('❌ Informe a taxa de juros mensal', true);
        taxaInput.focus();
        return;
    }

    const total = parseFloat(totalRaw);
    const taxa = parseFloat(taxaRaw);

    if (isNaN(total) || total <= 0) {
        showToast('⚠️ Valor total deve ser maior que zero', true);
        return;
    }
    if (isNaN(taxa) || taxa < 0) {
        showToast('⚠️ Taxa de juros inválida (use números positivos)', true);
        return;
    }

    setButtonLoading(true);

    try {
        if (pinCustom.value.trim()) {
            pin = pinCustom.value.trim();
        } else {
            pin = gerarPin();
        }




        hash = await sha256Multi(pin, 1000);
        const devidendo = {
            nome: nome,
            total: total,
            taxa: taxa,
            criadoEm: new Date().toISOString(),
            versao: "2.0"
        };
        const devidendoString = JSON.stringify(devidendo);
        const devidendoCriptografado = criptografar(devidendoString, pin);

        const load = {
            parcelas: parcelasSelect.value,
            pagas: 0
        }

        const loadString = JSON.stringify(load);
        const loadCriptografado = criptografar(loadString, pin);

        pinSpan.textContent = pin;
        devidendoDataSpan.textContent = JSON.stringify({
            data: [
                devidendoCriptografado,
                loadCriptografado
            ]
        });
        if (resultContainer.style.display === 'none') {
            painelCreate.style.display = 'none';
            resultContainer.style.display = 'block';
            resultContainer.style.animation = 'none';
            resultContainer.offsetHeight;
            resultContainer.style.animation = 'fadeUp 0.5s ease-out';
        } else {
            resultContainer.style.animation = 'none';
            setTimeout(() => {
                resultContainer.style.animation = 'fadeUp 0.5s ease-out';
            }, 10);
        }

        showToast('✅ Devidendo criado com sucesso!');
    } catch (err) {
        console.error(err);
        showToast('❌ Erro na criptografia, tente novamente', true);
    } finally {
        setButtonLoading(false);
    }
}

function copyToClipboard(text, type) {
    if (!text) {
        showToast('❌ Nada para copiar', true);
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast(`📋 ${type} copiado!`);
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`📋 ${type} copiado (fallback)`);
    });
}

function copyPin() {
    const pin = pinSpan.textContent;
    if (pin && pin !== '----') {
        copyToClipboard(pin, 'PIN');
    } else {
        showToast('❌ Nenhum PIN disponível', true);
    }
}

function copyPayload() {
    const payload = devidendoDataSpan.textContent;
    if (payload && payload.trim().length > 0) {
        copyToClipboard(payload, 'Payload');
    } else {
        showToast('❌ Nenhum payload criptografado', true);
    }
}

function downloadJSON() {
    const payload = devidendoDataSpan.textContent;
    if (payload && payload.trim().length > 0) {
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${hash}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        showToast('❌ Nenhum payload para baixar', true);
    }
}

criarButton.addEventListener('click', criarDevidendo);

const inputs = [nomeInput, totalInput, taxaInput];
inputs.forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            criarDevidendo();
        }
    });
});

window.addEventListener('DOMContentLoaded', () => {
    const copyPinBtn = document.getElementById('copyPinBtn');
    const copyPayloadBtn = document.getElementById('copyPayloadBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    if (copyPinBtn) copyPinBtn.addEventListener('click', copyPin);
    if (copyPayloadBtn) copyPayloadBtn.addEventListener('click', copyPayload);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadJSON);

    const allInputs = document.querySelectorAll('input');
    allInputs.forEach(inp => {
        inp.addEventListener('focus', () => {
            inp.parentElement.style.transform = 'translateX(4px)';
        });
        inp.addEventListener('blur', () => {
            inp.parentElement.style.transform = 'translateX(0)';
        });
    });
});

document.addEventListener('click', (e) => {
    if (e.target.id === 'copyPinBtn' || e.target.closest('#copyPinBtn')) {
        copyPin();
    }
    if (e.target.id === 'copyPayloadBtn' || e.target.closest('#copyPayloadBtn')) {
        copyPayload();
    }
});

const titleElement = document.querySelector('.top h1');
if (titleElement) {
    setInterval(() => {
        const hue = (Date.now() / 50) % 360;
    }, 100);
}

totalInput.addEventListener('input', function (e) {
    if (this.value < 0) this.value = 0;
});
taxaInput.addEventListener('input', function (e) {
    if (this.value < 0) this.value = 0;
});

console.log('✨ Sistema de Criação de Devidendos — criptografia avançada ativa');