const sampleTemplates = [
  { name: 'Campaign 1', type: 'Time-time', typeClass: 'type-time', status: 'Active', statusClass: 'status-active', recipients: '15,890' },
  { name: 'Campaign 2', type: 'Recepting', typeClass: 'type-rec', status: 'Paused', statusClass: 'status-paused', recipients: '9,210' },
  { name: 'Campaign 3', type: 'Conditional', typeClass: 'type-cond', status: 'Paused', statusClass: 'status-paused', recipients: '1' },
];

let messagesChart = null;
let deliveryChart = null;
let segmentsChart = null;
let analyticsPreviewChart = null;

// Auto-scale logic: if the browser/device shows a smaller page (e.g. zoom 50% or DPR < 1),
// scale the UI up so it appears like 100% resolution.
function applyAutoScale(){
  const viewportScale = (window.visualViewport && window.visualViewport.scale) ? window.visualViewport.scale : 1;
  const dpr = window.devicePixelRatio || 1;
  // use the smaller of the two as the effective shrink factor
  const shrink = Math.min(dpr, viewportScale) || 1;
  let scale = 1;
  if (shrink < 1) {
    scale = 1 / shrink;
    // clamp to avoid extreme scaling
    scale = Math.min(scale, 3);
  }
  document.documentElement.style.setProperty('--page-scale', scale);
  const wrap = document.querySelector('.scale-wrap');
  if (wrap) {
    // reduce wrapper width so scaled content doesn't overflow horizontally
    wrap.style.width = (100 / scale) + '%';
  }
}

window.addEventListener('resize', applyAutoScale);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', applyAutoScale);
}

function renderTemplates() {
  const tbody = document.getElementById('templatesTable');
  tbody.innerHTML = '';
  sampleTemplates.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div class="fw-semibold">${t.name}</div></td>
      <td>
        <span class="text-muted small">${t.date || '2025-11-20'}</span>
      </td>
      <td><span style="background:#eaf1fa;color:#2a537c;padding:4px 16px;border-radius:12px;font-size:0.97rem;">${t.status}</span></td>
      <td>${t.recipients}</td>
      <td><span style="background:#eaf1fa;color:#2a537c;padding:4px 16px;border-radius:12px;font-size:0.97rem;">${t.opened || '12,500'}</span></td>
      <td>
        <button class="btn btn-sm btn-link text-primary" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-link text-danger" title="Delete"><i class="bi bi-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function fetchMetrics() {
  try {
    const res = await fetch('data/metrics.json', {cache: 'no-store'});
    if (!res.ok) throw new Error('Network response not ok');
    return await res.json();
  } catch (err) {
    console.warn('Could not fetch metrics.json, using defaults', err);
    return null;
  }
}

function renderCardsFromMetrics(metrics) {
  if (!metrics) return;
  const activeEl = document.getElementById('activeSegments');
  const updatesEl = document.getElementById('updatesSent');
  const readRateEl = document.getElementById('farmerReadRate');
  activeEl.textContent = metrics.activeSegments ?? activeEl.textContent;
  updatesEl.textContent = (metrics.updatesSent ?? 0).toLocaleString();
  readRateEl.textContent = (metrics.farmerReadRate ?? 0) + '%';
}

function createOrUpdateCharts(metrics) {
  if (!metrics) return;
  const labels = metrics.labels || [];
  const engagement = metrics.engagement || [];

  // engagement line chart (match analytics page style)
  const ctx = document.getElementById('engagementChart').getContext('2d');
  if (messagesChart) {
    messagesChart.data.labels = labels;
    messagesChart.data.datasets[0].data = engagement;
    messagesChart.update();
  } else {
    messagesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Engagement',
          data: engagement,
          borderColor: '#2a537c',
          backgroundColor: 'rgba(42,83,124,0.08)',
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: '#2a537c',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: '#fff',
            titleColor: '#2a537c',
            bodyColor: '#2a537c',
            borderColor: '#eaf1fa',
            borderWidth: 1,
            padding: 10,
            displayColors: false
          }
        },
        scales: {
          y: {
            min: 60,
            max: 80,
            ticks: { callback: v => v + '%' }
          }
        }
      }
    });
  }

  // small analytics preview (used on index page Analytics card)
  const previewEl = document.getElementById('analyticsPreview');
  if (previewEl) {
    try{
      const pctx = previewEl.getContext('2d');
      // use last 10 engagement points if available, otherwise labels
      const previewLabels = (labels && labels.slice(-10)) || (Array.from({length:10}, (_,i)=>i+1));
      const previewData = (engagement && engagement.slice(-10)) || previewLabels.map(()=>0);
      if (analyticsPreviewChart) {
        analyticsPreviewChart.data.labels = previewLabels;
        analyticsPreviewChart.data.datasets[0].data = previewData;
        analyticsPreviewChart.update();
      } else {
          // Use the same solid blue as the main analytics bars
          const barColor = '#2a537c';

        analyticsPreviewChart = new Chart(pctx, {
          type: 'bar',
          data: {
            labels: previewLabels,
            datasets: [{
              data: previewData,
                backgroundColor: barColor,
              borderRadius: 12,
              barPercentage: 0.6,
              categoryPercentage: 0.7,
              borderSkipped: false,
              shadowOffsetX: 0,
              shadowOffsetY: 2,
              shadowBlur: 6,
              shadowColor: 'rgba(79,138,235,0.15)'
            }]
          },
          options: {
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled: true,
                backgroundColor: '#fff',
                titleColor: '#2a537c',
                bodyColor: '#2a537c',
                borderColor: '#eaf1fa',
                borderWidth: 1,
                padding: 10,
                displayColors: false
              }
            },
            layout: { padding: { top: 8, bottom: 8, left: 8, right: 8 } },
            scales: {
              x: {
                display: false,
                grid: { display: false, drawBorder: false }
              },
              y: {
                display: false,
                min: 0,
                max: 100,
                grid: { display: false, drawBorder: false }
              }
            },
            elements: {
              bar: {
                borderRadius: 12
              }
            }
          }
        });
      }
    }catch(e){
      console.warn('analyticsPreviewChart failed:', e);
      analyticsPreviewChart = null;
    }
  }

  // segments horizontal bar chart (optional element)
  const sElem = document.getElementById('segmentsChart');
  const segs = metrics.topSegments || [];
  const segLabels = segs.map(s => s.name);
  const segValues = segs.map(s => s.rate);

  if (sElem) {
    const sctx = sElem.getContext('2d');
    if (segmentsChart) {
      segmentsChart.data.labels = segLabels;
      segmentsChart.data.datasets[0].data = segValues;
      segmentsChart.update();
    } else {
      segmentsChart = new Chart(sctx, {
        type: 'bar',
        data: { labels: segLabels, datasets: [{ data: segValues, backgroundColor: '#2b6ef6' }] },
        options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { max: 100, ticks: { callback: v => v + '%' } } } }
      });
    }
  } else {
    // element not present — clear any previously created chart reference
    segmentsChart = null;
  }

  // populate right-side simple table
  const tbody = document.getElementById('segmentsTable');
  tbody.innerHTML = '';
  segs.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.name}</td><td class="text-end">${s.rate}%</td>`;
    tbody.appendChild(tr);
  });
}

async function loadAndRenderMetrics() {
  let metrics = await fetchMetrics();
  metrics = addRandomData(metrics);
  renderCardsFromMetrics(metrics);
  createOrUpdateCharts(metrics);
}

// Utility: random helpers and augmentation
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function addRandomData(metrics) {
  // If no metrics provided, create a baseline structure
  if (!metrics) {
    const now = new Date();
    const labels = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, now.getDate());
      labels.push(d.toISOString().slice(0,10));
    }
    metrics = {
      labels,
      engagement: labels.map(() => Math.round(randomBetween(60,80))),
      topSegments: [
        { name: 'Irrigation Updates', rate: Math.round(randomBetween(60,92)) },
        { name: 'Paddy Farmers', rate: Math.round(randomBetween(50,85)) },
        { name: 'Pest Alerts', rate: Math.round(randomBetween(30,75)) },
        { name: 'Water Allocation', rate: Math.round(randomBetween(55,95)) },
        { name: 'Market Prices', rate: Math.round(randomBetween(40,78)) }
      ],
      farmerReadRate: +(randomBetween(60,92)).toFixed(1),
      activeSegments: Math.round(randomBetween(20,65)),
      updatesSent: Math.round(randomBetween(1200,9800))
    };
    return metrics;
  }

  // Slightly jitter existing engagement values or generate if missing
  if (Array.isArray(metrics.engagement) && metrics.engagement.length) {
    metrics.engagement = metrics.engagement.map(v => {
      const base = parseFloat(v) || 0;
      const jitter = randomBetween(-0.8, 1.2);
      return +(clamp(base + jitter, 0, 20)).toFixed(1);
    });
  } else {
    metrics.engagement = (metrics.labels || []).map(() => Math.round(randomBetween(60,80)));
  }

  // Top segments: jitter their rates or create defaults
  if (Array.isArray(metrics.topSegments) && metrics.topSegments.length) {
    metrics.topSegments = metrics.topSegments.map(s => {
      const base = parseFloat(s.rate) || randomBetween(40,80);
      const newRate = Math.round(clamp(base + randomBetween(-6, 6), 0, 100));
      return { name: s.name || 'Segment', rate: newRate };
    });
  } else {
    metrics.topSegments = [
      { name: 'Segment A', rate: Math.round(randomBetween(40,92)) },
      { name: 'Segment B', rate: Math.round(randomBetween(30,85)) },
      { name: 'Segment C', rate: Math.round(randomBetween(25,75)) },
      { name: 'Segment D', rate: Math.round(randomBetween(35,88)) },
      { name: 'Segment E', rate: Math.round(randomBetween(20,70)) }
    ];
  }

  // Adjust top-level numbers slightly
  metrics.farmerReadRate = +( (parseFloat(metrics.farmerReadRate) || randomBetween(50,85)) + randomBetween(-2,2) ).toFixed(1);
  metrics.activeSegments = Math.round((parseInt(metrics.activeSegments) || 20) + randomBetween(-3,6));
  metrics.updatesSent = Math.round((parseInt(metrics.updatesSent) || 1000) + randomBetween(-200,800));

  return metrics;
}

document.addEventListener('DOMContentLoaded', async () => {
  // apply scaling immediately so UI appears at intended size
  try { applyAutoScale(); } catch(e) { console.warn('applyAutoScale failed', e); }
  renderTemplates();

  document.getElementById('newCampaignBtn').addEventListener('click', () => {
    // Navigate to the Ground Update wizard page
    window.location.href = 'ground-update.html';
  });

  document.getElementById('refreshMetrics').addEventListener('click', async () => {
    document.getElementById('refreshMetrics').disabled = true;
    await loadAndRenderMetrics();
    setTimeout(() => document.getElementById('refreshMetrics').disabled = false, 600);
  });

  await loadAndRenderMetrics();
});
