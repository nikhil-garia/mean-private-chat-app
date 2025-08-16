module.exports = {
    plugins: [
      require('@fullhuman/postcss-purgecss')({
        content: [
          './src/**/*.html',
          './src/**/*.ts', 
          './src/app/pages/**/*.html',  // Scans all HTML files in pages and its subdirectories
          './src/app/pages/**/*.ts', 
        ],
        defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
      })
    ]
  }
  