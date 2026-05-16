const params = new URLSearchParams(location.search);
const pin = params.get('PIN');

const app = document.getElementById('app');
const pinScreen = document.getElementById('pinScreen');

const loading = document.getElementById('loading');

let parcelasPagas = new Set();


function entrarPin() {

    const pin = document
        .getElementById('pinInput')
        .value
        .trim();

    location.href =
        `${window.location.origin}${window.location.pathname}?PIN=${pin}`;
}

const totalEl = document.getElementById('total');
const taxaEl = document.getElementById('taxa');
const parcelasEl = document.getElementById('parcelas');
const table = document.getElementById('table');
const jurosTotal = document.getElementById('jurosTotal');
const parcelasTotal = document.getElementById('parcelasTotal');
const modoTotalEl = document.getElementById('modoTotal');


const nameUser = document.getElementById('nameUser');

let parcelas = 5;
let pagamentos = [];
let editadas = new Set();

let timer = null;
let tempoEspera = 3000;

function br(v) {
    return Number(v).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
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



async function carregarPin() {

    if (!pin) {
        loading.style.display = 'none ';
        return false;
    }

    try {
        const hash = await sha256(pin);

        const req = await fetch(`./pins/${hash}.json`);

        if (!req.ok) {
            alert('PIN inválido');
            location.href = window.location.origin + window.location.pathname;
            throw new Error('PIN inválido');
        }
        loading.style.display = 'none';
        pinScreen.style.display = 'none';
        app.style.display = 'block';

        const dados = await req.json();

        const texto = descriptografar(
            dados.data,
            pin
        );

        const data = JSON.parse(texto);

        const nome = data.nome;

        const nomeFormatado = nome
            .split(' ')
            .map(p => p.charAt(0).toUpperCase() + p.slice(1))
            .join(' ');
        nameUser.textContent = nomeFormatado;
        totalEl.value = data.total;

        taxaEl.value = data.taxa;

        parcelas = dados.parcelas;

        pagamentos = [];
        editadas.clear();

        parcelasPagas = new Set();

        fillSelect();

        initPag();

        (dados.pagas || []).forEach((valorParcela, idx) => {

            let saldo = +totalEl.value;

            for (let i = 0; i < idx; i++) {
                saldo -= pagamentos[i];
            }

            let j = juros(saldo);

            let amortizacao =
                +(valorParcela - j).toFixed(2);

            pagamentos[idx] = amortizacao;

            parcelasPagas.add(idx);

            editadas.add(idx);

        });

        recalcularNaoEditadas();

        render();


        return true;

    } catch {

        app.style.display = 'none';

        pinScreen.style.display = 'flex';

        return false;
    }
}





function fillSelect(max = 36) {
    parcelasEl.innerHTML = '';
    for (let i = 1; i <= max; i++) {
        const o = document.createElement('option');
        o.value = i;
        o.textContent = i;
        if (i === parcelas) o.selected = true;
        parcelasEl.appendChild(o);
    }
}

function soma() {
    return pagamentos.reduce((a, b) => a + b, 0);
}

function juros(v) {
    return +(v * (+taxaEl.value / 100)).toFixed(2);
}

function criarParcelaSeFaltar() {

    let falta = +(+totalEl.value - soma()).toFixed(2);

    if (falta > 0.009) {
        pagamentos.push(falta);
        parcelas = pagamentos.length;
        fillSelect();
    }
}

function recalcularNaoEditadas() {

    const total = +totalEl.value;

    let usado = 0;

    let livres = [];

    for (let i = 0; i < pagamentos.length; i++) {

        if (editadas.has(i)) {

            usado += pagamentos[i];

        } else {

            livres.push(i);

        }

    }

    if (!livres.length) {

        criarParcelaSeFaltar();

        return;

    }

    /* OFF = divide principal normal */

    if (!modoTotalEl || modoTotalEl.value === 'off') {

        let sobra = +(total - usado).toFixed(2);

        if (sobra < 0) sobra = 0;

        let cent = Math.round(sobra * 100);

        let base = Math.floor(cent / livres.length);

        let resto = cent % livres.length;

        livres.forEach((idx, pos) => {

            pagamentos[idx] = (base + (pos < resto ? 1 : 0)) / 100;

        });

        criarParcelaSeFaltar();

        return;

    }

    /* ON = parcelas totais iguais */

    let saldoInicial = +(total - usado).toFixed(2);

    if (saldoInicial < 0) saldoInicial = 0;

    let n = livres.length;

    /* busca valor ideal da parcela total */

    let baixo = 0;

    let alto = saldoInicial * 2;

    for (let t = 0; t < 60; t++) {

        let meio = (baixo + alto) / 2;

        let saldo = saldoInicial;

        for (let i = 0; i < n; i++) {

            let j = juros(saldo);

            let principal = meio - j;

            if (principal < 0) principal = 0;

            if (principal > saldo) principal = saldo;

            saldo -= principal;

        }

        if (saldo > 0) {

            baixo = meio;

        } else {

            alto = meio;

        }

    }

    let parcelaIdeal = alto;

    /* aplica resultado */

    let saldo = saldoInicial;

    livres.forEach(idx => {

        let j = juros(saldo);

        let principal = +(parcelaIdeal - j).toFixed(2);

        if (principal < 0) principal = 0;

        if (principal > saldo) principal = saldo;

        pagamentos[idx] = principal;

        saldo = +(saldo - principal).toFixed(2);

    });

    /* corrige centavos residuais espalhando, não jogando tudo no último */

    if (Math.abs(saldo) > 0) {

        for (let i = livres.length - 1; i >= 0 && Math.abs(saldo) > 0; i--) {

            let idx = livres[i];

            let add = Math.min(Math.abs(saldo), 0.01);

            if (saldo > 0) {

                pagamentos[idx] = +(pagamentos[idx] + add).toFixed(2);

                saldo = +(saldo - add).toFixed(2);

            }

        }

    }

    criarParcelaSeFaltar();

}

function initPag() {

    pagamentos = [];
    editadas.clear();

    let total = +totalEl.value;
    let base = +(total / parcelas).toFixed(2);

    for (let i = 0; i < parcelas; i++) {
        pagamentos.push(base);
    }

    let dif = +(total - soma()).toFixed(2);
    pagamentos[pagamentos.length - 1] += dif;

    recalcularNaoEditadas();
    render();
}

function mudarParcelas(novoTotal) {

    const atual = pagamentos.length;

    if (novoTotal > atual) {

        while (pagamentos.length < novoTotal) {
            pagamentos.push(0);
        }

    } else if (novoTotal < atual) {

        pagamentos = pagamentos.slice(0, novoTotal);

        let novoSet = new Set();

        [...editadas].forEach(i => {
            if (i < novoTotal) novoSet.add(i);
        });

        editadas = novoSet;
    }

    parcelas = novoTotal;
    fillSelect();

    recalcularNaoEditadas();
    render();
}

function iniciarBarra(input) {

    input.style.backgroundImage =
        'linear-gradient(to right,#b26cff 100%,transparent 100%)';

    input.style.backgroundSize = '100% 2px';
    input.style.backgroundRepeat = 'no-repeat';
    input.style.backgroundPosition = 'bottom left';
    input.style.transition = 'none';

    requestAnimationFrame(() => {
        input.style.transition =
            `background-size ${tempoEspera}ms linear`;

        input.style.backgroundSize = '0% 2px';
    });
}

function limparBarra() {

    document.querySelectorAll('[data-pago],[data-total]').forEach(inp => {
        inp.style.backgroundImage = '';
        inp.style.backgroundSize = '';
        inp.style.transition = '';
    });
}

function agendarAtualizacao(callback, input) {

    clearTimeout(timer);
    limparBarra();
    iniciarBarra(input);

    timer = setTimeout(() => {
        limparBarra();
        callback();
        render();
    }, tempoEspera);
}

function onPago(idx, val, input) {

    pagamentos[idx] = Math.max(0, parseFloat(val) || 0);
    editadas.add(idx);

    agendarAtualizacao(() => {
        recalcularNaoEditadas();
    }, input);
}

function onTotal(idx, val, input) {

    let falta = +totalEl.value;

    for (let i = 0; i < idx; i++) {
        falta -= pagamentos[i];
    }

    let j = juros(falta);

    pagamentos[idx] = Math.max(
        0,
        +(((parseFloat(val) || 0) - j).toFixed(2))
    );

    editadas.add(idx);

    agendarAtualizacao(() => {
        recalcularNaoEditadas();
    }, input);
}

function render() {

    table.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'grid head row';

    head.innerHTML = `
    <div>#</div>
    <div>Amortização</div>
    <div>Saldo</div>
    <div>Juros</div>
    <div>Parcela</div>
    `;

    table.appendChild(head);

    let falta = +totalEl.value;
    let somaJ = 0;

    pagamentos.forEach((p, i) => {

        let j = juros(falta);
        let totalLinha = +(p + j).toFixed(2);

        somaJ += j;

        const bloqueada = parcelasPagas.has(i);

        const row = document.createElement('div');
        row.className = 'grid row';
        if (bloqueada) row.classList.add('bloqueada');

        row.innerHTML = `
        <div>${i + 1}º</div>

        <div class="input">
            <input 
                data-pago="${i}" 
                value="${p.toFixed(2)}"
                ${bloqueada ? 'disabled' : ''}
            >
        </div>

        <div class="remain">${br(falta)}</div>

        <div class="juros">${br(j)}</div>

        <div class="input">
            <input 
                data-total="${i}" 
                value="${totalLinha.toFixed(2)}"
                ${bloqueada ? 'disabled' : ''}
            >
        </div>
        `;

        table.appendChild(row);

        falta = +(falta - p).toFixed(2);
    });

    jurosTotal.textContent = br(somaJ);

    parcelasTotal.textContent =
        br(soma() + somaJ);

    document.querySelectorAll('[data-pago]').forEach(el => {

        if (el.disabled) return;

        el.oninput = e => {

            onPago(
                +e.target.dataset.pago,
                e.target.value,
                e.target
            );
        };
    });

    document.querySelectorAll('[data-total]').forEach(el => {

        if (el.disabled) return;

        el.oninput = e => {

            onTotal(
                +e.target.dataset.total,
                e.target.value,
                e.target
            );
        };
    });
}

parcelasEl.onchange = e => {
    mudarParcelas(+e.target.value);
};

totalEl.oninput = initPag;

taxaEl.oninput = () => {
    recalcularNaoEditadas();
    render();
};

if (modoTotalEl) {
    modoTotalEl.onchange = () => {
        recalcularNaoEditadas();
        render();
    };
}

(async () => {

    const ok = await carregarPin();

    if (!ok) return;

})();