module.exports = {
  // Site metadata
  name: 'Anteo AS',
  url: 'https://anteo.no',
  
  // GitHub Pages settings
  githubRepo: 'anteoas/website',
  customDomain: process.env.CUSTOM_DOMAIN || false,
  
  // Development
  devPort: 3000,
  
  // Features
  features: {
    imageOptimization: true,
    linkChecker: true,
    sitemap: false  // TODO: implement
  },
  
  // Content types that generate pages
  renders: {
    page: {
      generateUrl: (item, langPrefix) => `${langPrefix}/${item.slug}.html`,
      getTemplate: (item) => item.template || 'page'
    },
    
    article: {
      generateUrl: (item, langPrefix) => {
        const date = new Date(item.date);
        const year = date.getFullYear();
        const slug = item.slug.replace(/^\d{4}-\d{2}-\d{2}-/, '');
        return `${langPrefix}/news/${year}/${slug}.html`;
      },
      getTemplate: () => 'news',
      backLink: {
        url: '/news.html',
        textKey: 'navigation.backToNews'
      }
    },
    
    product: {
      generateUrl: (item, langPrefix) => {
        const category = item.category;
        if (!category) {
          console.warn(`Product ${item.slug} missing category`);
          return `${langPrefix}/products/${item.slug}.html`;
        }
        return `${langPrefix}/products/${category}/${item.slug}.html`;
      },
      getTemplate: () => 'product',
      backLink: {
        url: '/products.html',
        textKey: 'navigation.backToProducts'
      }
    }
    
    // Note: 'person' type is not listed here, so it won't generate pages
  }
};

