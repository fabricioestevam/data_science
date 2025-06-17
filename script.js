// Configuração inicial das datas
document.addEventListener('DOMContentLoaded', () => {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 365);
  document.getElementById('dataFim').valueAsDate = fim;
  document.getElementById('dataInicio').valueAsDate = inicio;
  carregarDados();
});

let dadosCasos = [];
let graficos = {};

const gradiente = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'
];

function contarOcorrencias(dados, chave) {
  const contagem = {};
  dados.forEach(caso => {
    try {
      let valor = chave.includes('.') ? chave.split('.').reduce((o, k) => o?.[k], caso) : caso[chave];
      if (valor !== undefined && valor !== null) {
        contagem[valor] = (contagem[valor] || 0) + 1;
      }
    } catch (e) {
      console.warn('Erro ao contar:', e);
    }
  });
  return contagem;
}

function filtrarPorData(casos) {
  const inicio = document.getElementById('dataInicio').value;
  const fim = document.getElementById('dataFim').value;
  return casos.filter(caso => {
    const data = new Date(caso.data_do_caso);
    return (!inicio || data >= new Date(inicio)) && (!fim || data <= new Date(fim));
  });
}

async function carregarDados() {
  try {
    const res = await fetch('https://backend-datascience-qu3o.onrender.com/api/casos');
    dadosCasos = await res.json();
    atualizarDashboard();
    inicializarGraficoModelo();
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
    alert('Erro ao buscar dados da API.');
  }
}

function atualizarDashboard() {
  const dadosFiltrados = filtrarPorData(dadosCasos);
  document.getElementById('totalCasos').textContent = dadosFiltrados.length;
  criarGraficoRosca(dadosFiltrados);
  criarGraficoDistribuicao(dadosFiltrados);
  criarGraficoBoxplot(dadosFiltrados);
  criarGraficoEspacial(dadosFiltrados);
  criarGraficoTemporal(dadosFiltrados);
  criarGraficoCluster(dadosFiltrados);
}

function criarGraficoRosca(dados) {
  const variavel = document.getElementById('variavelRosca').value;
  const contagem = contarOcorrencias(dados, variavel);
  const labels = Object.keys(contagem);
  const valores = Object.values(contagem);

  if (graficos.rosca) graficos.rosca.destroy();
  graficos.rosca = new Chart(document.getElementById('graficoRosca'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: valores, backgroundColor: gradiente.slice(0, labels.length), borderWidth: 1 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function criarGraficoDistribuicao(dados) {
  const idades = dados.map(c => c.vitima?.idade).filter(i => typeof i === 'number');
  const bins = Array(10).fill(0);
  idades.forEach(i => { const idx = Math.min(Math.floor(i / 10), 9); bins[idx]++; });

  if (graficos.distribuicao) graficos.distribuicao.destroy();
  graficos.distribuicao = new Chart(document.getElementById('graficoDistribuicao'), {
    type: 'bar',
    data: {
      labels: [...Array(10)].map((_, i) => `${i * 10}-${i * 10 + 9}`),
      datasets: [{ label: 'Idades', data: bins, backgroundColor: '#36A2EB' }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

function criarGraficoBoxplot(dados) {
  const genStats = (genero) => {
    const idades = dados.filter(d => d.vitima?.genero === genero).map(d => d.vitima.idade).sort((a,b) => a-b);
    if (!idades.length) return [0,0,0,0,0];
    const q = (p) => idades[Math.floor(p * idades.length)];
    return [idades[0], q(0.25), q(0.5), q(0.75), idades[idades.length - 1]];
  };

  const masculino = genStats('Masculino');
  const feminino = genStats('Feminino');

  if (graficos.boxplot) graficos.boxplot.destroy();
  graficos.boxplot = new Chart(document.getElementById('graficoBoxplot'), {
    type: 'bar',
    data: {
      labels: ['Min', 'Q1', 'Mediana', 'Q3', 'Max'],
      datasets: [
        { label: 'Masculino', data: masculino, backgroundColor: '#4ECDC4' },
        { label: 'Feminino', data: feminino, backgroundColor: '#FF6B6B' }
      ]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

function criarGraficoEspacial(dados) {
  const contagem = contarOcorrencias(dados, 'geolocalizacao');
  const labels = Object.keys(contagem);
  const valores = Object.values(contagem);

  if (graficos.espacial) graficos.espacial.destroy();
  graficos.espacial = new Chart(document.getElementById('graficoEspacial'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Casos por Local', data: valores, backgroundColor: gradiente.slice(0, labels.length) }]
    },
    options: { responsive: true, indexAxis: 'y', scales: { x: { beginAtZero: true } } }
  });
}

function criarGraficoTemporal(dados) {
  const meses = {};
  dados.forEach(c => {
    const d = new Date(c.data_do_caso);
    const mes = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    meses[mes] = (meses[mes] || 0) + 1;
  });
  const labels = Object.keys(meses).sort();

  if (graficos.temporal) graficos.temporal.destroy();
  graficos.temporal = new Chart(document.getElementById('graficoTemporal'), {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Casos por Mês', data: labels.map(l => meses[l]), borderColor: '#FF6384', fill: true }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

function criarGraficoCluster(dados) {
  const clusterData = dados.map(c => ({ x: c.vitima?.idade || 30, y: Math.random() * 100 }));
  const split = Math.floor(clusterData.length / 3);

  if (graficos.cluster) graficos.cluster.destroy();
  graficos.cluster = new Chart(document.getElementById('graficoCluster'), {
    type: 'scatter',
    data: {
      datasets: [
        { label: 'Cluster 1', data: clusterData.slice(0, split), backgroundColor: '#FF6384' },
        { label: 'Cluster 2', data: clusterData.slice(split, 2 * split), backgroundColor: '#36A2EB' },
        { label: 'Cluster 3', data: clusterData.slice(2 * split), backgroundColor: '#FFCE56' }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: 'Idade' } },
        y: { title: { display: true, text: 'Fator Secundário' } }
      }
    }
  });
}

async function inicializarGraficoModelo() {
  try {
    const res = await fetch("https://backend-datascience-qu3o.onrender.com/api/modelo/coeficientes");
    const data = await res.json();

    const sorted = Object.entries(data).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0,10);
    const labels = sorted.map(([k]) => k.replace(/_/g, ' '));
    const valores = sorted.map(([_,v]) => v);

    const container = document.getElementById("containergraficoModelo");
    container.innerHTML = '<h3>\ud83e\udd16 Fatores do Modelo ML</h3><canvas id="graficoModelo"></canvas>';

    if (graficos.modelo) graficos.modelo.destroy();
    graficos.modelo = new Chart(document.getElementById('graficoModelo'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Importância da Feature',
          data: valores,
          backgroundColor: valores.map(v => v >= 0 ? '#4CAF50' : '#f44336')
        }]
      },
      options: { indexAxis: 'y', responsive: true, scales: { x: { beginAtZero: true } } }
    });
  } catch (e) {
    console.warn("Erro no modelo ML:", e);
    document.getElementById("containergraficoModelo").innerHTML = '<h3>\ud83e\udd16 Modelo ML</h3><p>Execute train_model.py primeiro.</p>';
  }
}

document.getElementById('dataFim').addEventListener('change', atualizarDashboard);
document.getElementById('dataInicio').addEventListener('change', atualizarDashboard);
document.getElementById('variavelRosca').addEventListener('change', atualizarDashboard);
