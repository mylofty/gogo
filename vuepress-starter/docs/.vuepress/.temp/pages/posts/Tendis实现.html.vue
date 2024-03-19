<template><div><nav class="table-of-contents"><ul><li><router-link to="#技术实现原理">技术实现原理</router-link></li><li><router-link to="#读数据">读数据</router-link></li><li><router-link to="#写数据">写数据</router-link></li><li><router-link to="#潜在常见问题">潜在常见问题</router-link><ul><li><router-link to="#_1-缓存与数据库数据一致性">1. 缓存与数据库数据一致性</router-link></li><li><router-link to="#_2-缓存穿透">2. 缓存穿透</router-link></li><li><router-link to="#_3-缓存击穿">3. 缓存击穿</router-link></li><li><router-link to="#_4-缓存雪崩">4. 缓存雪崩</router-link></li></ul></li></ul></nav>
<h1 id="tendis冷热混合存储方案" tabindex="-1"><a class="header-anchor" href="#tendis冷热混合存储方案"><span>Tendis冷热混合存储方案</span></a></h1>
<h2 id="技术实现原理" tabindex="-1"><a class="header-anchor" href="#技术实现原理"><span>技术实现原理</span></a></h2>
<p><img src="/images/tendis.webp" alt="img"></p>
<ol>
<li>采用异步写回方案同步redis中的数据到后端tendisPlus（基于rocksdb）组件。通过订阅redis的aof日志将数据通过kafka异步写到后端tendisPlus</li>
<li>缓存中保存全量key，数据淘汰到tendisPlus仅仅驱逐value，key还在reidis中。当某个key过期时，redis中触发淘汰，会在aof日志中有一条del记录，通过这条记录删除tendisPlus中的值。设置value-eviction-time值为7，表示7天未访问，会被驱逐到tendisPlus中。</li>
</ol>
<h2 id="读数据" tabindex="-1"><a class="header-anchor" href="#读数据"><span>读数据</span></a></h2>
<p><img src="/images/tendis_write.webp" alt="img"></p>
<ol>
<li>从 Redis 读取数据 。</li>
<li>如果命中，那么就将数据返回给应用程序。</li>
<li>如果redis中key不存在，则返回数据不存在</li>
<li>如果未命中(key存在但数据已落地)，阻塞当前客户端， Redis 负责将 Key 从 Tendisplus 中恢复，然后返回给用户。</li>
</ol>
<h2 id="写数据" tabindex="-1"><a class="header-anchor" href="#写数据"><span>写数据</span></a></h2>
<p><img src="/images/tendis_read.webp" alt="img"></p>
<ol>
<li>写入 Redis 缓存，成功后返回。</li>
<li>后台异步回刷，将数据持久化到后端 Tendisplus。</li>
<li>监听写入速度，和redis落地和redis差距很大，则阻塞写</li>
</ol>
<h2 id="潜在常见问题" tabindex="-1"><a class="header-anchor" href="#潜在常见问题"><span>潜在常见问题</span></a></h2>
<h3 id="_1-缓存与数据库数据一致性" tabindex="-1"><a class="header-anchor" href="#_1-缓存与数据库数据一致性"><span>1. 缓存与数据库数据一致性</span></a></h3>
<div class="language-mermaid line-numbers-mode" data-ext="mermaid" data-title="mermaid"><pre v-pre class="language-mermaid"><code><span class="token keyword">sequenceDiagram</span>
title<span class="token operator">:</span> 写策略二：先删缓存再更新数据库
<span class="token keyword">participant</span> 请求A
<span class="token keyword">participant</span> 请求B
<span class="token keyword">participant</span> 缓存
<span class="token keyword">participant</span> 数据库
请求A <span class="token arrow operator">->></span> 缓存<span class="token operator">:</span> <span class="token text string">[A]</span>读缓存 
请求A <span class="token arrow operator">->></span> 缓存<span class="token operator">:</span> <span class="token text string">[A]</span>缓存未命中 
请求B <span class="token arrow operator">->></span> 缓存<span class="token operator">:</span> <span class="token text string">[B]</span>写缓存21 
缓存 <span class="token arrow operator">->></span> 缓存<span class="token operator">:</span> <span class="token text string">[B]</span>更新缓存为21
缓存 <span class="token arrow operator">->></span> 数据库<span class="token operator">:</span> <span class="token text string">[A]</span>异步组件拉取数据库中的20 
缓存 <span class="token arrow operator">->></span> 缓存<span class="token operator">:</span> <span class="token text string">[A]</span>更新缓存为旧值20 
缓存 <span class="token arrow operator">->></span> 数据库<span class="token operator">:</span> <span class="token text string">[B]</span>异步组件将21更新到数据库
缓存 <span class="token arrow operator">--></span> 数据库<span class="token operator">:</span> 缓存旧值20和数据库新值21不一致
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>解决办法：</strong>
如果需要从 Tendisplus 中恢复数据，则请求 A 和 B 都阻塞。当数据恢复后，再唤醒阻塞的请求 A 和 B， 缓存和后端 Tendisplus 最终是一致的。
如果不需要从 Tendisplus 中恢复数据，则请求 A 和 B 肯定是顺序执行的，不会出现不一致的行为。</p>
<h3 id="_2-缓存穿透" tabindex="-1"><a class="header-anchor" href="#_2-缓存穿透"><span>2. 缓存穿透</span></a></h3>
<p>key redis不存在，不存在的key全部请求到db。由于redis保存全量key，不存在则返回不存在了，不会请求到redis</p>
<h3 id="_3-缓存击穿" tabindex="-1"><a class="header-anchor" href="#_3-缓存击穿"><span>3. 缓存击穿</span></a></h3>
<p>热key过期，大量请求落到db
如一致性的解决，当某个key缓存不存在，则会阻塞所有这个key的请求，等从tendisplus中恢复才会继续处理这些请求。</p>
<h3 id="_4-缓存雪崩" tabindex="-1"><a class="header-anchor" href="#_4-缓存雪崩"><span>4. 缓存雪崩</span></a></h3>
<p>缓存雪崩是指某一时刻发生大规模的缓存失效的情况，比如缓存故障或者缓存采用相同的过期时间，缓存在某一时刻同时失效， 请求全部转发给数据库。 TendisX 可以利用 Redis 集群模式实现高可用，即使缓存故障，也可以及时通过备缓存恢复服务。另外 TendisX 的用户请求统一由缓存服务，请求不会转发给后端数据库</p>
</div></template>


