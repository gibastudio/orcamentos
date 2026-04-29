let produtos = [];
let total = 0;
let produtosDB = [];

// Carregar banco de dados de produtos ao iniciar
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("./js/produtos_db.json");
    produtosDB = await response.json();
    produtosDB = produtosDB.produtos;
  } catch (error) {
    console.error("Erro ao carregar banco de dados de produtos:", error);
  }
});

function buscarProdutoPorCodigo(codigo) {
  return produtosDB.find(p => p.codigo.toUpperCase() === codigo.toUpperCase());
}

function verificarImagemProduto(codigo) {
  return new Promise((resolve) => {
    const img = new Image();
    // Tenta buscar a imagem pelo código do produto
    const caminhoImagem = ./produtos/${codigo.toLowerCase()}.png;
    
    img.onload = function () {
      resolve(caminhoImagem);
    };
    img.onerror = function () {
      resolve(null);
    };
    img.src = caminhoImagem;
  });
}

async function adicionarProduto() {
  const codigo = document.getElementById("codigo").value.trim();
  const valor = parseFloat(document.getElementById("valor").value);

  if (!codigo || !valor || valor <= 0) {
    alert("Por favor, preencha o código e o valor corretamente!");
    return;
  }

  // Buscar produto no banco de dados
  const produtoDB = buscarProdutoPorCodigo(codigo);
  
  if (!produtoDB) {
    alert(`Produto com código "${codigo}" não encontrado no banco de dados!`);
    return;
  }

  // Buscar imagem do produto
  const imagem = await verificarImagemProduto(codigo);
  
  produtos.push({
    codigo: produtoDB.codigo,
    nome: produtoDB.nome,
    descricao: produtoDB.descricao,
    valor,
    imagem
  });
  
  total += valor;

  renderizarProdutos();

  document.getElementById("codigo").value = "";
  document.getElementById("valor").value = "";
  document.getElementById("codigo").focus();
}

function renderizarProdutos() {
  const container = document.getElementById("productsWrapper");
  
  if (produtos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>Nenhum produto adicionado ainda</p>
      </div>
    `;
    document.getElementById("total").innerText = "0.00";
    return;
  }

  container.innerHTML = produtos.map((p, index) => `
    <div class="product-item ${p.imagem ? 'com-imagem' : 'sem-imagem'}">
      <div class="product-content">
        ${p.imagem ? `<img src="${p.imagem}" alt="${p.nome}" class="product-image">` : ''}
        <div class="product-info">
          <div class="product-code">Código: ${p.codigo}</div>
          <div class="product-name">${p.nome}</div>
          <div class="product-description">${p.descricao}</div>
          <div class="product-price">R$ ${p.valor.toFixed(2)}</div>
        </div>
      </div>
      <button class="btn-remove" onclick="removerProduto(${index})">
        <i class="fas fa-trash"></i> Remover
      </button>
    </div>
  `).join("");

  document.getElementById("total").innerText = total.toFixed(2);
}

function removerProduto(index) {
  total -= produtos[index].valor;
  produtos.splice(index, 1);
  renderizarProdutos();
}

async function gerarPDF() {
  const nomeEmpresa = "GibaStudio";
  const nome = document.getElementById("nome").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const endereco = document.getElementById("endereco").value.trim();
  const email = document.getElementById("email").value.trim();

  if (!nome || !telefone || !endereco || !email || produtos.length === 0) {
    alert("Por favor, preencha todos os dados do cliente e adicione pelo menos um produto!");
    return;
  }

  // Carregar todas as imagens dos produtos primeiro
  const produtosComImagens = await Promise.all(
    produtos.map(async (p) => {
      if (!p.imagem) return { ...p, imagemCarregada: null };
      
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const imgData = canvas.toDataURL("image/png");
          resolve({ ...p, imagemCarregada: imgData });
        };
        img.onerror = function () {
          resolve({ ...p, imagemCarregada: null });
        };
        img.src = p.imagem;
      });
    })
  );

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  // Carregar a logo
  const img = new Image();
  img.onload = function () {
    adicionarLogoeNomeEmpresa(pdf, img, nomeEmpresa, nome, telefone, endereco, email, produtosComImagens);
  };
  img.onerror = function () {
    // Se a logo não existir, continuar sem ela
    adicionarApenasNomeEmpresa(pdf, nomeEmpresa, nome, telefone, endereco, email, produtosComImagens);
  };
  img.src = "logo.png";
}

function adicionarLogoeNomeEmpresa(pdf, img, nomeEmpresa, nome, telefone, endereco, email, produtosComImagens) {
  // Adicionar logo no canto superior esquerdo
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const imgData = canvas.toDataURL("image/png");

  pdf.addImage(imgData, "PNG", 15, 10, 30, 30);

  // Nome da empresa ao lado da logo
  pdf.setTextColor(102, 126, 234);
  pdf.setFontSize(20);
  pdf.setFont(undefined, "bold");
  pdf.text(nomeEmpresa, 50, 25);

  continuarComPDF(pdf, nome, telefone, endereco, email, 50, produtosComImagens);
}

function adicionarApenasNomeEmpresa(pdf, nomeEmpresa, nome, telefone, endereco, email, produtosComImagens) {
  // Nome da empresa em destaque no topo
  pdf.setTextColor(102, 126, 234);
  pdf.setFontSize(20);
  pdf.setFont(undefined, "bold");
  pdf.text(nomeEmpresa, 15, 20);

  continuarComPDF(pdf, nome, telefone, endereco, email, 35, produtosComImagens);
}

function continuarComPDF(pdf, nome, telefone, endereco, email, startY, produtosComImagens) {
  // Linha divisória
  pdf.setDrawColor(102, 126, 234);
  pdf.line(15, startY + 5, 195, startY + 5);

  // Cabeçalho ORÇAMENTO
  pdf.setFillColor(102, 126, 234);
  pdf.rect(15, startY + 10, 180, 10, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont(undefined, "bold");
  pdf.text("ORÇAMENTO", 20, startY + 17);
  pdf.setFontSize(10);
  pdf.text(new Date().toLocaleDateString("pt-BR"), 190, startY + 17, { align: "right" });

  // Dados do Cliente
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11);
  pdf.setFont(undefined, "bold");
  pdf.text("DADOS DO CLIENTE", 15, startY + 28);

  pdf.setFont(undefined, "normal");
  pdf.setFontSize(10);
  pdf.text(`Nome: ${nome}`, 15, startY + 38);
  pdf.text(`Telefone: ${telefone}`, 15, startY + 45);
  pdf.text(`Endereço: ${endereco}`, 15, startY + 52);
  pdf.text(`E-mail: ${email}`, 15, startY + 59);

  // Linha divisória
  pdf.setDrawColor(102, 126, 234);
  pdf.line(15, startY + 65, 195, startY + 65);

  // Produtos
  pdf.setFont(undefined, "bold");
  pdf.setFontSize(11);
  pdf.text("PRODUTOS/SERVIÇOS", 15, startY + 75);

  pdf.setFont(undefined, "normal");
  pdf.setFontSize(10);

  let yPosition = startY + 83;
  const pageHeight = pdf.internal.pageSize.height;

  produtosComImagens.forEach((p, index) => {
    // Verificar se precisa adicionar nova página (considerando espaço para imagem se houver)
    const alturaItem = p.imagemCarregada ? 45 : 20;
    if (yPosition + alturaItem > pageHeight - 30) {
      pdf.addPage();
      yPosition = 20;
    }

    // Alternar cores de fundo
    if (index % 2 === 0) {
      pdf.setFillColor(245, 246, 255);
      pdf.rect(15, yPosition - 5, 180, alturaItem, "F");
    }

    // Adicionar imagem do produto se existir
    if (p.imagemCarregada) {
      try {
        pdf.addImage(p.imagemCarregada, "PNG", 18, yPosition - 3, 20, 20);
        pdf.text(`${index + 1}. ${p.nome}`, 42, yPosition + 2);
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Código: ${p.codigo}`, 42, yPosition + 7);
        pdf.text(`${p.descricao}`, 42, yPosition + 12, { maxWidth: 130 });
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
      } catch (e) {
        // Se houver erro ao carregar imagem, apenas adicionar texto
        pdf.text(`${index + 1}. ${p.nome}`, 20, yPosition);
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Código: ${p.codigo}`, 20, yPosition + 5);
        pdf.text(`${p.descricao}`, 20, yPosition + 10, { maxWidth: 150 });
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
      }
    } else {
      pdf.text(`${index + 1}. ${p.nome}`, 20, yPosition);
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Código: ${p.codigo}`, 20, yPosition + 5);
      pdf.text(`${p.descricao}`, 20, yPosition + 10, { maxWidth: 150 });
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
    }

    pdf.text(`R$ ${p.valor.toFixed(2)}`, 170, yPosition + 2, { align: "right" });
    yPosition += alturaItem;
  });

  // Total
  yPosition += 5;
  pdf.setFillColor(118, 75, 162);
  pdf.rect(15, yPosition, 180, 12, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont(undefined, "bold");
  pdf.setFontSize(12);
  pdf.text("TOTAL", 20, yPosition + 8);
  pdf.text(`R$ ${total.toFixed(2)}`, 190, yPosition + 8, { align: "right" });

  // Rodapé
  pdf.setTextColor(150, 150, 150);
  pdf.setFontSize(8);
  pdf.text("Documento gerado automaticamente pelo Sistema de Orçamento", 105, pageHeight - 5, { align: "center" });

  const nomeCliente = document.getElementById("nome").value.replace(/\s+/g, "_");
  pdf.save(`orcamento_${nomeCliente}_${new Date().getTime()}.pdf`);
  alert("Orçamento gerado com sucesso!");
}
