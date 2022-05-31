const CollectChart = {
  name: 'CollectChart',
  data () {
    return {
      loading: false,
      showDatePicker: false,
      currentDate: new Date(),
      pickDate: new Date(),
      friendCollectList: [
        {
          friendName: 'Haly',
          friendEnergy: 9999,
          collectEnergy: 100,
          waterEnergy: 10,
          createTime: '2022-04-06 15:12:11'
        },
        {
          friendName: 'Jame',
          friendEnergy: 8888,
          collectEnergy: 49,
          waterEnergy: 10,
          createTime: '2022-04-06 16:12:11'
        }
      ],
      energyList: [
        {
          energy: 10,
          createTime: '2022-04-06 16:12:11'
        }, {
          energy: 120,
          createTime: '2022-04-06 16:14:11'
        }, {
          energy: 304,
          createTime: '2022-04-06 16:15:11'
        }, {
          energy: 400,
          createTime: '2022-04-06 16:16:11'
        },],
      query: {
        size: 999,
        start: 0,
        current: 0,
        total: 0,
        collectDate: '2022-04-06',
      },
    }
  },
  watch: {
    showDatePicker: function (newVal) {
      if (!newVal) {
        let collectDate = formatDate(this.pickDate, 'yyyy-MM-dd')
        if (collectDate != this.query.collectDate) {
          this.query.collectDate = collectDate
          this.pageCollectInfo()
        }
      }
    },
  },
  methods: {
    pageCollectInfo: function () {
      this.loading = true
      $nativeApi.request('pageCollectInfo', this.query).then(resp => {
        this.query.size = resp.size
        this.query.total = resp.total
        console.log('resp:', JSON.stringify(resp))
        this.friendCollectList = resp.result
        this.loading = false
        return Promise.resolve(resp.result)
      }).then(_ => {
        this.renderCollectChart()
      })
        .catch(e => this.loading = false)
      $nativeApi.request('getMyEnergyByDate', this.query.collectDate).then(result => {
        let avg = result.map(v => v.energy).reduce((a,b) => a+=b) / result.length
        // 过滤远低于平均值的数据
        this.energyList = result.filter(v => Math.abs(v.energy - avg) < avg / 2)
        this.renderEnergyChart()
      })
    },
    renderCollectChart: function () {
      let data = this.friendCollectList.map(v => {
        v.timeByHour = v.createTime.substring(0, 16)
        return v
      }).reduce((a, b) => {
        if (typeof a[b.timeByHour] != "undefined") {
          a[b.timeByHour] += b.collectEnergy + b.waterEnergy
        } else {
          a[b.timeByHour] = b.collectEnergy + b.waterEnergy
        }
        return a
      }, {})

      let drawData = Object.keys(data).map(key => {
        return {
          time: key.substring(10),
          collect: data[key]
        }
      }).sort((a, b) => {
        return a.time > b.time ? 1 : -1
      })


      this.$el.chart.data(drawData)
      this.$el.chart.scale('collect', {
        nice: true,
      })

      this.$el.chart.tooltip({
        showMarkers: false
      })
      this.$el.chart.option('slider', {})
      this.$el.chart.interaction('active-region')
      this.$el.chart.interval().position('time*collect').label('collect')

      this.$el.chart.render()
    },
    renderEnergyChart () {

      this.$el.energyChart.data(this.energyList.map(v => {
        v.time = v.createTime.substring(11)
        return v
      }));
      // chart.scale('sales', {
      this.$el.energyChart.scale('collect', {
        nice: true,
      });

      this.$el.energyChart.tooltip({
        showMarkers: false
      });
      this.$el.energyChart.option('slider', {})
      this.$el.energyChart.interaction('active-region')

      this.$el.energyChart.line().position('time*energy')
      this.$el.energyChart.point().position('time*energy')

      this.$el.energyChart.render()
    },
    initChart: function () {
      this.$el.chart = new G2.Chart({
        container: 'collectContainer',
        autoFit: true,
        height: 500,
        padding: [20, 20, 20, 45]
      });
      this.$el.energyChart = new G2.Chart({
        container: 'energyContainer',
        autoFit: true,
        height: 500,
        padding: [20, 20, 20, 45]
      });
    }
  },
  mounted () {
    let collectDate = this.$route.query.collectDate
    console.log(collectDate)
    this.query.collectDate = collectDate || formatDate(this.pickDate, 'yyyy-MM-dd')
    this.pageCollectInfo()
    this.initChart()
    if ($app.moke) {
      this.renderCollectChart()
      this.renderEnergyChart()
    }
  },
  template: `
  <div style="height: 100%;">
    <van-overlay :show="loading" z-index="1000">
      <div class="wrapper">
        <van-loading size="4rem" vertical>加载中...</van-loading>
      </div>
    </van-overlay>
    <tip-block style="padding: 0.5rem 0;margin-bottom:0.3rem;border-bottom: 1px solid rgb(248 249 250);">
      能量收集数据 日期：<van-button type='default' size="small" @click="showDatePicker=true">{{query.collectDate}}</van-button>
    </tip-block>
    <van-divider content-position="left">好友能量收集数据</van-divider>
    <div style="padding: 1rem;display:flex;align-items:middle;width: 100%;">
      <div id="collectContainer" style="width: 100%;"></div>
    </div>
    <van-divider content-position="left">我的能量变动</van-divider>
    <div style="padding: 1rem;display:flex;align-items:middle;width: 100%;">
      <div id="energyContainer" style="width: 100%;"></div>
    </div>
    <van-popup v-model="showDatePicker" position="bottom" :style="{ height: '40%' }">
      <van-datetime-picker v-model="pickDate" type="date" title="选择查询日期" :max-date="currentDate" :show-toolbar="false"/>
    </van-popup>
  </div>
  `
}