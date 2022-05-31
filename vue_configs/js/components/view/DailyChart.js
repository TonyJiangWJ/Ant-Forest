/*
 * @Author: TonyJiangWJ
 * @Date: 2022-05-29 18:05:35
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-05-30 11:14:03
 * @Description: 
 */
const DailyChart = {
  name: 'DailyChart',
  data () {
    return {
      loading: false,
      showDatePicker: false,
      currentDate: new Date(),
      pickDate: new Date(),
      pickStartDate: new Date(),
      pickEndDate: new Date(),
      changeStart: true,
      friendCollectList: [
        {
          "COLLECT_ENERGY": 87,
          "WATER_ENERGY": 0,
          "COLLECT_DATE": "2022-04-01"
        },
        {
          "COLLECT_ENERGY": 797,
          "WATER_ENERGY": 40,
          "COLLECT_DATE": "2022-04-02"
        },
        {
          "COLLECT_ENERGY": 827,
          "WATER_ENERGY": 60,
          "COLLECT_DATE": "2022-04-03"
        },
      ].map(({ COLLECT_DATE: collectDate, COLLECT_ENERGY: collectEnergy, WATER_ENERGY: waterEnergy }) => ({ collectDate, collectEnergy, waterEnergy })),
      energyList: [
        {
          "ID": 3,
          "ENERGY": 96643,
          "ENERGY_DATE": "2022-04-05",
          "CREATE_TIME": "2022-04-05 23:58:05"
        },
        {
          "ID": 55,
          "ENERGY": 97375,
          "ENERGY_DATE": "2022-04-06",
          "CREATE_TIME": "2022-04-06 23:01:47"
        },
        {
          "ID": 108,
          "ENERGY": 98220,
          "ENERGY_DATE": "2022-04-07",
          "CREATE_TIME": "2022-04-07 23:51:12"
        },
      ].map(({ENERGY:energy, ENERGY_DATE:energyDate}) => ({energy, energyDate})),
      query: {
        startDate: '',
        endDate: '',
      },
    }
  },
  methods: {
    changeStartDate: function () {
      this.pickDate = this.pickStartDate
      this.showDatePicker = true
      this.changeStart = true
    },
    changeEndDate: function () {
      this.pickDate = this.pickEndDate
      this.showDatePicker = true
      this.changeStart = false
    },
    pageCollectInfo: function () {
      this.query.startDate = formatDate(this.pickStartDate, 'yyyy-MM-dd')
      this.query.endDate = formatDate(this.pickEndDate, 'yyyy-MM-dd')
      this.loading = true
      $nativeApi.request('queryDailyCollectByDate', this.query).then(result => {
        this.friendCollectList = result
        this.loading = false
        return Promise.resolve(result)
      }).then(_ => {
        this.renderCollectChart()
      })
        .catch(e => this.loading = false)
      $nativeApi.request('queryMyDailyEnergyByDate', this.query).then(result => {
        this.energyList = result
        this.renderEnergyChart()
      })
    },
    renderCollectChart: function () {

      let drawData = this.friendCollectList

      this.$el.chart.data(drawData)
      this.$el.chart.scale('collectEnergy', {
        nice: true,
      })

      this.$el.chart.tooltip({
        showMarkers: false
      })
      this.$el.chart.option('slider', {})
      this.$el.chart.interaction('active-region')
      this.$el.chart.interval().position('collectDate*collectEnergy').label('collectEnergy')

      this.$el.chart.render()
    },
    renderEnergyChart () {
      let drawData = this.energyList
      this.$el.energyChart.data(drawData);
      this.$el.energyChart.scale('energy', {
        nice: true,
      });

      this.$el.energyChart.tooltip({
        showMarkers: false
      });
      this.$el.energyChart.option('slider', {})
      this.$el.energyChart.interaction('active-region')

      this.$el.energyChart.line().position('energyDate*energy')
      this.$el.energyChart.point().position('energyDate*energy')

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
        padding: [20, 20, 20, 65]
      });
    }
  },
  watch: {
    showDatePicker: function (newVal) {
      if (!newVal) {
        let collectDate = formatDate(this.pickDate, 'yyyy-MM-dd')
        if (this.changeStart) {
          this.pickStartDate = this.pickDate
          this.query.startDate = collectDate
        } else {
          this.pickEndDate = this.pickDate
          this.query.endDate = collectDate
        }
        this.pageCollectInfo()
      }
    },
  },
  computed: {
    minDate: function () {
      return this.changeStart ? new Date('2017/01/01') : this.pickStartDate
    }
  },
  mounted () {
    this.pickStartDate = new Date(new Date().getTime() - 30 * 24 * 3600000)
    this.pickEndDate = new Date()
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
      能量收集数据 日期：<van-button type='default' size="small" @click="changeStartDate">{{query.startDate}}</van-button>-
      <van-button type='default' size="small" @click="changeEndDate">{{query.endDate}}</van-button>
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
      <van-datetime-picker v-model="pickDate" type="date" title="选择查询日期" :max-date="currentDate" :min-date="minDate" :show-toolbar="false"/>
    </van-popup>
  </div>
  `
}