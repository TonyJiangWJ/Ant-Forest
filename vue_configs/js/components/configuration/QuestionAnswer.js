const MarkdownPreview = {
  name: 'MarkdownPreview',
  props: {
    text: String
  },
  data() {
    return {
    }
  },
  computed: {
    markdownHtml: function () {
      try {
        return Mdjs.md2html(this.text).replace(/href="#[^"]+"/g, 'href="javascript:void(0);"')
      } catch (e) {
        return this.text
      }
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

const QuestionPreview = {
  name: 'QuestionPreview',
  components: { MarkdownPreview },
  props: {
    title: String,
    content: String,
    htmlUrl: String,
    createTime: String,
  },
  filters: {
    dateStr: function (value) {
      // console.log('date: ', value)
      return formatDate(new Date(value))
    }
  },
  methods: {
    toLinkIssue: function (url) {
      console.log('跳转目标URL:', url)
      $app.invoke('openUrl', { url: url })
    },
  },
  template: `
  <div>
    <h4>{{title}}</h4>
    <div style="display:inline">
    <label>{{createTime | dateStr}}</label>
    <img style="width: 1.5rem;height:1.5rem;float: right;" @click="toLinkIssue(htmlUrl)" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABmJLR0QA/wD/AP+gvaeTAAABn0lEQVRoge2ZsUoDMRiAP8UncBbB5+igPfEFnO0DSBeLix1EEQenrk7SwcHdUZDqG7go0kVcHH0BoTpYscYmprk/+SPkg0CTu/z5P+6a3F2gUCgU/hNzHudUQAtYqjHOhlHvAyuefeeB0fj3HbATksAR8C5QTO4D49y4bG1UwP7frnngEmkly8Ifa74Ljk7LRv0Cx6WdkWNg0XKsAjYtx0aWdicDft6f7ZAgM9Ihwn8kNR2gF9o5FxGbxKVvgBxEbBJd4Mo3iLaIS+JklkCaImISoCciKgE6IuISkF4kigS4V3ZpQiRegYeJ+lPIwJIru23F3qsR0xspEVUJkBFRl4D6IllIQD0RKYm20X9gOzHG9BttinUhLaIiAbIiahIgtyBuM11i19IujtQVuQZejLYuiSRATmQINPmWSXI7TSL5rDUE1vkUOhWM64X0Q+PjuCRH+1VXjCKSG0UkN1yzlvnBuAG8RcxlGg2jHvQRu4/MJo9kOQsRWcsgcbOshogAHGaQ/Fc5cCXqsxnaBLb4vfGTimfgHLhVGr9QKBQi8AFKqQNQYvMMrgAAAABJRU5ErkJggg=="/>
    </div>
    <markdown-preview :text="content" />
  </div>
  `
}

const QuestionAnswer = {
  name: 'QuestionAnswer',
  components: { QueryLimit, QuestionPreview },
  data() {
    return {
      pager: {
        currentPage: 1,
        size: 20
      },
      queryResult: [],
      adbUseDoc: {
        title: '',
        content: '',
        htmlUrl: '',
        createTime: ''
      },
      loading: true,
      contentFrom: '',
      accessToken: '',
      noAccessPerm: false,
    }
  },
  methods: {
    doQuery: function () {
      this.loading = true
      API.get('https://gitee.com/api/v5/repos/TonyJiangWJ/Ant-Forest/issues?state=all&sort=created&direction=desc&labels=question' + `&page=${this.pager.currentPage}&pre_page=${this.pager.size}&access_token=${this.accessToken}`)
      .then(resp => {
        this.queryResult = resp
        return Promise.resolve(true)
      }).catch(e => {
        console.error('请求失败', e)
        return Promise.resolve(false)
      }).then(success => {
        if (success) {
          this.loading = false
          this.noAccessPerm = false
          this.contentFrom = 'Gitee'
          return Promise.resolve(true)
        } else {
          return this.doQueryGithubIssue()
        }
      }).then(_ => {
        this.doGetAdbUseDoc()
      })
    },
    doQueryGithubIssue: function () {
      return API.get('https://api.github.com/repos/TonyJiangWJ/Ant-Forest/issues?labels=documentation').then(resp => {
        this.queryResult = resp
        this.contentFrom = 'Github'
        return Promise.resolve(true)
      }).catch(e => {
        console.error('请求失败', e)
        this.$toast('accessToken 无效 被限流啦')
        return Promise.resolve(false)
      }).then(success => {
        this.noAccessPerm = !success
        return Promise.resolve(success)
      })
    },
    doGetAdbUseDoc: function () {
      API.get('https://api.github.com/repos/TonyJiangWJ/AutoScriptBase/contents/resources/doc/ADB%E6%8E%88%E6%9D%83%E8%84%9A%E6%9C%AC%E8%87%AA%E5%8A%A8%E5%BC%80%E5%90%AF%E6%97%A0%E9%9A%9C%E7%A2%8D%E6%9D%83%E9%99%90.md?ref=master')
      .then(resp => {
        this.adbUseDoc.title = 'ADB授权脚本自动开启无障碍权限'
        this.adbUseDoc.content = Base64.decode(resp.content)
        this.adbUseDoc.createTime = '2021-01-26T11:08:03Z'
        this.adbUseDoc.htmlUrl = resp.html_url
        return Promise.resolve(true)
      }).catch(e => {
        return Promise.resolve(false)
      }).then(_ =>
        this.loading = false
      )
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
      <div v-if="!loading && !noAccessPerm" style="padding: 2rem 2rem 0 2rem;font-size: 0.5rem;">来源：{{contentFrom}}</div>
      <query-limit v-if="noAccessPerm" @requery="queryWithAccessToken" target-url="https://gitee.com/TonyJiangWJ/Ant-Forest/issues?label_ids=63160213" />
      <div v-for="(issue,idx) in queryResult" :key="issue.title" style="padding: 2rem;">
        <question-preview :title="issue.title" :content="issue.body" :create-time="issue.created_at" :html-url="issue.html_url"/>
      </div>
      <div style="padding: 2rem" v-if="adbUseDoc.title">
        <question-preview :title="adbUseDoc.title" :content="adbUseDoc.content" :create-time="adbUseDoc.createTime" :html-url="adbUseDoc.htmlUrl"/>
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
      contentFrom: ''
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
      API.get(`https://gitee.com/api/v5/repos/TonyJiangWJ/Ant-Forest/readme?access_token=${this.accessToken}`).then(resp => {
        this.base64Content = resp.content
        this.contentFrom = 'Gitee'
        return Promise.resolve(true)
      }).catch(e => {
        return Promise.resolve(false)
      }).then(success => {
        if (success) {
          this.loading = false
          this.noAccessPerm = false
        } else {
          console.log('请求gitee失败，尝试请求github')
          this.getGithubReadme()
        }
      })
    },
    getGithubReadme: function () {
      API.get(`https://api.github.com/repos/TonyJiangWJ/Ant-Forest/contents/README.md?ref=master`)
      .then(resp => {
        this.noAccessPerm = false
        this.base64Content = resp.content
        this.contentFrom = 'Github'
        return Promise.resolve({})
      })
      .catch(e => {
        this.noAccessPerm = true
        this.$toast('accessToken 无效 被限流啦')
        return Promise.resolve({})
      })
      .then(r => {
        this.loading = false
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
    <div v-if="!loading && !noAccessPerm" style="padding: 2rem 2rem 0 2rem; font-size: 0.5rem">来源：{{contentFrom}}</div>
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