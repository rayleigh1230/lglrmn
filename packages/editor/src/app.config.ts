export default {
  pages: [
    'pages/loadouts/index',
    'pages/ship-list/index',
    'pages/blueprint-design/index',
    'pages/enhance/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#0a0e1a',
    navigationBarTitleText: '蓝图设计',
    navigationBarTextStyle: 'white'
  },
  // H5 入口路径配置
  h5: {
    router: {
      mode: 'browser'
    }
  }
};
