Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.color = '#7a7a7a';

const tip = {
  backgroundColor:'#fff', borderColor:'#ebebeb', borderWidth:1,
  titleColor:'#1a1a1a', bodyColor:'#7a7a7a', padding:12, cornerRadius:10
};


const monthlyRevenue = {
  labels:['Oct','Nov','Dec','Jan','Feb','Mar','Apr'],
  data:[14200,16800,15400,19200,21000,22800,24580]
};
const weeklyRevenue = {
  labels:['Wk 1','Wk 2','Wk 3','Wk 4'],
  data:[5200,6100,6800,6140]
};

const revenueCtx = document.getElementById('revenueChart').getContext('2d');
let revenueChart = new Chart(revenueCtx, {
  type:'line',
  data:{
    labels: monthlyRevenue.labels,
    datasets:[{
      label:'Revenue (R)',
      data: monthlyRevenue.data,
      borderColor:'#3a9e3f', borderWidth:2.5,
      pointBackgroundColor:'#3a9e3f', pointRadius:4, pointHoverRadius:7,
      tension:0.4, fill:true,
      backgroundColor:(ctx)=>{
        const g = ctx.chart.ctx.createLinearGradient(0,0,0,240);
        g.addColorStop(0,'rgba(58,158,63,.15)');
        g.addColorStop(1,'rgba(58,158,63,0)');
        return g;
      }
    }]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{display:false}, tooltip:tip},
    scales:{
      x:{grid:{display:false}, border:{display:false}},
      y:{grid:{color:'rgba(0,0,0,.05)'}, border:{display:false}, ticks:{callback:v=>'R '+v.toLocaleString()}}
    }
  }
});

function setTab(btn, type) {
  document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const src = type === 'monthly' ? monthlyRevenue : weeklyRevenue;
  revenueChart.data.labels = src.labels;
  revenueChart.data.datasets[0].data = src.data;
  revenueChart.update();
}

new Chart(document.getElementById('materialChart').getContext('2d'), {
  type:'bar',
  data:{
    labels:['Metal','Plastic\nHDPE','Plastic\nPET','Paper','Glass'],
    datasets:[{
      label:'Revenue (R)',
      data:[9240,6780,5415,2160,985],
      backgroundColor:['rgba(58,158,63,.85)','rgba(58,158,63,.7)','rgba(58,158,63,.55)','rgba(58,158,63,.4)','rgba(58,158,63,.25)'],
      borderRadius:10, borderSkipped:false,
      hoverBackgroundColor:'#3a9e3f'
    }]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{display:false}, tooltip:tip},
    scales:{
      x:{grid:{display:false}, border:{display:false}},
      y:{grid:{color:'rgba(0,0,0,.05)'}, border:{display:false}, ticks:{callback:v=>'R '+v.toLocaleString()}}
    }
  }
});