/*
 * @Author: TonyJiangWJ
 * @Date: 2020-12-22 21:30:51
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2021-01-10 14:04:26
 * @Description: 开发测试时使用的组件
 */

let ImageSelectDialog = {
  mixins: [mixin_methods],
  props: {
    showDialog: {
      type: Boolean,
      default: false,
    },
    rootPath: {
      type: String,
      default: ''
    }
  },
  model: {
    prop: 'showDialog',
    event: 'change'
  },
  data: function () {
    return {
      innerShowDialog: this.showDialog,
      files: [],
      selectedPath: null,
    }
  },
  filters: {
    fileSizeStr: fileSize => {
      if (!fileSize) {
        return '0 B'
      } else {
        return fileSize < 1024 ? fileSize + ' B' :
          fileSize < 1024 * 1024 ? (fileSize / 1024).toFixed(2) + ' KB' :
            fileSize < 1024 * 1024 * 1024 ? (fileSize / 1024 / 1024).toFixed(2) + ' MB' : (fileSize / 1024 / 1024 / 1024).toFixed(2) + ' GB'
      }
    }
  },
  watch: {
    innerShowDialog: function (newVal, oldVal) {
      this.$emit('change', newVal)
    },
    showDialog: function (newVal) {
      this.innerShowDialog = newVal
    }
  },
  methods: {
    listFiles: function (path) {
      $nativeApi.request('listImageFiles', { filePath: path || this.rootPath }).then(({ fileResult }) => {
        if (fileResult.error) {
          return
        }
        this.files = [{ name: '..', type: 'parent' }].concat(fileResult.resultList || [])
        this.rootPath = fileResult.path
      })
    },
    selectFile: function (file) {
      let selectedFilePath = this.rootPath + '/' + file.name
      if (file.isDir) {
        this.listFiles(selectedFilePath)
      } else {
        if (file.name === '..') {
          this.listFiles(this.rootPath.substring(0, this.rootPath.lastIndexOf('/')))
          return
        }
        this.$dialog.confirm({
          message: '是否加载该文件？'
        }).then(() => {
          this.selectedPath = selectedFilePath
          this.$emit('on-chose', selectedFilePath)
          this.innerShowDialog = false
        }).catch(() => { })
      }
    }
  },
  mounted() {
    this.listFiles(this.rootPath)
  },
  template: `
  <van-dialog v-model="innerShowDialog" title="选择图片文件" :show-confirm-button="false" close-on-click-overlay get-container="#app">
    <div style="width: 100%;height: 400px;overflow: scroll;">
      <van-cell-group>
        <van-cell v-for="file in files" :key="file.name" class="file-cell" @click="selectFile(file)">
          <template #title>
            <div class="van-cell__title file-container">
              <img v-if="file.type==='parent'" class="up-dir">
              <img v-else-if="file.type==='dir'" class="folder">
              <img v-else class="unknown">
              <span>{{file.name}}</span>
              <span v-if="file.type !== 'dir' && file.type !== 'parent'" class="file-size">{{file.fileSize | fileSizeStr}}</span>
            </div>
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </van-dialog>
  `
}

let ImageViewer = {
  mixins: [mixin_methods],
  props: {
    image: {
      type: Object,
      default: () => {
        return {
          std: '',
          oldStd: '',
          avg: '',
          medianBottom: '',
          median: '',
          invalid: false,
          imageData: '',
          intervalImageData: '',
          grayImageData: '',
          originImageData: '',
          createTime: ''
        }
      }
    },
    imageStyle: {
      type: String,
      default: 'height:3rem;'
    },
    defaultImage: {
      type: String,
      default: '0'
    }
  },
  data: function () {
    return {
      target: parseInt(this.defaultImage)
    }
  },
  methods: {
    toggleImage: function () {
      this.target++
      if (this.target >= 3) {
        this.target = 0
      }
    }
  },
  computed: {
    displayImageData: function () {
      if (this.target === 0) {
        return this.image.intervalImageData
      } else if (this.target === 1) {
        return this.image.grayImageData
      } else {
        return this.image.originImageData
      }
    }
  },
  watch: {
    defaultImage: function (v) {
      this.target = parseInt(v)
    }
  },
  template: '<img :src="displayImageData" :style="imageStyle" @click="toggleImage" />'
}

let CanvasViewer = {
  mixins: [mixin_methods],
  props: {
    image: {
      type: Object,
      default: () => {
        return {
          imageData: '',
          intervalImageData: '',
          grayImageData: '',
          originImageData: '',
          createTime: ''
        }
      }
    },
    imageStyle: {
      type: String,
      default: 'height:3rem;'
    },
    drawPoint: {
      type: Object,
      default: (() => {
        return { x: -1, y: -1 }
      })()
    },
    defaultImage: String
  },
  data: function () {
    return {
      target: 0,
      timeoutId: null
    }
  },
  methods: {
    displayImage: function () {
      if (this.timeoutId != null) {
        console.log('cancel timeout: ' + this.timeoutId)
        clearTimeout(this.timeoutId)
      }
      let self = this
      try {
        console.log('start render canvas')
        let img = new Image()
        img.src = self.displayImageData
        img.onload = function () {
          console.log('canvas image data: ' + self.displayImageData.substring(0, 40))
          let canvas = self.$refs['canvas']
          let ctx = canvas.getContext('2d')
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          ctx.strokeStyle = "red";
          ctx.rect(self.drawPoint.x - 2, self.drawPoint.y - 2, 4, 4)
          ctx.stroke()
          console.log('render canvas done, ' + canvas.width + ',' + canvas.height)
        }
      } catch (e) {
        console.log('render canvas failed ' + e)
      }
    },
  },
  computed: {
    displayImageData: function () {
      if (this.target === 0) {
        return this.image.intervalImageData
      } else if (this.target === 1) {
        return this.image.grayImageData
      } else {
        return this.image.originImageData
      }
    }
  },
  watch: {
    defaultImage: function (v) {
      this.target = parseInt(v)
    },
    displayImageData: function (v) {
      console.log("displayImageData: " + v.substring(0, 40))
      if (v) {
        this.displayImage()
      }
    },
    drawPoint: {
      deep: true,
      handler: function (v) {
        this.displayImage()
        $nativeApi.request('getPointColor', v)
          .then(resp => {
            if (resp.success) {
              this.$emit('get-point-color', { rgbColor: resp.rgbColor, grayColor: resp.grayColor })
            }
          })
      }
    }
  },
  template: '<canvas ref="canvas" :style="imageStyle" />'
}

let BallDetectCanvasViewer = {
  mixins: [mixin_methods],
  props: {
    image: {
      type: Object,
      default: () => {
        return {
          originImageData: '',
          ballInfos: [],
          width: 0,
          height: 0
        }
      }
    },
    imageStyle: {
      type: String,
      default: 'height:3rem;'
    }
  },
  data: function () {
    return {
      target: 0,
      timeoutId: null,
      showInterval: false
    }
  },
  methods: {
    displayImage: function () {
      if (!this.displayImageData) {
        console.log('imageData not valid')
        return
      }
      try {
        console.log('start render canvas')
        let img = new Image()
        img.src = this.displayImageData
        let self = this
        img.onload = function () {
          console.log('canvas image data: ' + self.displayImageData.substring(0, 40))
          let canvas = self.$refs['canvas']
          let ctx = canvas.getContext('2d')
          canvas.width = self.image.width
          canvas.height = self.image.height
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          if (self.image.ballInfos && self.image.ballInfos.length > 0) {
            self.image.ballInfos.forEach(ballInfo => {
              let ball = ballInfo.ball
              let ballRegionImage = new Image()
              ballRegionImage.src = ballInfo.base64
              // ballRegionImage.src = ballInfo.bottomBase64
              ballRegionImage.onload = function () {
                // 全图
                if (self.showInterval) {
                  ctx.drawImage(ballRegionImage, ball.x - ball.radius, ball.y - ball.radius, ballRegionImage.width, ballRegionImage.height)
                }
                // 底部图
                // ctx.drawImage(ballRegionImage, ball.x - ball.radius, ball.y + ball.radius, ballRegionImage.width, ballRegionImage.height)
                ctx.font = "25px sans-serif"
                ctx.strokeStyle = 'red'
                ctx.lineWidth = 2
                // 球半径
                ctx.strokeText('r:' + parseInt(ball.radius), ball.x - ball.radius, ball.y - ball.radius)
                if (ballInfo.outofRange) {
                  ctx.strokeText('超出范围', ball.x - 50, ball.y)
                  return
                }
                ctx.beginPath()
                if (!ballInfo.invalid) {
                  if (ballInfo.isHelp) {
                    ctx.strokeStyle = '#FF9800'
                    ctx.strokeText('可帮助', ball.x - ball.radius + 20, ball.y + ball.radius * 2 + 20)
                  } else {
                    ctx.strokeStyle = '#00ff00'
                    ctx.strokeText('可收取', ball.x - ball.radius + 20, ball.y + ball.radius * 2 + 20)
                  }
                } else {
                  ctx.strokeStyle = 'gray'
                  ctx.strokeText('无效球', ball.x - ball.radius + 20, ball.y + ball.radius * 2 + 20)
                }
                ctx.lineWidth = 5
                ctx.arc(ball.x, ball.y, parseInt(ball.radius), 0, 2 * Math.PI)
                ctx.stroke()
                ctx.strokeRect(ballInfo.ballRegion[0], ballInfo.ballRegion[1], ballInfo.ballRegion[2], ballInfo.ballRegion[3])
                ctx.strokeRect(ballInfo.bottomRegion[0], ballInfo.bottomRegion[1], ballInfo.bottomRegion[2], ballInfo.bottomRegion[3])

                ctx.strokeStyle = 'red'
                ctx.lineWidth = 2
                ctx.font = "20px sans-serif"
                // 判断是否可收取
                ctx.strokeText(parseInt(ballInfo.mainAvg), ball.x - 30, ball.y)
                // 校验是否正常的能量球
                ctx.strokeText(parseInt(ballInfo.recheckAvg), ball.x, ball.y)
                ctx.strokeStyle = '#FF9800'
                // 判断是否帮助收取
                ctx.strokeText(parseInt(ballInfo.avgBottom), ball.x, ball.y + ball.radius + 20)
              }

            })
          }
          // ctx.strokeStyle = "red"
          ctx.stroke()
          console.log('render canvas done, ' + canvas.width + ',' + canvas.height)
        }
      } catch (e) {
        console.log('render canvas failed ' + e)
      }
    },
  },
  computed: {
    displayImageData: function () {
      return this.image.originImageData
    }
  },
  watch: {
    displayImageData: function (v) {
      if (v) {
        console.log("displayImageData: " + v.substring(0, 40))
        this.displayImage()
      }
    }
  },
  template: '<canvas ref="canvas" :style="imageStyle" @click="showInterval=!showInterval"/>'
}

let ColorRangeSlider = {
  mixins: [mixin_methods],
  props: {
    lowerRange: {
      type: String,
      default: '#000000'
    },
    upperRange: {
      type: String,
      default: '#ffffff'
    }
  },
  data: function () {
    return {
      intervalRangeRed: [0, 0],
      intervalRangeGreen: [0, 0],
      intervalRangeBlue: [0, 0],
      showSlider: false,
      intervalByGray: false,
      showEditDialog: false,
      newLowerRange: 0,
      newUpperRange: 0,
      targetEditRange: ''
    }
  },
  methods: {
    fill2: function (o) {
      o = '' + o
      return new Array(3).join(0).substring(o.length) + o
    },
    toHex: function (v) {
      return this.fill2(v.toString(16))
    },
    editRange: function (target) {
      this.targetEditRange = target
      this.newLowerRange = this[target][0]
      this.newUpperRange = this[target][1]
      this.showEditDialog = true
    },
    resetRangeValue: function (v) {
      v = parseInt(v)
      if (v > 255) {
        return 255
      }
      if (v < 0) {
        return 0
      }
      return v
    },
    doConfirmRangeEdit: function () {
      if (this.isNotEmpty(this.targetEditRange)) {
        this.$set(this[this.targetEditRange], 0, this.resetRangeValue(this.newLowerRange))
        this.$set(this[this.targetEditRange], 1, this.resetRangeValue(this.newUpperRange))
      }
    },
    handleDragStart: function () {
      this.$emit('drag-start')
    },
    handleDragEnd: function () {
      this.$emit('drag-end')
    }
  },
  computed: {
    innerLowerRange: function () {
      if (this.intervalByGray) {
        let hex = this.toHex(this.intervalRangeRed[0])
        return ('#' + hex + hex + hex).toUpperCase()
      } else {
        return ('#' + this.toHex(this.intervalRangeRed[0]) + this.toHex(this.intervalRangeGreen[0]) + this.toHex(this.intervalRangeBlue[0])).toUpperCase()
      }
    },
    innerUpperRange: function () {
      if (this.intervalByGray) {
        let hex = this.toHex(this.intervalRangeRed[1])
        return ('#' + hex + hex + hex).toUpperCase()
      } else {
        return ('#' + this.toHex(this.intervalRangeRed[1]) + this.toHex(this.intervalRangeGreen[1]) + this.toHex(this.intervalRangeBlue[1])).toUpperCase()
      }
    }
  },
  filters: {
    hexDisplay: function (value) {
      let o = value.toString(16).toUpperCase()
      return value + '(' + new Array(3).join(0).substring(o.length) + o + ')'
    }
  },
  watch: {
    innerLowerRange: function (v) {
      this.$emit('lower-range-change', v)
    },
    innerUpperRange: function (v) {
      this.$emit('upper-range-change', v)
    },
    intervalByGray: function (v) {
      this.$emit('interval-by-gray', v)
    }
  },
  mounted () {
    let lowerRangeColor = parseInt(this.lowerRange.substring(1), 16)
    let upperRangeColor = parseInt(this.upperRange.substring(1), 16)
    this.$set(this.intervalRangeRed, 0, (lowerRangeColor >> 16) & 0xFF)
    this.$set(this.intervalRangeRed, 1, (upperRangeColor >> 16) & 0xFF)
    this.$set(this.intervalRangeGreen, 0, (lowerRangeColor >> 8) & 0xFF)
    this.$set(this.intervalRangeGreen, 1, (upperRangeColor >> 8) & 0xFF)
    this.$set(this.intervalRangeBlue, 0, lowerRangeColor & 0xFF)
    this.$set(this.intervalRangeBlue, 1, upperRangeColor & 0xFF)
  },
  template: `<div>
    <van-divider content-position="left">
      <label>灰度</label><van-switch v-model="intervalByGray" size="0.8rem" /> 二值化区间&nbsp;&nbsp;<span :style="innerLowerRange | styleTextColor">{{innerLowerRange}}</span>
      &nbsp;&nbsp;-&nbsp;&nbsp;<span :style="innerUpperRange | styleTextColor">{{innerUpperRange}}</span>
      <van-button @click="showSlider=true" size="mini">修改</van-button>
    </van-divider>
    <van-popup v-model="showSlider" position="bottom" :style="{ height: intervalByGray ? \'15%\' : \'30%\' }" :get-container="getContainer">
      <div style="padding: 2rem 2rem;">
        <van-row>
          <van-col @click="editRange(\'intervalRangeRed\')">{{intervalByGray?"FULL":"RED"}}: {{intervalRangeRed[0] | hexDisplay}},{{intervalRangeRed[1] | hexDisplay}}</van-col>
        </van-row>
        <van-row>
          <van-col :span="24">
            <van-slider @drag-start="handleDragStart" @drag-end="handleDragEnd" style="margin: 1rem 0" v-model="intervalRangeRed" range :min="0" :max="255"/>
          </van-col>
        </van-row>
        <template v-if="!intervalByGray">
          <van-row>
            <van-col @click="editRange(\'intervalRangeGreen\')">GREEN: {{intervalRangeGreen[0] | hexDisplay}},{{intervalRangeGreen[1] | hexDisplay}}</van-col>
          </van-row>
          <van-row>
            <van-col :span="24"><van-slider @drag-start="handleDragStart" @drag-end="handleDragEnd" style="margin: 1rem 0" v-model="intervalRangeGreen" range :min="0" :max="255"/></van-col>
          </van-row>
          <van-row>
            <van-col @click="editRange(\'intervalRangeBlue\')">BLUE: {{intervalRangeBlue[0] | hexDisplay}},{{intervalRangeBlue[1] | hexDisplay}}</van-col>
          </van-row>
          <van-row>
            <van-col :span="24"><van-slider @drag-start="handleDragStart" @drag-end="handleDragEnd" style="margin: 1rem 0" v-model="intervalRangeBlue" range :min="0" :max="255"/></van-col>
          </van-row>
        </template>
      </div>
    </van-popup>
    <van-dialog v-model="showEditDialog" title="手动输入" show-cancel-button @confirm="doConfirmRangeEdit" :get-container="getContainer">
      <van-field v-model="newLowerRange" type="number" placeholder="请输入低阈值" label="低阈值" />
      <van-field v-model="newUpperRange" type="number" placeholder="请输入高阈值" label="高阈值" />
    </van-dialog>
  </div>`
}

let BallImageDataVisualTest = {
  mixins: [mixin_methods],
  components: {
    ImageViewer, ColorRangeSlider
  },
  data: function () {
    return {
      imageList: [{ invalid: false, std: 1, median: 1, medianBottom: 1, avg: 1 }],
      offset: 0,
      loading: false,
      intervalByGray: false,
      filter: '',
      filterRange2: '',
      filterRange3: '',
      targetDefaultImage: '0',
      lowerRange: '#ad8500',
      upperRange: '#f4ddff',
    }
  },
  methods: {
    loadMoreImageDatas: function (offset) {
      if (this.loading) {
        return
      }
      if (typeof offset !== 'undefined') {
        this.offset = offset
      }
      if (this.offset < 0) {
        this.offset = 0
      }
      console.log('set loading true')
      this.loading = true
      let self = this
      let timeoutId = setTimeout(function () {
        self.loading = false
      }, 15000)
      $nativeApi.request('loadMoreImageDatas', {
        offset: this.offset,
        filterOption: this.filterOption,
        lowerRange: this.lowerRange,
        upperRange: this.upperRange
      }).then(data => {
        this.imageList = data.ballInfos
        this.offset = data.offset
        this.loading = false
        console.log('set loading false')
        clearTimeout(timeoutId)
      })

      console.log('wait for done')
    },
    handleLowerRange: function (v) {
      this.lowerRange = v
    },
    handleUpperRange: function (v) {
      this.upperRange = v
    },
    handleIntervalByGray: function (v) {
      this.intervalByGray = v
    }
  },
  computed: {
    filterOption: function () {
      let option = {
        invalidOnly: false,
        validOnly: false,
        helpOnly: false,
        collectedOnly: false,
        ownOnly: false,
        notOwn: false,
        intervalByGray: this.intervalByGray
      }
      if (this.filter !== '') {
        option[this.filter] = true
      }
      if (this.filterRange2 !== '') {
        option[this.filterRange2] = true
      }
      if (this.filterRange3 !== '') {
        option[this.filterRange3] = true
      }
      return option
    },
  },
  watch: {
    filterOption: {
      deep: true,
      immediate: true,
      handler: function () {
        this.loadMoreImageDatas(0)
      }
    }
  },
  mounted () {
    this.loadMoreImageDatas()
    $nativeApi.request('loadDefaultHelpRange', {}).then(resp => {
      this.lowerRange = resp.lower
      this.upperRange = resp.upper
    })
  },
  template: `<div style="background: #ffffff;">
      <van-divider content-position="left">
        测试图片 offset: {{offset}} currentLength: {{this.imageList.length}} {{loading}}
      </van-divider>
      <van-divider content-position="left">
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="loadMoreImageDatas(0)">重新开始加载</van-button>
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="loadMoreImageDatas()">加载后20个</van-button>
      </van-divider>
      <van-row type="flex" justify="left">
        <van-col offset="1">
          <van-radio-group v-model="filter" direction="horizontal" icon-size="15">
            <van-radio style="margin-top: 5px;" shape="square" name="">全部</van-radio>
            <van-radio style="margin-top: 5px;" shape="square" name="validOnly">有效</van-radio>
            <van-radio style="margin-top: 5px;" shape="square" name="invalidOnly">无效</van-radio>
            <van-radio style="margin-top: 5px;" shape="square" name="helpOnly">帮收</van-radio>
            <van-radio style="margin-top: 5px;" shape="square" name="collectedOnly">可收</van-radio>
          </van-radio-group>
        </van-col>
      </van-row>
      <color-range-slider :lower-range="lowerRange" :upper-range="upperRange"
        @interval-by-gray="handleIntervalByGray"
        @lower-range-change="handleLowerRange"
        @upper-range-change="handleUpperRange"/>
      <van-row type="flex" justify="left">
        <van-col offset="1">
          <van-radio-group v-model="filterRange2" direction="horizontal" icon-size="15">
            <van-radio style="margin-top: 5px;" shape="square" name="">全部</van-radio>
            <van-radio style="margin-top: 5px;" shape="square" name="ownOnly">自身</van-radio>
            <van-radio style="margin-top: 5px;" shape="square" name="notOwn">非自身</van-radio>
          </van-radio-group>
        </van-col>
      </van-row>
      <van-row type="flex" justify="left">
        <van-col offset="1">
          <van-radio-group v-model="filterRange3" direction="horizontal" icon-size="15">
            <van-radio style="margin-top: 5px;" shape="square" name="">全部</van-radio>
            <van-radio style="margin-top: 5px;" shape="square" name="dayOnly">白天</van-radio>
            <van-radio style="margin-top: 5px;" shape="square" name="nightOnly">夜间</van-radio>
          </van-radio-group>
        </van-col>
      </van-row>
      <van-row type="flex" justify="left">
        <van-col offset="1">
          <van-radio-group v-model="targetDefaultImage" direction="horizontal" icon-size="15">
          <van-radio style="margin-top: 5px;" shape="square" name="0">二值化</van-radio>
            <van-radio style="margin-top: 5px;" shape="square" name="1">灰度</van-radio>
            <van-radio style="margin-top: 5px;" shape="square" name="2">原图</van-radio>
          </van-radio-group>
        </van-col>
      </van-row>
      <van-row type="flex" justify="center" v-for="image in imageList" style="padding: 0.5rem;">
        <van-col span="4" :style="{ color: image.invalid ? \'gray\' : image.isHelp ? \'orange\' : \'green\'}">
        {{image.invalid ? \'无效球\' : \'有效球\'}}
        </van-col>
        <van-col span="6">
          <ImageViewer :image="image" :default-image="targetDefaultImage" />
        </van-col>
        <van-col span="14">
        avg:{{image.avg | toFixed2}} mainAvg:{{image.mainAvg | toFixed2}} avgBottom:{{image.avgBottom | toFixed2}} recheckAvg:{{image.recheckAvg | toFixed2}}
        createTime:{{image.createTime}}
        </van-col>
      </van-row>
      <van-divider content-position="left">
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="loadMoreImageDatas(offset - 100)">offset往前100</van-button>
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="loadMoreImageDatas()">加载后20个</van-button>
      </van-divider>
      <van-overlay :show="loading">
        <van-loading type="spinner" class="wrapper" />
      </van-overlay>
    </div>`
}

let BallDetectVisualTest = {
  mixins: [mixin_methods],
  components: {
    BallDetectCanvasViewer
  },
  data: function () {
    return {
      loading: false,
      image: {
        originImageData: '',
        width: 0,
        height: 0,
        ballInfos: []
      },
      fileIndex: 0,
      ballImagePath: 'test/tree_collect'
    }
  },
  methods: {
    loadLast: function () {
      if (this.loading) {
        return
      }
      this.fileIndex -= 2
      this.doDetectBalls()
    },
    doDetectBalls: function () {
      if (this.loading) {
        return
      }
      this.loading = true
      $nativeApi.request('doDetectBalls', { fileIndex: this.fileIndex++ })
        .then(resp => {
          this.ballImagePath = resp.path
          if (resp.success) {
            console.log('get result success, imageData: ' + resp.originImageData.substring(0, 40))
            this.image.originImageData = resp.originImageData
            this.image.width = resp.size.width
            this.image.height = resp.size.height
            this.image.ballInfos = resp.ballInfos
            console.log('get balls:' + JSON.stringify(resp.ballInfos.map(ballInfo => {
              return {
                ball: ballInfo.ball, isHelp: ballInfo.isHelp,
                isNight: ballInfo.isNight, isOwn: ballInfo.isOwn, avg: ballInfo.avgH,
                avgBottom: ballInfo.avgBottom, recheckAvg: ballInfo.recheckAvg, mainAvg: ballInfo.mainAvg
              }
            })))
          }
          this.loading = false
        })
    },
  },
  mounted () {
    this.doDetectBalls()
  },
  template: `<div>
    <tip-block>请保存需要调试的图片到 {{ballImagePath}} 路径下</tip-block>
    <van-divider content-position="left">
      测试图片&nbsp;&nbsp;&nbsp;<van-button v-if="fileIndex >= 2"size="mini" @click="loadLast">加载上一张</van-button><van-button size="mini" @click="doDetectBalls">加载下一张</van-button>
    </van-divider>
    <BallDetectCanvasViewer :image="image" image-style="width:100%;" />
    <van-overlay :show="loading">
      <van-loading type="spinner" class="wrapper" />
    </van-overlay>
  </div>`
}

let CommonImageTest = {
  mixins: [mixin_methods],
  components: {
    ColorRangeSlider, CanvasViewer, ImageSelectDialog
  },
  data: function () {
    return {
      loading: false,
      timeout: null,
      draging: false,
      dragingTimeout: null,
      intervalByGray: false,
      intervalBase64Only: false,
      showSelectDialog: false,
      rootPath: 'test/visual_test/',
      currentImagePath: '',
      targetDefaultImage: '0',
      lowerRange: '#ad8500',
      upperRange: '#f4ddff',
      image: {
        intervalImageData: '',
        grayImageData: '',
        originImageData: ''
      },
      colorPoint: {
        x: 0, y: 0
      },
      pointColor: {
        rgbColor: '',
        grayColor: ''
      }
    }
  },
  methods: {
    chooseImg: function (e) {
      var files = e.target.files
      if (files && files.length > 0) {
        let reader = new FileReader()
        let self = this
        reader.readAsDataURL(files[0])
        reader.onload = function (e) {
          self.image.intervalImageData = this.result
          self.image.grayImageData = this.result
          self.image.originImageData = this.result
        }
      }
    },
    doLoadImage: function (reloadAll) {
      if (this.loading) {
        return
      }
      if (reloadAll) {
        this.intervalBase64Only = false
      }
      this.loading = true
      $nativeApi.request('loadImageInfo', this.filterOption)
        .then(resp => {
          if (resp.success) {
            if (!this.intervalBase64Only) {
              this.image = resp.image
              this.intervalBase64Only = true
            } else {
              this.image.intervalImageData = resp.image.intervalImageData
            }
          }
          this.loading = false
        })
    },
    handleLowerRange: function (v) {
      this.lowerRange = v
    },
    handleUpperRange: function (v) {
      this.upperRange = v
    },
    handleIntervalByGray: function (v) {
      this.intervalByGray = v
    },
    handleDragingEnd: function (v) {
      let self = this
      if (this.dragingTimeout !== null) {
        clearTimeout(this.dragingTimeout)
      }
      this.dragingTimeout = setTimeout(function () {
        self.draging = false
        self.doLoadImage()
      }, 100)
    },
    handlePointColor: function (payload) {
      this.pointColor.rgbColor = payload.rgbColor
      this.pointColor.grayColor = payload.grayColor
    },
    selectImageFile: function () {
      this.showSelectDialog = true
    },
    choseImage: function (image) {
      this.currentImagePath = image
      this.doLoadImage(true)
    }
  },
  computed: {
    filterOption: function () {
      return {
        intervalByGray: this.intervalByGray,
        lowerRange: this.lowerRange,
        upperRange: this.upperRange,
        intervalBase64Only: this.intervalBase64Only,
        imagePath: this.currentImagePath
      }
    }
  },
  watch: {
    filterOption: {
      deep: true,
      handler: function () {
        if (this.loading) {
          return
        }
        console.log('filterOption changed')
        if (this.timeout != null || this.draging) {
          clearTimeout(this.timeout)
        }
        if (!this.draging) {
          let self = this
          this.timeout = setTimeout(function () {
            // 延迟100毫秒执行加载
            self.doLoadImage()
            self.timeout = null
          }, 100)
        }
      }
    },
    lowerRange: function (v) {
      localStorage.setItem('lowerRange', v)
    },
    upperRange: function (v) {
      localStorage.setItem('upperRange', v)
    }
  },
  mounted() {
    this.lowerRange = localStorage.getItem('lowerRange') || this.lowerRange
    this.upperRange = localStorage.getItem('upperRange') || this.upperRange
  },
  template: `<div>
    <tip-block>请保存需要调试的图片到 test/visual_test/ 路径下</tip-block>
    <van-divider content-position="left">
      测试图片&nbsp;&nbsp;&nbsp;<van-button @click="selectImageFile" size="mini">选择图片</van-button>
    </van-divider>
    <van-row type="flex" justify="left">
      <van-col offset="1">
        <van-radio-group v-model="targetDefaultImage" direction="horizontal" icon-size="15">
        <van-radio style="margin-top: 5px;" shape="square" name="0">二值化</van-radio>
          <van-radio style="margin-top: 5px;" shape="square" name="1">灰度</van-radio>
          <van-radio style="margin-top: 5px;" shape="square" name="2">原图</van-radio>
        </van-radio-group>
      </van-col>
    </van-row>
    <van-divider content-position="left">
      颜色值：{{pointColor.rgbColor}} 灰度值：{{pointColor.grayColor}}
    </van-divider>
    <position-input-field v-model="colorPoint" label="图片取色位置" />
    <color-range-slider :lower-range="lowerRange" :upper-range="upperRange" 
        @drag-start="draging=true" @drag-end="handleDragingEnd" 
        @interval-by-gray="handleIntervalByGray"
        @lower-range-change="handleLowerRange"
        @upper-range-change="handleUpperRange"/>
    <CanvasViewer :image="image" image-style="width:100%;" :default-image="targetDefaultImage" :draw-point="colorPoint" @get-point-color="handlePointColor" />
    <van-overlay :show="loading">
      <van-loading type="spinner" class="wrapper" />
    </van-overlay>
    <ImageSelectDialog v-model="showSelectDialog" @on-chose="choseImage" :root-path="rootPath"/>
  </div>`
}