
const ImageConfig = {
  name: 'ImageConfig',
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        reward_for_plant: '',
        backpack_icon: '',
        sign_reward_icon: '',
        water_icon: '',
        stroll_icon: '',
        watering_cooperation: '',
        magic_species_icon: '',
      },
    }
  },
  methods: {
    onConfigLoad (config) {
      let imageConfig = config.image_config
      Object.keys(this.configs).forEach(key => {
        this.$set(this.configs, key, imageConfig[key])
      })
      this.$store.commit('setExtendPrepend', 'image')
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
    <tip-block style="margin: 0.5rem">区域输入框左滑可以通过滑块输入数值，也可以通过取色工具获取目标区域信息，大图请通过加载文件方式修改否则手机端无法完整复制：<van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="openGrayDetector">打开取色工具</van-button></tip-block>
    <base64-image-viewer title="校验‘森林赠礼’按钮" v-model="configs.reward_for_plant"/>
    <base64-image-viewer title="校验‘背包’按钮" v-model="configs.backpack_icon"/>
    <base64-image-viewer title="校验‘奖励’按钮" v-model="configs.sign_reward_icon"/>
    <base64-image-viewer title="校验‘浇水’按钮" v-model="configs.water_icon"/>
    <base64-image-viewer title="校验‘逛一逛’按钮" v-model="configs.stroll_icon"/>
    <base64-image-viewer title="校验‘合种’按钮" v-model="configs.watering_cooperation"/>
    <base64-image-viewer title="校验‘神奇物种’按钮" v-model="configs.magic_species_icon"/>
  </div>`
}
