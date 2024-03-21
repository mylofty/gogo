---
title: faiss使用
date: 2024-03-21
category:
  - 搜索
tag:
  - faiss
sticky: true
---

# faiss总览
https://zhuanlan.zhihu.com/p/595249861

Faiss的全称是Facebook AI Similarity Search。这是一个开源库，针对高维空间中的海量数据，提供了高效且可靠的检索方法

Faiss中的稠密向量各种索引都是基于 Index实现的，主要的索引方法包括： IndexFlatL2、IndexFlatIP、IndexHNSWFlat、IndexIVFFlat、IndexLSH、IndexScalarQuantizer、IndexPQ、IndexIVFScalarQuantizer、IndexIVFPQ、IndexIVFPQR等。

精确K近邻算法有KD-tree，更多地是近似最近邻ANN（Approximate Nearest Neighbor）算法，如各种KD-tree的变种、Hierarchical K-means Tree及其变种、局部敏感哈希LSH（Local Sensitive Hash）的各种具现（如Google提出的海量文本去重算法SimHash）。

# faiss索引方法介绍

## 1.精确查找：IndexFlatL2 / IndexFlatIP
IndexFlatL2是基于L2（欧式距离）的暴力搜索，IndexFlatIP则是基于cosin距离（余弦相似度）的暴力搜索。该方案无需训练，插入即可精确搜索
```python
def IndexFlatTest():
   # 索引的维度
   d = 4 
   # 定义索引
   # index: faiss.IndexFlatIP = faiss.IndexFlatIP(d)
   index: faiss.IndexFlatL2 = faiss.IndexFlatL2(d)
   # 生成一些示例向量
   num_samples = 10
   samples = faiss.rand_smooth_vectors(num_samples,d, 1234)
   print(samples)
   print(samples.shape)
   index.add(samples) # 注意插入的索引id从0开始，所以需要自己记录索引id和插入的顺序关系
   print('numbers:',index.ntotal)
   # [[ 0.35488576 -0.73574394 -0.6536156   0.3178926 ]
   # [ 0.67962044  0.7863989  -0.7671616   0.04172076]
   # [ 0.96039176 -0.9938114  -0.95961237  0.8995318 ]
   # [-0.8903031  -0.61766034 -0.50728905 -0.96132135]
   # [-0.56933314 -0.25087294 -0.94959843 -0.9519859 ]
   # [-0.96773404  0.32363138  0.63591665 -0.960967  ]
   # [-0.2918578   0.5850899   0.9336975  -0.38424835]
   # [ 0.01005006  0.84884423  0.66606414  0.6791965 ]
   # [ 0.87879     0.01356855 -0.6405845  -0.7492134 ]
   # [ 0.80805725 -0.30866548 -0.52221924  0.62365204]]
   searchVec = np.array([[0.35488576, -0.73574394, -0.6536156, 0.3178926]], dtype=np.float32)
   # 寻找相似向量， indices表示相似用户ID矩阵， distances表示距离矩阵
   top_k = 5
   distances, indices  = index.search(searchVec, top_k) 
   print(f"distance:{distances}, indices:{indices}")
   # distance:[[0. 0.49851424 0.86517453 1.9748298  2.511535  ]], indices:[[0 9 2 8 1]]
   similar_vector_index:int = indices[0][0]
   similar_vector = index.reconstruct(int(similar_vector_index))
   print(similar_vector)
   # [ 0.35488576 -0.73574394 -0.6536156   0.3178926 ]
```

IndexFlatIP/IndexFlatL2的实现上，都是采用全量数据并行计算内积和L2范数（欧式距离）。IndexFlatIP对应faiss的METRIC_INNER_PRODUCT类型，计算内积如下：
```c++
template <class BlockResultHandler, bool use_sel = false>
void exhaustive_inner_product_seq(
        const float* x,
        const float* y,
        size_t d,
        size_t nx,
        size_t ny,
        BlockResultHandler& res,
        const IDSelector* sel = nullptr) {
    using SingleResultHandler =
            typename BlockResultHandler::SingleResultHandler;
    int nt = std::min(int(nx), omp_get_max_threads());

    FAISS_ASSERT(use_sel == (sel != nullptr));

#pragma omp parallel num_threads(nt)
    {
        SingleResultHandler resi(res);
#pragma omp for
        for (int64_t i = 0; i < nx; i++) {
            const float* x_i = x + i * d;
            const float* y_j = y;

            resi.begin(i);

            for (size_t j = 0; j < ny; j++, y_j += d) {
                if (use_sel && !sel->is_member(j)) {
                    continue;
                }
                float ip = fvec_inner_product(x_i, y_j, d);
                resi.add_result(ip, j);
            }
            resi.end();
        }
    }
}


FAISS_PRAGMA_IMPRECISE_FUNCTION_BEGIN
float fvec_inner_product(const float* x, const float* y, size_t d) {
    float res = 0.F;
    FAISS_PRAGMA_IMPRECISE_LOOP
    for (size_t i = 0; i != d; ++i) {
        res += x[i] * y[i];
    }
    return res;
}
FAISS_PRAGMA_IMPRECISE_FUNCTION_END
```

如上可见，该方案仅计算了内积，如果希望最终得到的距离归一化，输入的向量需要提前做归一化，可使用normalize_L2函数


IndexFlatL2对应faiss的METRIC_L2类型，计算L2范数如下：
```c++
template <class BlockResultHandler, bool use_sel = false>
void exhaustive_L2sqr_seq(
        const float* x,
        const float* y,
        size_t d,
        size_t nx,
        size_t ny,
        BlockResultHandler& res,
        const IDSelector* sel = nullptr) {
    using SingleResultHandler =
            typename BlockResultHandler::SingleResultHandler;
    int nt = std::min(int(nx), omp_get_max_threads());

    FAISS_ASSERT(use_sel == (sel != nullptr));

#pragma omp parallel num_threads(nt)
    {
        SingleResultHandler resi(res);
#pragma omp for
        for (int64_t i = 0; i < nx; i++) {
            const float* x_i = x + i * d;
            const float* y_j = y;
            resi.begin(i);
            for (size_t j = 0; j < ny; j++, y_j += d) {
                if (use_sel && !sel->is_member(j)) {
                    continue;
                }
                float disij = fvec_L2sqr(x_i, y_j, d);
                resi.add_result(disij, j);
            }
            resi.end();
        }
    }
}


FAISS_PRAGMA_IMPRECISE_FUNCTION_BEGIN
float fvec_L2sqr(const float* x, const float* y, size_t d) {
    size_t i;
    float res = 0;
    FAISS_PRAGMA_IMPRECISE_LOOP
    for (i = 0; i < d; i++) {
        const float tmp = x[i] - y[i];
        res += tmp * tmp;
    }
    return res;
}
FAISS_PRAGMA_IMPRECISE_FUNCTION_END
```


## 2.更快的搜索，先聚类再倒排搜索： IVF (IndexIVFFlat)
该方案就是先把数据库中的向量划分成多个不同的格子（Voronoi cells），而每个格子都有一个中心点（centroid）。要查找某个向量的最近邻时，先从这些中心点里面找到一个最近的，然后再在相应的格子里面找到最近的向量。

该方法中最重要的两个参数是
1. nprobe：搜索的时候在最近的多少格子中查找，默认是1，通常推荐1-1024；（仅搜索最近的格子，可能会导致边缘节点陷入非真正最近的中心点，导致搜索不到最近邻）
2. nlist：构建索引的时候创建多少个格子，即聚类的数目，通常推荐2048以上；

使用方法：
```python
def IndexIVFFlatTest():
   # 索引的维度
   d = 4 
   nlist = 100 #聚类的数目
   # 定义索引
   quantizer = faiss.IndexFlatL2(d) 
   index = faiss.IndexIVFFlat(quantizer, d, nlist)
   # 生成一些示例向量
   num_samples = 200
   samples = faiss.rand_smooth_vectors(num_samples,d, 1234)
   print(samples.shape)
   index.train(samples)
   assert index.is_trained
   index.add(samples) # 注意插入的索引id从0开始，所以需要自己记录索引id和插入的顺序关系
   index.make_direct_map()
   print('numbers:',index.ntotal)
   searchVec = np.array([[0.35488576, -0.73574394, -0.6536156, 0.3178926]], dtype=np.float32)
   # 寻找相似向量， indices表示相似用户ID矩阵， distances表示距离矩阵
   top_k = 5
   index.nprobe = 5 # 指定寻找5个格子，默认1个
   distances, indices  = index.search(searchVec, top_k) 
   print(f"distance:{distances}, indices:{indices}")
   similar_vector_index:int = indices[0][0]
   print("similar_vector_index",similar_vector_index)
   similar_vector = index.reconstruct(int(similar_vector_index))
   print(similar_vector)
```

IVFx Flat ：倒排暴力检索.可以拿出每个聚类中心下的向量ID，每个中心ID后面挂上一堆非中心向量，每次查询向量的时候找到最近的几个中心ID，分别搜索这几个中心下的非中心向量。通过减小搜索范围，提升搜索效率。占用字节：4*d  + 8

## 3.内存占用优化：PQ （IndexPQ，IndexIVFPQ）
基于乘积量化（product quantizers）对存储向量进行压缩，节省存储空间。
有时候我们还关注 index 的内存占用，可能把所有的向量存起来都太大了，那么我们可以使用 PQ 方法来减小向量存储的内容。
1. 首先，会把 d 维的向量划分为 m(如：8) 个子向量；
2. 然后，对于每一个子向量，会在所有样本上对其进行聚类，聚成 2^8 = 256
3. 最后，相应的向量只需要存储子向量中心点的 ID 即可。

该方法两个重要的参数是：
1. m = 8  # 原来的向量维度平均分成多少份，d必须为m的整数倍
2. bits = 8 # 每个子向量用多少个bits表示（8表示有256个质心，11有2048个质心，越大则召回越精确）

IVF是可以和PQ组合使用的，相当于压缩了样本，同时还减少了搜索范围，不仅减少了内存时候，还提升了检索速度，这就是我们经常使用的IndexIVFPQ索引


PQ实现的方式并不会压缩向量的维度d，而是压缩向量每个值，如float32压缩到float16，int8，int4，这样存储占用就少了2，4，8倍。若再考虑将向量分成多少个子向量的话，如128维向量分成8个子向量，每个子向量仅保存质心的位置，那么又能压缩：128/8 = 16倍。单个向量占用多少个字节：ceil(M * nbits / 8)

PQ的实现会导致召回准确率不高，高准确率的情况应使用其他索引方式。


|             | FlatL2      |	PQ          |	IVFPQ       |
| ----------- | ----------- | ----------- |-----------  |
|Recall (%)   |	100         |	50          |	52          |
|Speed (ms)   |	8.26        |	1.49        |	0.09        |
|Memory (MB)  |	256	        |6.5	        |9.2          |

## 4.高精度、省时间方法：HNSW （IndexHNSWFlat）
HNSW 就是把数据库向量分成若干层，通过每一层的查找，都可以减少一个到达最近邻点的中间点。

如果您有大量 RAM 或数据集很小，HNSWM 是最佳选择，它是一个非常快速且准确的索引。4 <= M <= 64 是每个向量的链接数，越高越准确，但使用更多 RAM

每个向量占用字节：4*d + x * M * 2 * 4

其中最重要的事如下三个参数：
1. M：构建 HNSW 的时候，每个向量和多少个最近邻相连接。（64）
2. efSearch：在搜索的时候，每层查询多少个点。默认16（32）
3. efConstruction：在构建图的时候，每层查找多少个点。（64）


## faiss复合索引，融合多个

向量维度 d=128，数据集大小=1M，查找 k=10 近邻。
|Index |	Memory (MB)	| Query Time (ms)	| Recall  |	Notes |
| ----------- | ----------- | ----------- |-----------  |-----------  |
|Flat |	~500 |	18 |	1.0 |	适用于查询时间要求不高的小数据集 |
|IVF  |	~520 |	1 - 9 |	0.7 - 0.95 |	一个扩展性比较高的方案  |
|LSH  |	20 - 600 |	1.7 - 30 |	0.4 - 0.85	| 对于低维向量最好的方案 |
|HNSW |	600 - 1600 |	0.6 - 2.1 |	0.5 - 0.95	| 适用于对于精度和速度要求高的场景，但是费内存 |

### IVFADC (IVF256,PQ32x8)

2. IVF1024,PQ 即有1024个格子，聚类到1024个格子中
2. IVF100,Flat, elsaticFaiss默认的配置，100个聚类中心，nprobe为15，搜索最近15个
3. IVF4096_HNSW,Flat，k-means聚类中心为4096
4. IVF4096_HNSW,PQ32