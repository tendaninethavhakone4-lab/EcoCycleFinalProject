Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.color = "#7a7a7a";

const tip = {
  backgroundColor: "#fff",
  borderColor: "#ebebeb",
  borderWidth: 1,
  titleColor: "#1a1a1a",
  bodyColor: "#7a7a7a",
  padding: 12,
  cornerRadius: 10,
};

// The line chart
new Chart(document.getElementById("lineChart"), {
  type: "line",
  data: {
    labels: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"],
    datasets: [
      {
        label: "kg collected",
        data: [820, 950, 880, 1080, 1150, 1200, 1248],
        borderColor: "#3a9e3f",
        borderWidth: 2.5,
        pointBackgroundColor: "#3a9e3f",
        pointRadius: 4,
        pointHoverRadius: 7,
        tension: 0.4,
        fill: true,
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 220);
          g.addColorStop(0, "rgba(58,158,63,.15)");
          g.addColorStop(1, "rgba(58,158,63,0)");
          return g;
        },
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: tip },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: {
        grid: { color: "rgba(0,0,0,.05)" },
        border: { display: false },
        ticks: { callback: (v) => v + " kg" },
      },
    },
  },
});

// Thisis a donut chart
new Chart(document.getElementById("donutChart"), {
  type: "doughnut",
  data: {
    labels: ["Plastic", "Paper", "Metal", "Glass"],
    datasets: [
      {
        data: [38, 25, 22, 15],
        backgroundColor: ["#3a9e3f", "#8dc98f", "#1f5c22", "#c5e8c6"],
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 12,
          padding: 16,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        ...tip,
        callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%` },
      },
    },
  },
});
