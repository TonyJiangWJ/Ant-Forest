const CollectSummary = {
  name: 'CollectSummary',
  data() {
    return {
      totalCollect: 10,
      totalWater: 10,
      totalIncreased: 100,
      showDatePicker: false,
      currentDate: new Date(),
      pickDate: new Date(),
      loading: false,
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
      orderByOptions: [
        { text: '默认排序', value: '' },
        { text: '收集数量', value: 'COLLECT_ENERGY DESC,CREATE_TIME ASC' },
        { text: '浇水数量', value: 'WATER_ENERGY DESC,CREATE_TIME ASC' },
        { text: '好友名称', value: 'FRIEND_NAME ASC,CREATE_TIME ASC' },
      ],
      query: {
        size: 999,
        start: 0,
        current: 0,
        total: 0,
        collectDate: '',
        orderBy: '',
        groupByFriend: false,
      },
      orderBy: ''
    }
  },
  watch: {
    showDatePicker: function (newVal) {
      if (!newVal) {
        let collectDate = formatDate(this.pickDate, 'yyyy-MM-dd')
        if (collectDate != this.query.collectDate) {
          this.query.collectDate = collectDate
          this.pageCollectInfo()
          this.getCollectSummary()
        }
      }
    },
    orderBy: function (newVal) {
      this.query.orderBy = newVal
      this.pageCollectInfo()
    },
    "query.groupByFriend": function () {
      this.pageCollectInfo()
    }
  },
  methods: {
    pageCollectInfo: function() {
      this.loading = true
      $nativeApi.request('pageCollectInfo', this.query).then(resp => {
        this.query.size = resp.size
        this.query.total = resp.total
        console.log('resp:', JSON.stringify(resp))
        this.friendCollectList = resp.result
        this.loading = false
      }).catch(e => this.loading = false)
    },
    getCollectSummary: function() {
      $nativeApi.request('getCollectSummary', this.query).then(resp => {
        this.totalCollect = resp.totalCollect
        this.totalWater = resp.totalWater
      })
      $nativeApi.request('getMyEnergyIncreased', this.query.collectDate).then(resp => {
        this.totalIncreased = resp.totalIncreased
      })
    },
    toChart: function () {
      this.$router.push({
        path: '/view/collectChart',
        query: {
          collectDate: this.query.collectDate,
        }
      })
    },
    toDailyChart: function () {
      this.$router.push({
        path: '/view/dailyChart',
      })
    }
  },
  mounted() {
    this.query.collectDate = formatDate(this.pickDate, 'yyyy-MM-dd')
    this.pageCollectInfo()
    this.getCollectSummary()
  },
  template: `
  <div style="height: 100%">
    <van-overlay :show="loading" z-index="1000">
      <div class="wrapper">
        <van-loading size="4rem" vertical>加载中...</van-loading>
      </div>
    </van-overlay>
    <van-cell-group>
      <tip-block style="padding: 0.5rem 0;margin-bottom:0.3rem;border-bottom: 1px solid rgb(248 249 250);">
        <van-row type="flex" justify="center">
          <van-col :span="14" style="display: flex; align-items: center;">
            能量收集数据 日期：<van-button type='default' size="small" @click="showDatePicker=true">{{query.collectDate}}</van-button>
          </van-col>
          <van-col :span="5" style="display: flex;align-items: center;justify-content: center;">
            <van-dropdown-menu active-color="#1989fa" class="cell-dropdown">
              <van-dropdown-item v-model="orderBy" :options="orderByOptions" />
            </van-dropdown-menu>
          </van-col>
          <van-col :span="5" style="display: flex;align-items: center;justify-content: center;">
            <van-dropdown-menu active-color="#1989fa" class="cell-dropdown">
              <van-dropdown-item title="筛选" ref="item">
                <van-cell center title="按好友名分组">
                  <template #right-icon>
                    <van-switch v-model="query.groupByFriend" size="16" />
                  </template>
                </van-cell>
              </van-dropdown-item>
            </van-dropdown-menu>
          </van-col>
        </van-row>
      </tip-block>
      <tip-block>总收取次数：{{query.total}} 总收集好友能量：{{totalCollect}} 总浇水：{{totalWater}}</tip-block>
      <tip-block>当日能量值增长量：{{totalIncreased}}</tip-block>
      <tip-block style="padding-bottom:0.5rem;border-bottom: 1px solid rgb(248 249 250);">数据可能不准确 仅供参考：
        <van-button type='default' size="small" @click="toChart">当日数据</van-button>
        <van-button type='default' size="small" @click="toDailyChart">每日统计</van-button>
      </tip-block>
      <van-cell v-for="(item,idx) in friendCollectList"
        :key="item.friendName+item.createTime"
        class="van-clearfix"
        :border="true"
        :label="query.groupByFriend ? item.collectDate : item.createTime">
        <template #title>
          <span>{{item.friendName}}</span>
          <span style="color: gray;">{{item.friendEnergy}}</span>
        </template>
        <template #default>
          <span style="color: green;">{{item.collectEnergy}}</span>
          <div style="color: orange;">{{item.waterEnergy}}</div>
        </template>
      </van-cell>
    </van-cell-group>
    <van-popup v-model="showDatePicker" position="bottom" :style="{ height: '40%' }">
      <van-datetime-picker v-model="pickDate" type="date" title="选择查询日期" :max-date="currentDate" :show-toolbar="false"/>
    </van-popup>
  </div>
  `
}