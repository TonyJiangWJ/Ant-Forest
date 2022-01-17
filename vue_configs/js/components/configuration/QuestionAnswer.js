const MarkdownPreview = {
  name: 'MarkdownPreview',
  props: {
    text: String
  },
  data() {
    return {
      markdownHtml: Mdjs.md2html(this.text)
    }
  },
  watch: {
    text: function () {
      this.markdownHtml = Mdjs.md2html(this.text)
    }
  },
  template: `
    <p v-html="markdownHtml" class="markdown-preview"></p>
  `
}

const QueryLimit = {
  name: 'QueryLimit',
  mixins: [mixin_common],
  components: { MarkdownPreview },
  props: {
    targetUrl: String
  },
  data() {
    return {
      accessToken: '',
      showDialog: false,
      teachForAccessToken: '### 获取AccessToken方式\r\n\
       - 登录Gitee账号，点击头像进入`设置`；\r\n\
       - 在 `安全设置` 找到 `私人令牌`；\r\n\
       - 点击 `生成新令牌` 输入描述信息；\r\n\
       - 权限可以仅勾选 `issues`；\r\n\
       - 点击 `提交` 弹窗中根据提示输入登录密码，即可生成私人令牌；\r\n\
       - 私人令牌属于密码其他人获取后可以以你的身份发布任何issue请妥善保管不要共享到其他地方。\r\n\
       - 脚本中提交后只会保存在当前webview的localStorage中，清除缓存后丢失，请自行妥善保存。'
    }
  },
  methods: {
    setToken: function () {
      if (this.accessToken) {
        localStorage.setItem('accessToken', this.accessToken)
        this.$emit('requery', { accessToken: this.accessToken })
      }
    },
    jumpToUrl: function () {
      $app.invoke('openUrl', { url: this.targetUrl })
    },
  },
  template: `
    <div style="padding: 2rem">
      <markdown-preview text="## Gitee 限流 请稍后再访问 "  />
      <div style="display:flex;justify-content: center;">
        <van-button @click="showDialog=true">输入accessToken</van-button>
      </div>
      <markdown-preview :text="teachForAccessToken" style="margin-top:1rem" />
      <div style="display:flex;justify-content: center;">
        <van-button @click="jumpToUrl">直接访问网页版</van-button>
      </div>
      <van-dialog v-model="showDialog" show-cancel-button @confirm="setToken" :get-container="getContainer" title="输入AccessToken">
        <van-field v-model="accessToken" placeholder="请输入accessToken" label="accessToken" />
      </van-dialog>
    </div>
  `

}

const QuestionAnswer = {
  name: 'QuestionAnswer',
  components: { MarkdownPreview, QueryLimit },
  data() {
    return {
      pager: {
        currentPage: 1,
        size: 20
      },
      queryResult: [],
      loading: true,
      accessToken: '',
      noAccessPerm: false,
    }
  },
  filters: {
    dateStr: function (value) {
      // console.log('date: ', value)
      return formatDate(new Date(value))
    }
  },
  methods: {
    doQuery: function () {
      this.loading = false
      let self = this
      axios.get('https://gitee.com/api/v5/repos/TonyJiangWJ/Ant-Forest/issues?state=all&sort=created&direction=desc&labels=question' + `&page=${this.pager.currentPage}&pre_page=${this.pager.size}&access_token=${this.accessToken}`)
      .then(function (response) {
        self.queryResult = response.data
        self.loading = false
        self.noAccessPerm = false
      }).catch(e => {
        console.error('请求失败', e)
        self.noAccessPerm = true
        self.loading = false
        this.$toast('accessToken 无效 被限流啦')
      })
    },
    toLinkIssue: function (url) {
      $app.invoke('openUrl', { url: url })
    },
    toReadme: function () {
      this.$router.push('/readme')
    },
    queryWithAccessToken: function (payload) {
      this.accessToken = payload.accessToken
      this.doQuery()
    }
  },
  mounted() {
    this.accessToken = localStorage.getItem('accessToken')
    this.doQuery()
  },
  template: `
    <div>
      <query-limit v-if="noAccessPerm" @requery="queryWithAccessToken" target-url="https://gitee.com/TonyJiangWJ/Ant-Forest/issues?label_ids=63160213" />
      <div v-for="(issue,idx) in queryResult" :key="issue.title" style="padding: 2rem;">
        <h4>{{issue.title}}</h4>
        <div style="display:inline">
        <label>{{issue.created_at | dateStr}}</label>
        <img style="width: 1.5rem;height:1.5rem;float: right;" @click="toLinkIssue(issue.html_url)" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABmJLR0QA/wD/AP+gvaeTAAABn0lEQVRoge2ZsUoDMRiAP8UncBbB5+igPfEFnO0DSBeLix1EEQenrk7SwcHdUZDqG7go0kVcHH0BoTpYscYmprk/+SPkg0CTu/z5P+6a3F2gUCgU/hNzHudUQAtYqjHOhlHvAyuefeeB0fj3HbATksAR8C5QTO4D49y4bG1UwP7frnngEmkly8Ifa74Ljk7LRv0Cx6WdkWNg0XKsAjYtx0aWdicDft6f7ZAgM9Ihwn8kNR2gF9o5FxGbxKVvgBxEbBJd4Mo3iLaIS+JklkCaImISoCciKgE6IuISkF4kigS4V3ZpQiRegYeJ+lPIwJIru23F3qsR0xspEVUJkBFRl4D6IllIQD0RKYm20X9gOzHG9BttinUhLaIiAbIiahIgtyBuM11i19IujtQVuQZejLYuiSRATmQINPmWSXI7TSL5rDUE1vkUOhWM64X0Q+PjuCRH+1VXjCKSG0UkN1yzlvnBuAG8RcxlGg2jHvQRu4/MJo9kOQsRWcsgcbOshogAHGaQ/Fc5cCXqsxnaBLb4vfGTimfgHLhVGr9QKBQi8AFKqQNQYvMMrgAAAABJRU5ErkJggg=="/>
        </div>
        <markdown-preview :text="issue.body" />
      </div>
      <van-overlay :show="loading" z-index="1000">
        <div class="wrapper">
          <van-loading size="4rem" vertical>加载中...</van-loading>
        </div>
      </van-overlay>
    </div>
  `
}

const Readme = {
  name: 'Readme',
  components: { MarkdownPreview, QueryLimit },
  data() {
    return {
      base64Content: '',
      accessToken: '',
      noAccessPerm: false,
      loading: true,
    }
  },
  computed: {
    markdownContent: function () {
      let content = Base64.decode(this.base64Content)
      // console.log(content)
      content = content.replace(/\(\.([^\)]+)\)/g, '(https://gitee.com/TonyJiangWJ/Ant-Forest/raw/master/$1)')
      // console.log(content)
      return content
    }
  },
  methods: {
    getReadme: function () {
      this.loading = true
      axios.get(`https://gitee.com/api/v5/repos/TonyJiangWJ/Ant-Forest/readme?access_token=${this.accessToken}`).then(response => {
        return Promise.resolve(response.data)
      }).catch(e => {
        this.noAccessPerm = true
        this.$toast('accessToken 无效 被限流啦')
        this.loading = false
        return Promise.reject('限流或请求失败')
      }).then(resp => {
        this.loading = false
        this.noAccessPerm = false
        this.base64Content = resp.content
      })
    },
    queryWithAccessToken: function (payload) {
      this.accessToken = payload.accessToken
      this.getReadme()
    }
  },
  mounted() {
    this.accessToken = localStorage.getItem('accessToken')
    this.getReadme()
  },
  template: `
  <div>
    <query-limit v-if="noAccessPerm" @requery="queryWithAccessToken"  target-url="https://gitee.com/TonyJiangWJ/Ant-Forest" />
    <div v-else style="padding: 2rem">
      <markdown-preview :text="markdownContent"/>
    </div>

    <van-overlay :show="loading" z-index="1000">
      <div class="wrapper">
        <van-loading size="4rem" vertical>加载中...</van-loading>
      </div>
    </van-overlay>
  </div>
  `
}