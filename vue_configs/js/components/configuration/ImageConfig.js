
const ImageConfig = {
  name: 'ImageConfig',
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        reward_for_plant: '',
        backpack_icon: '',
        sign_reward_icon: '',
      },
    }
  },
  methods: {
    onConfigLoad (config) {
      let imageConfig = config.image_config
      Object.keys(this.configs).forEach(key => {
        this.$set(this.configs, key, imageConfig[key])
      })
    },
    doSaveConfigs () {
      let newConfigs = this.filterErrorFields(this.configs)
      $app.invoke('saveExtendConfigs', { configs: newConfigs, prepend: 'image' })
    },
    openGrayDetector: function () {
      $app.invoke('openGrayDetector', {})
    },
  },
  template: `
  <div>
    <tip-block style="margin: 0.5rem">区域输入框左滑可以通过滑块输入数值，也可以通过取色工具获取目标区域信息：<van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="openGrayDetector">打开取色工具</van-button></tip-block>
    <base64-image-viewer title="校验‘森林赠礼’按钮" v-model="configs.reward_for_plant"/>
    <base64-image-viewer title="校验‘背包’按钮" v-model="configs.backpack_icon"/>
    <base64-image-viewer title="校验‘奖励’按钮" v-model="configs.sign_reward_icon"/>
  </div>`
}
