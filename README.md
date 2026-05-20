import base64

# Painel do Devedor
<p align="center">
  <img src="img/fintech.png" alt="Painel do Devedor Logo Concept" width="150" />
</p>

> Uma interface fintech moderna, leve e responsiva para visualização de débitos, cálculo de juros e simulação de quitação de dívidas.

A proposta do **Painel do Devedor** é transformar a experiência de negociação de dívidas. Em vez de uma abordagem punitiva, o sistema oferece uma ferramenta de parceria e transparência, permitindo que o usuário visualize o que falta pagar, simule cenários com juros e planeje a sua liberdade financeira.

---

## 📱 Recursos e Responsividade Avançada

* **UI Estilo Fintech:** Interface limpa, bordas suavizadas e estados de foco interativos elegantes.
* **Grid Híbrido Dinâmico:** * **Desktop:** Exibição em formato de tabela de alta densidade com 5 colunas perfeitamente alinhadas para rápida leitura.
    * **Mobile:** Sistema inteligente de *Media Queries* que reconstrói a tabela espremida, transformando cada linha em um **card vertical independente**, garantindo que nenhum dado seja cortado ou fique ilegível em telas pequenas.
* **Prevenção de Zoom no iOS:** Inputs configurados com tamanho otimizado para evitar o incômodo zoom automático do Safari/Chrome em smartphones.

---

## 🔑 Criptografia

* **Sistema de PIN:** Varias camadas de SHA-256, para caso algum curioso tente decifrar, só gastar tempo e hadware.
* **Criptografia AES:** Todo conteudo é guardado em AES para nenhum vazamento.
```bash
Mesmo que o projeto seja publico, vai dar uma certa dor de cabeça tentar entender para poder "roubar" informações!
```

---

## 🚀 Como Executar o Projeto

1. Clone o repositório
```bash
git clone https://github.com/davimtts/devedor.git
```
2. Coloque o GitHub Page

### Pronto, seu sistema esta funcionando