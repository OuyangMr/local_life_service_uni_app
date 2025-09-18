module.exports = {
  launch: {
    headless: process.env.CI === 'true', // 在CI环境中使用无头模式
    devtools: false,
    defaultViewport: {
      width: 375,  // 模拟移动设备屏幕
      height: 667
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  },
  browser: 'chromium',
  exitOnPageError: false, // 不在页面错误时退出
  server: {
    command: 'npm run dev:h5',
    port: 8080,
    launchTimeout: 60000,
    usedPortAction: 'ignore',
    debug: process.env.DEBUG === 'true'
  }
};
