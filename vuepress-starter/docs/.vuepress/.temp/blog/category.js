export const categoriesMap = {"category":{"/":{"path":"/category/","map":{"Go":{"path":"/category/go/","indexes":[0,1,2,3,4]},"CategoryB":{"path":"/category/categoryb/","indexes":[4]},"存储":{"path":"/category/存储/","indexes":[5,6,7]},"vue":{"path":"/category/vue/","indexes":[8]}}}},"tag":{"/":{"path":"/tag/","map":{"Go":{"path":"/tag/go/","indexes":[0,1,2,3,4]},"缓存":{"path":"/tag/缓存/","indexes":[5,7]},"vue":{"path":"/tag/vue/","indexes":[8]},"cos":{"path":"/tag/cos/","indexes":[6]}}}}};

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
  if (__VUE_HMR_RUNTIME__.updateBlogCategory)
    __VUE_HMR_RUNTIME__.updateBlogCategory(categoriesMap);
}

if (import.meta.hot)
  import.meta.hot.accept(({ categoriesMap }) => {
    __VUE_HMR_RUNTIME__.updateBlogCategory(categoriesMap);
  });

