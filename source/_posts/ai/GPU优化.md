---
title: GPU优化
date: 2024-03-20
category:
  - GPU
tag:
  - GPU
---

## MNN优化

### NC4HW4
现在有一条指令处理4组数据的能力, 比如x86结构的sse指令,arm的neon指令.以及GPGPU的OpenGL和OpenCL,单次处理RGBA四组数据. 如果继续使用nchw内存排布的话, 是这样的.
根据按行处理特点, 对于Feature和kernel的宽不是4倍数进行处理, 会出现错误. 图中的kernel很明显以已经到了第二行的值.
那么有没有方法在按行处理的思想上, 一次处理4个数,而不受影响.答案是有的, 即NC4HW4.即把前4个通道合并在一个通道上, 依次类推, 在通道数不够4的情况下进行补0.
进行NC4HW4重排后，可以充分利用cpu指令集的特性，实现对卷积等操作进行加速。同时可以较少cache miss.
单指令处理4组数据（SIMD）
NC4HW4数据排布： https://no5-aaron-wu.github.io/2021/11/14/AI-Algorithm-2-NC4HW4/
### 量化
将模型参数通过一个函数映射到0-255或者-127-128
使用int（2-8）再采用100条数据拟合一下
pytorch量化工作流程详解
  PyTorch提供了三种量化模型的方法，具体包括训练后动态量化、训练后静态量化和训练时量化。

1. 训练后动态量化。这是最简单的量化形式，其中权重被提前量化，而激活在推理过程中被动态量化。这种方法用于模型执行时间由从内存加载权重而不是计算矩阵乘法所支配的情况，这适用于批量较小的LSTM和Transformer类型。对整个模型应用动态量化只需要调用一次torch.quantization.quantize_dynamic()函数即可完成具体的细节请参考该量化教程。
2. 训练后静态量化。这是最常用的量化形式，其中权重是提前量化的，并且基于在校准过程中观察模型的行为来预先计算激活张量的比例因子和偏差。CNN是一个典型的用例，训练后量化通常是在内存带宽和计算节省都很重要的情况下进行的。进行训练后量化的一般过程如下所示：
- 步骤1-准备模型：通过添加QuantStub和DeQuantStub模块，指定在何处显式量化和反量化激活值；确保不重复使用模块；将需要重新量化的任何操作转换为模块的模式；
- 步骤2-将诸如conv + relu或conv + batchnorm + relu之类的组合操作融合在一起，以提高模型的准确性和性能；
- 步骤3-指定量化方法的配置，例如选择对称或非对称量化以及MinMax或L2Norm校准技术；
- 步骤4- 插入torch.quantization.prepare()模块来在校准期间观察激活张量；
- 步骤5-使用校准数据集对模型执行校准操作；
- 步骤6-使用torch.quantization.convert() 模块来转化模型，具体包括计算并存储每个激活张量要使用的比例和偏差值，并替换关键算子的量化实现等。
3. 训练时量化。在极少数情况下，训练后量化不能提供足够的准确性，可以插入torch.quantization.FakeQuantize()模块执行训练时量化。计算将在FP32中进行，但将值取整并四舍五入以模拟INT8的量化效果。具体的量化步骤如下所示：
- 步骤1-准备模型：通过添加QuantStub和DeQuantStub模块，指定在何处显式量化和反量化激活值；确保不重复使用模块；将需要重新量化的任何操作转换为模块的模式；
- 步骤2-将诸如conv + relu或conv + batchnorm + relu之类的组合操作融合在一起，以提高模型的准确性和性能；
- 步骤3-指定伪量化方法的配置，例如选择对称或非对称量化以及MinMax或L2Norm校准技术；
- 步骤4-插入torch.quantization.prepare_qat() 模块，该模块用来在训练过程中的模拟量化；
- 步骤5-训练或者微调模型；
- 步骤6-使用torch.quantization.convert() 模块来转化模型，具体包括计算并存储每个激活张量要使用的比例和偏差值，并替换关键算子的量化实现等。
### winograd

### gemm并行算法
CUDA、MKL进行GEMM（矩阵乘法）加速计算
向量化（SIMD）技术：CPU只需执行一条指令，即可完成四个加法计算操作，四个加法计算操作并行执行

### 混合精度
1. 保存时使用fp32，但是只使用fp16进行运算




### 算子融合
Conv + BN + Act组合，可以把归一化和激活函数如relu，融合到卷积上面去，就能减少两次访存。其实就是将bn融合到卷积里面去，bn就是一个1*1卷积
tensorflow提供了optimize for inference的python接口，我们可以利用这个api进行graph的optimize，其中就有fuseBN的操作
onnx的话，强烈推荐大老师的onnx-simplifier



参考文献：
GPU在外卖场景精排模型预估中的应用实践：https://tech.meituan.com/2022/03/03/ctr-gpu-inference.html
GPU优化总结：https://km.woa.com/articles/show/593491