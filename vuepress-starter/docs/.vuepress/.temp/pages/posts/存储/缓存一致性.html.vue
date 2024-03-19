<template><div><p>[toc]</p>
<h1 id="一、缓存常见问题" tabindex="-1"><a class="header-anchor" href="#一、缓存常见问题"><span>一、缓存常见问题</span></a></h1>
<ol>
<li>缓存与数据库数据一致性</li>
<li>缓存雪崩</li>
<li>缓存击穿</li>
<li>缓存穿透</li>
</ol>
<h1 id="二、缓存一致性问题" tabindex="-1"><a class="header-anchor" href="#二、缓存一致性问题"><span>二、缓存一致性问题</span></a></h1>
<p>缓存一致性问题的产生主要是因为请求需要事务地处理缓存和数据库。但实际操作中，难以保证事务性。</p>
<ol>
<li>操作隔离性：并发请求时，无法保证多个请求在处理缓存和处理数据库两个步骤上的时序。</li>
<li>操作原子性：即使单个请求，也无法保证处理缓存和处理数据库的原子性，可能存在某个操作失败的情况</li>
</ol>
<h2 id="_2-1-缓存更新策略" tabindex="-1"><a class="header-anchor" href="#_2-1-缓存更新策略"><span>2.1 缓存更新策略</span></a></h2>
<p>根据缓存更新策略，可以分为以下三类</p>
<ol>
<li>旁路缓存(cache aside)</li>
<li>写穿(write/read through)</li>
<li>异步写回(write behind / write back)
接下来根据不同的更新策略来分析产生一致性问题的原因和解决办法</li>
</ol>
<h2 id="_2-2-旁路缓存-cache-aside" tabindex="-1"><a class="header-anchor" href="#_2-2-旁路缓存-cache-aside"><span>2.2 旁路缓存(cache aside)</span></a></h2>
<p><strong>旁路缓存是开发中最常用的缓存使用策略</strong>，这个策略是以数据库中的数据为主，缓存只是按需从数据库中加载。该策略缓存中的数据只读，不作修改操作（当数据有修改，也仅仅删除缓存中的数据），因此也称<strong>只读模式</strong>
读写策略如下：
读策略：</p>
<ol>
<li>读缓存，</li>
<li>缓存中存在数据，直接返回</li>
<li>缓存中不存在该数据，从数据库中查询</li>
<li>将查询到的数据写回缓存，并返回给用户</li>
</ol>
<p>写策略一（<strong>常用</strong>）：</p>
<ol>
<li>更新数据库中的数据</li>
<li>删除缓存中的数据</li>
</ol>
<p>写策略二：</p>
<ol>
<li>删除缓存中的数据</li>
<li>更新数据库中的数据</li>
<li>延时之后再删除缓存中的数据</li>
</ol>
<p>使用旁路缓存策略，数据库中的数据是最终版本，当缓存崩溃或者缓存中的数据被淘汰后，有读请求时数据将从数据库中加载到缓存，继续加速读请求。然而，由于写策略分为两步，故无法保证原子性，其中便可能导致数据的不一致</p>
<div class="language-mermaid line-numbers-mode" data-ext="mermaid" data-title="mermaid"><pre v-pre class="language-mermaid"><code><span class="token keyword">sequenceDiagram</span>
title<span class="token operator">:</span> 写策略一：先更新数据库再删除缓存
<span class="token keyword">participant</span> 请求A
<span class="token keyword">participant</span> 请求B
<span class="token keyword">participant</span> 缓存
<span class="token keyword">participant</span> 数据库
请求A <span class="token arrow operator">-->></span> 缓存<span class="token operator">:</span> 1.缓存未命中 <span class="token text string">[A]</span>
请求A <span class="token arrow operator">-->></span> 数据库<span class="token operator">:</span> 2.读取数据库中的值20 <span class="token text string">[A]</span>
请求B <span class="token arrow operator">->></span> 数据库<span class="token operator">:</span> 3.修改数据为21 <span class="token text string">[B]</span>
请求B <span class="token arrow operator">->></span> 缓存<span class="token operator">:</span> 4.删除缓存 <span class="token text string">[B]</span>
请求A <span class="token arrow operator">-->></span> 缓存<span class="token operator">:</span> 5.回写数据库中读取的值20到缓存 <span class="token text string">[A]</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>该读写顺序将会导致数据长期不一致，然而，该情况发生的概率很低，A读取数据库之后，B请求需要写数据库，A需要写缓存，而写缓存数据远远快于写数据库，所以正常情况下，第5步都会快于第3步完成，所以删除缓存应该会再最后执行
以上展示的是数据一开始不存在缓存时会导致的数据不一致。当数据一开始就存在缓存中，那么就会导致B写请求已经修改了数据库了，但是A读请求仍然读到旧数据，会导致短暂的数据不一致。要解决这个办法，只有先删除缓存，如策略二，防止脏读。
虽然该策略存在一定的问题，但是由于实现简单，便于落地，大部分场景均使用本策略</p>
<div class="language-mermaid line-numbers-mode" data-ext="mermaid" data-title="mermaid"><pre v-pre class="language-mermaid"><code><span class="token keyword">sequenceDiagram</span>
title<span class="token operator">:</span> 写策略二：先删缓存再更新数据库
<span class="token keyword">participant</span> 请求A
<span class="token keyword">participant</span> 请求B
<span class="token keyword">participant</span> 缓存
<span class="token keyword">participant</span> 数据库
请求A <span class="token arrow operator">-->></span> 缓存<span class="token operator">:</span> 1.删除缓存 <span class="token text string">[A]</span>
请求B <span class="token arrow operator">->></span> 缓存<span class="token operator">:</span> 2.缓存未命中 <span class="token text string">[A]</span>
请求B <span class="token arrow operator">->></span> 数据库<span class="token operator">:</span> 3.读取数据库中的20 <span class="token text string">[B]</span>
请求B <span class="token arrow operator">->></span> 缓存<span class="token operator">:</span> 4.将读取的数据库值20回写缓存 <span class="token text string">[B]</span>
请求A <span class="token arrow operator">-->></span> 数据库<span class="token operator">:</span> 5.修改数据库中数据为21 <span class="token text string">[A]</span>
<span class="token keyword">note over</span> 请求A,数据库<span class="token operator">:</span> 增加延时双删
请求A <span class="token arrow operator">-->></span> 缓存<span class="token operator">:</span> 6.再次删除缓存 <span class="token text string">[A]</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>先删除缓存后更新数据库，由于修改数据库耗时更长，所以很可能出现2，3先执行。导致数据库中的数据长期不一致。该方案的解决办法是延时双删，但最后一次删除的时间比较难控制</p>
<p>该策略不会有脏读的问题，只是难以评估延时删除的时延，通常需要大于B请求读取数据库+写入缓存的时间</p>
<p><strong>除此之外，导致不一致的情况还可能是数据库和缓存操作中有一个失败：</strong>
<img src="@source/posts/存储/img/缓存一致性.jpeg" alt="img"></p>
<h2 id="_2-3-写穿-write-through" tabindex="-1"><a class="header-anchor" href="#_2-3-写穿-write-through"><span>2.3 写穿(write through)</span></a></h2>
<p>该策略的核心是用户仅操作缓存，不直接操作数据库。数据库仅由缓存组件来操作。同时，该方案是同步操作缓存和数据库，即写请求在写完缓存之后，需要缓存组件同步写回数据库，故也称为<strong>同步直写</strong></p>
<p>读策略：</p>
<ol>
<li>读缓存</li>
<li>缓存中存在数据，直接返回</li>
<li>缓存中不存在该数据，从数据库中查询</li>
<li>将查询到的数据写回缓存，并返回给用户</li>
</ol>
<p>写操作：</p>
<ol>
<li>先查询要写入的数据是否存在缓存中</li>
<li>当数据已经存在，更新缓存，缓存组件同步更新到数据库，数据库更新成功才返回给用户</li>
<li>当数据不存在，方案一：write allocate 写入缓存，缓存组件同步更新到数据库。方案二：no write allocate 仅写入数据库（<strong>更常用，可加速写</strong>）</li>
</ol>
<div class="language-mermaid line-numbers-mode" data-ext="mermaid" data-title="mermaid"><pre v-pre class="language-mermaid"><code><span class="token keyword">sequenceDiagram</span>
title<span class="token operator">:</span> 同步直写
<span class="token keyword">participant</span> 客户端
<span class="token keyword">participant</span> 缓存
<span class="token keyword">participant</span> 数据库
客户端 <span class="token arrow operator">-->></span> 缓存<span class="token operator">:</span> 1.写缓存
缓存 <span class="token arrow operator">-->></span> 缓存<span class="token operator">:</span> 2.缓存已存在该key，更新key数据
缓存 <span class="token arrow operator">-->></span> 数据库<span class="token operator">:</span> 3.缓存组件将数据写入数据库
数据库 <span class="token arrow operator">-->></span> 缓存<span class="token operator">:</span> 4.写数据库成功
缓存 <span class="token arrow operator">-->></span> 客户端<span class="token operator">:</span> 5.写缓存成功
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>同步直写在写缓存之后，需要同步写入数据库，所以即使是缓存宕机，数据也不会丢失，不过，该操作会降低写请求的响应速度，增加了缓存的响应延迟。
上述方案建立在缓存组件有挂载后端数据库，而不是通过proxy代理方式来操作，proxy代理方案就要考虑网络，写操作之前先查询是否在缓存中耗时更大，故proxy方式更时候write allocate，省去查询缓存，直接写缓存</p>
<h2 id="_2-4-异步写回-write-behind" tabindex="-1"><a class="header-anchor" href="#_2-4-异步写回-write-behind"><span>2.4 异步写回(write behind)</span></a></h2>
<p>该方案和write through相比，用户写缓存后，不直接操作数据库，而是异步更新数据库。
先将数据写入到缓存，然后插入到操作队列中，定期flush到数据库</p>
<p>该方案优先考虑了响应延迟，针对写请求也有加速，适用于写频繁的场景。然而异步操作会导致数据库和缓存存在一定的时延，当缓存崩溃，数据还没来得及从操作队列刷新到数据库，则会有数据丢失的风险。</p>
<h1 id="三、缓存雪崩、击穿、穿透问题" tabindex="-1"><a class="header-anchor" href="#三、缓存雪崩、击穿、穿透问题"><span>三、缓存雪崩、击穿、穿透问题</span></a></h1>
<h2 id="_3-1-缓存雪崩" tabindex="-1"><a class="header-anchor" href="#_3-1-缓存雪崩"><span>3.1 缓存雪崩</span></a></h2>
<p>缓存层无法处理请求，导致请求都落到数据库层</p>
<ol>
<li>缓存中有大量数据过期，导致缓存无法处理请求
解决办法：a：过期时间增加随机数，打散key的淘汰时间 b：服务降级，核心数据继续访问，非核心数据直接返回空</li>
<li>缓存服务期宕机，导致缓存无法处理请求
解决办法：a：服务熔断 b：服务限流</li>
</ol>
<h2 id="_3-2-缓存击穿" tabindex="-1"><a class="header-anchor" href="#_3-2-缓存击穿"><span>3.2 缓存击穿</span></a></h2>
<p>某个访问非常频繁的热点数据，无法在缓存中处理，导致该数据的大量请求，一下子发送到了数据库</p>
<ol>
<li>热点数据过期
解决办法：热点数据不设置过期</li>
</ol>
<h2 id="_3-3-缓存穿透" tabindex="-1"><a class="header-anchor" href="#_3-3-缓存穿透"><span>3.3 缓存穿透</span></a></h2>
<p>要访问的数据既不在缓存中，也不在数据库中。导致请求缓存时，发生缓存缺失，再去访问数据库，数据库也没有数据。当产生大量的这种请求时，缓存便成了摆设，会给数据库带来巨大压力
解决办法：</p>
<ol>
<li>回种空值 （<strong>常用</strong>）
当从数据库查询到的数据为空时，我们可以往缓存中插入一个空值，如用-1表示，并设置较短的过期时间，让空值能够短时间内淘汰。
该方案能处理某个key一直查不到的问题。但是当大量key都查不到，将会在缓存中回种大量无效的key，只是就需要使用布隆过滤器来处理该问题</li>
<li>使用布隆过滤器
将存量数据和新增数据都写到布隆过滤器中，当有写请求，先写数据库，然后写到布隆过滤器中。有请求到达时，先查询布隆过滤器，当布隆过滤器为1，表示有数据，允许访问；否则认为数据不存在，直接拒绝访问。
布隆过滤器只能判断一个元素一定不存在和可能存在两种情况。当某个key查询布隆过滤器返回1时，表示该元素可能存在，允许访问，所以会有部分false positive（假阳性）到达数据库。同时，当数据库中删除数据之后，布隆过滤器无法更新，导致这一部分请求仍然会落到数据库上。</li>
</ol>
</div></template>


