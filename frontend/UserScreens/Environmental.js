Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.color = '#7a7a7a';

const tip = {
  backgroundColor:'#fff', borderColor:'#ebebeb', borderWidth:1,
  titleColor:'#1a1a1a', bodyColor:'#7a7a7a', padding:12, cornerRadius:10
};

new Chart(document.getElementById('co2Chart').getContext('2d'), {
  type:'line',
  data:{
    labels:['Oct','Nov','Dec','Jan','Feb','Mar','Apr'],
    datasets:[{
      label:'CO₂ Avoided (tonnes)',
      data:[1.4,1.8,1.6,2.2,2.5,2.8,3.1],
      borderColor:'#3a9e3f', borderWidth:2.5,
      pointBackgroundColor:'#3a9e3f', pointRadius:4, pointHoverRadius:7,
      tension:0.4, fill:true,
      backgroundColor:(ctx)=>{
        const g=ctx.chart.ctx.createLinearGradient(0,0,0,240);
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
      y:{grid:{color:'rgba(0,0,0,.05)'}, border:{display:false}, ticks:{callback:v=>v+'t'}}
    }
  }
});


new Chart(document.getElementById('wasteDonut').getContext('2d'), {
  type:'doughnut',
  data:{
    labels:['Plastic HDPE','Plastic PET','Metal','Paper','Glass'],
    datasets:[{
      data:[28,26,22,15,9],
      backgroundColor:['#3a9e3f','#5dbb62','#1f5c22','#8dc98f','#c5e8c6'],
      borderWidth:0, hoverOffset:8
    }]
  },
  options:{
    responsive:true, maintainAspectRatio:false, cutout:'68%',
    plugins:{
      legend:{position:'bottom', labels:{boxWidth:11, padding:14, usePointStyle:true, pointStyle:'circle'}},
      tooltip:{...tip, callbacks:{label:ctx=>` ${ctx.label}: ${ctx.parsed}%`}}
    }
  }
});

/* ── WEEKLY BAR ── */
new Chart(document.getElementById('weeklyBar').getContext('2d'), {
  type:'bar',
  data:{
    labels:['Wk 1','Wk 2','Wk 3','Wk 4','Wk 5'],
    datasets:[{
      label:'kg collected',
      data:[980,1120,1050,1200,1248],
      backgroundColor:['rgba(58,158,63,.4)','rgba(58,158,63,.55)','rgba(58,158,63,.55)','rgba(58,158,63,.7)','rgba(58,158,63,.9)'],
      borderRadius:10, borderSkipped:false,
      hoverBackgroundColor:'#3a9e3f'
    }]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{display:false}, tooltip:tip},
    scales:{
      x:{grid:{display:false}, border:{display:false}},
      y:{grid:{color:'rgba(0,0,0,.05)'}, border:{display:false}, ticks:{callback:v=>v+' kg'}}
    }
  }
});
