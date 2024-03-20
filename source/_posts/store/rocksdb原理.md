---
title: rocksdb原理
date: 2024-03-20
category:
  - 存储
tag:
  - 缓存
---

## 引擎整体架构
![img](/images/rocksdb_all.webp)
### MemTable 与 WAL
RocksDB 使用 LSM 作为主要的存储数据结构，每当数据写入到 RocksDB 之中，就会被添加到 MemTable 内存的写缓冲区，以及一个磁盘上的超前写入日志（WAL）。数据会被写入到 WAL 和 MemTable，WAL 是 MemTable 的易失性保护机制。

RocksDB 中 Memtable 的数据结构有三种，分别是 skiplist、hash-skiplist、hash-linklist，跳表的好处在于插入的时候可以保证数据的有序，并且支持二分查找、范围查询。插入和搜索的代价都是 O(log n)。

在达到指定大小之后现有 MemTable 和 WAL 锁定变为不可变，新数据写入新的 MemTable 和 WAL。

### SSTable
SSTable 是一种数据结构，当 MemTable 到达一定的上限之后，会 flush 到硬盘上 Sorted String Table (SSTable)，并放置在第 0 层(L0)，对应的 WAL 空间回收；L0 大小达到上限时，L0 的 SSTable 经过 compaction 落到 L1；Ln：以此类推完成上述操作。

在每一级中，都会使用**二分搜索**；而**布隆过滤器**会消除 SSTable 文件中不必要的检索。

### Compaction
Campact 可以翻译成压缩，也可以被称为压实，其作用主要有：清除无效数据；对数据的排序进行优化。而无效数据的产生于 update：标记覆盖与 delete：标记删除。使用 Compact 的好处有：整个文件的批量读写，比较高效；可以并行化操作。

比较几种常见的 Compaction 策略：
- Leveled：leveldb 的方式，SSTable 数量逐层以指数增长，读写放大都比较严重，但是空间放大较低；
- Tired/Universal：Cassandra 与 HBase 的方式，空间放大和读放大严重，但是写放大最小；
- FIFO：删除旧的过期文件，执行轻量级压缩，适用于那些 in-memory 缓存应用。

大家也可以发现，并不存在写放大、读放大和空间放大都很完美的方案；和计算机世界的其他领域一样，数据库也没有银弹。


### 详细

### ACID事务实现

参考文献：
深入RocksDB原理 https://zhuanlan.zhihu.com/p/616209332
RocksDB学习记录 https://km.woa.com/articles/show/506592
RocksDB上锁机制 https://www.cnblogs.com/cchust/p/7107392.html