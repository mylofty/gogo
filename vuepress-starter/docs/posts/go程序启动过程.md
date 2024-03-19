---
date: 2023-03-05
category:
  - Go
tag:
  - Go
---

[[toc]]

# 一、go启动流程
## 1.1 第一个go程序
1. 首先，我们来看一个简单的go程序启动流程
```go
// main.go
import "fmt"


func main() {
    str := make([]string, 0)
    str = append(str, "zhiminding")
    fmt.Printf("hello,%v", str)
}
```
2. 对上面的go程序进行编译，生成main
```sh
go build -gcflags="-l -N" # -l 禁止内联, -N 禁止优化
```
3. 查看编译出来的二进制和汇编代码
```sh
go tool objdump -s "main.main" -S ./main # 用户实现的main函数，在源码中是main.main
```
该方法在控制台输出汇编代码，阅读和调试起来不方便，我们可以用lensm工具查看汇编代码
## 1.2 生产力工具lensm
为了方便看汇编和源代码，在go源码之间方便跳转，我们可以安装一个可交互的源码分析器：lensm，通过lensm可以方便地将编译出来的golang可执行文件映射到源码中，并点击某个函数就可以跳转到对应实现上面
1. git地址：
    https://github.com/loov/lensm
2. 如下进行安装：
    ```sh
    go install loov.dev/lensm@main
    ```
3. 利用该工具分析上面生成的二进制文件的源码
    ```sh
    lensm -watch main
    # lensm -watch -filter main main  # -filter用来直接过滤到main函数，也可以在页面内选择
    ```
4. 该二进制文件用lensm打开如下：
<!--     ![img](img/lensm_hello1.png) -->


## 1.3 启动流程
在lensm的左上角的搜索栏可以搜索到，go进程的入口函数（在mac M1平台）是_rt0_arm64_darwin(SB)，对应代码段如下：
```go
// src/runtime/rt0_darwin_arm64.s


TEXT _rt0_arm64_darwin(SB),NOSPLIT|NOFRAME,$0
    MOVD    $runtime·rt0_go(SB), R2
    BL  (R2)
exit:
    MOVD    $0, R0
    MOVD    $1, R16 // sys_exit
    SVC $0x80
    B   exit
```
其实，无论是哪个平台启动go程序，最终都会跳转到runtime.rt0_go(SB)，只是在不同平台该函数实现不同，lensm中搜索该函数，跳转到具体平台的具体实现文件之中
```go
// src/runtime/asm_arm64.s


TEXT runtime·rt0_go(SB),NOSPLIT|TOPFRAME,$0
    // SP = stack; R0 = argc; R1 = argv
    SUB $32, RSP
    MOVW    R0, 8(RSP) // argc
    MOVD    R1, 16(RSP) // argv
    ...
    BL  runtime·args(SB)        // 参数初始化
    BL  runtime·osinit(SB)      // 操作系统初始化
    BL  runtime·schedinit(SB)   // 调度器初始化


    // create a new goroutine to start program 创建一个协程来启动程序
    MOVD    $runtime·mainPC(SB), R0     // 指向runtime.main函数，main入口函数
    SUB $16, RSP
    MOVD    R0, 8(RSP) // arg R0即是上一步的runtime.mainPC函数地址
    MOVD    $0, 0(RSP) // dummy LR 这个变量位0，因为runtime.mainPC函数无参数
    BL  runtime·newproc(SB)     // 创建出一个协程，协程运行的函数就是上面mianPC指向的rutime.main() newProc接收这个参数
    ADD $16, RSP


    // start this M 开启调度器进行协程调度，跳转到runtime.mstart0
    BL  runtime·mstart(SB)


// mainPC指向runtime.main
DATA    runtime·mainPC+0(SB)/8,$runtime·main<ABIInternal>(SB)
GLOBL   runtime·mainPC(SB),RODATA,$8
// runtime.mstart 最终跳转到runtime.mstart0
TEXT runtime·mstart(SB),NOSPLIT|TOPFRAME,$0
    BL  runtime·mstart0(SB)
    RET // not reached。 mstart0中循环调度协程，永远不会返回
```
从rt0_go函数可知，初始化协程调度器之后，我们首先构造首个协程（即执行main函数的协程）所需的参数，将runtime.mainPC函数作为参数，调用创建协程的函数runtime.newproc(fn *funcval)来创建首个协程，该协程的运行函数为runtime.mainPC，即runtime.main函数，我们跳转到runtime.main函数中继续分析
```go
// src/rumtime/proc.go


// The main goroutine.
func main() {
    g := getg()
    ...
    // 32/64位机器设置不同大小的最大栈空间
    if goarch.PtrSize == 8 {
        maxstacksize = 1000000000
    } else {
        maxstacksize = 250000000
    }
    ...
    lockOSThread() // 初始化时要锁死线程
    doInit(&runtime_inittask) // Must be before defer.
    gcenable() // 启动gc
    doInit(&main_inittask)
    ......
    fn := main_main // main_main指向main.main，即用户实现的main函数
    fn() // 执行用户的main函数
    ...
    exit(0)
```
可以看到，在runtime.main函数中执行了用户实现的main.main函数，至此，整个go进程启动逻辑就很清晰了，整个启动过程核心步骤如下图所示
<!-- ![go启动过程](/img/start2.png) -->