const config = {
  presets: [
    [
      '@babel/env',
      {
        targets: {
          node: '8'
        },
        loose: false
      }
    ]
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    ['@babel/plugin-proposal-pipeline-operator', { proposal: 'smart' }],
    '@babel/plugin-transform-runtime'
  ]
}

module.exports = config
