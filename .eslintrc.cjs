// ESLint配置文件
// ESLint是一个代码质量检查工具，用于检查代码中的错误和潜在问题
module.exports = {
  // root: true 表示这是根配置文件，不会继承父级目录的配置
  root: true,
  // env 配置指定代码运行的环境，不同环境有不同的全局变量
  env: {
    // browser: true 表示代码运行在浏览器环境中，支持浏览器全局变量如window、document等
    browser: true,
    // es2021: true 表示支持ES2021语法特性
    es2021: true,
    // node: true 表示代码运行在Node.js环境中，支持Node.js全局变量如require、module等
    node: true
  },
  // extends 配置继承的规则集
  extends: [
    // 'eslint:recommended' 启用ESLint推荐的基础规则
    'eslint:recommended',
    // 'plugin:vue/vue3-recommended' 启用Vue 3推荐的规则
    'plugin:vue/vue3-recommended',
    // '@vue/eslint-config-typescript' 启用Vue的TypeScript配置
    '@vue/eslint-config-typescript',
    // '@vue/eslint-config-prettier' 禁用与Prettier冲突的ESLint规则
    '@vue/eslint-config-prettier'
  ],
  // parserOptions 配置解析器选项
  parserOptions: {
    // ecmaVersion: 'latest' 使用最新的ECMAScript版本
    ecmaVersion: 'latest',
    // parser: '@typescript-eslint/parser' 使用TypeScript解析器
    parser: '@typescript-eslint/parser'
  },
  // plugins 配置使用的插件
  plugins: [
    // 'vue' Vue插件，用于检查Vue语法
    'vue',
    // '@typescript-eslint' TypeScript插件，用于检查TypeScript语法
    '@typescript-eslint',
    // 'prettier' Prettier插件，用于将Prettier错误作为ESLint错误显示
    'prettier'
  ],
  // rules 配置具体的规则
  rules: {
    // 'prettier/prettier': 'error' 将Prettier格式化错误视为ESLint错误
    'prettier/prettier': 'error'
  }
}
