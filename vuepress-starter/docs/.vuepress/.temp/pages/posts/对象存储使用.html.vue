<template><div><p>上传流程</p>
<p>文件上传分为客户端上传（主要是指网页端和移动端等面向终端用户的场景）和服务端上传两种场景，具体可以参考文档业务流程。</p>
<p>服务端SDK在上传方面主要提供两种功能，一种是生成客户端上传所需要的上传凭证，另外一种是直接上传文件到云端。</p>
<p>客户端上传凭证</p>
<p>客户端（移动端或者Web端）上传文件的时候，需要从客户自己的业务服务器获取上传凭证，而这些上传凭证是通过服务端的SDK来生成的，然后通过客户自己的业务API分发给客户端使用。根据上传的业务需求不同，七牛云 Go SDK支持丰富的上传凭证生成方式。</p>
<p>拷贝
// 存储相关功能的引入包只有这两个，后面不再赘述
import (
&quot;github.com/qiniu/go-sdk/v7/auth/qbox&quot;
&quot;github.com/qiniu/go-sdk/v7/storage&quot;
)</p>
<p>accessKey := &quot;your access key&quot;
secretKey := &quot;your secret key&quot;
mac := qbox.NewMac(accessKey, secretKey)</p>
<p>简单上传的凭证</p>
<p>最简单的上传凭证只需要AccessKey，SecretKey和Bucket就可以。</p>
<p>拷贝
bucket:=&quot;your bucket name&quot;
putPolicy := storage.PutPolicy{
Scope: bucket,
}
mac := qbox.NewMac(accessKey, secretKey)
upToken := putPolicy.UploadToken(mac)</p>
<p>默认情况下，在不指定上传凭证的有效时间情况下，默认有效期为1个小时。也可以自行指定上传凭证的有效期，例如：</p>
<p>拷贝
//自定义凭证有效期（示例2小时，Expires 单位为秒，为上传凭证的有效时间）
bucket := &quot;your bucket name&quot;</p>
<p>putPolicy := storage.PutPolicy{
Scope: bucket,
}
putPolicy.Expires = 7200 //示例2小时有效期
mac := qbox.NewMac(accessKey, secretKey)
upToken := putPolicy.UploadToken(mac)</p>
<p>覆盖上传的凭证</p>
<p>覆盖上传除了需要简单上传所需要的信息之外，还需要想进行覆盖的文件名称，这个文件名称同时可是客户端上传代码中指定的文件名，两者必须一致。</p>
<p>拷贝
bucket := &quot;your bucket name&quot;</p>
<p>// 需要覆盖的文件名
keyToOverwrite := &quot;qiniu.mp4&quot;
putPolicy := storage.PutPolicy{
Scope: fmt.Sprintf(&quot;%s:%s&quot;, bucket, keyToOverwrite),
}
mac := qbox.NewMac(accessKey, secretKey)
upToken := putPolicy.UploadToken(mac)</p>
<p>自定义上传回复的凭证</p>
<p>默认情况下，文件上传到七牛之后，在没有设置returnBody或者回调相关的参数情况下，七牛返回给上传端的回复格式为hash和key，例如：</p>
<p>拷贝
{&quot;hash&quot;:&quot;Ftgm-CkWePC9fzMBTRNmPMhGBcSV&quot;,&quot;key&quot;:&quot;qiniu.jpg&quot;}</p>
<p>有时候我们希望能自定义这个返回的JSON格式的内容，可以通过设置returnBody参数来实现，在returnBody中，我们可以使用七牛支持的魔法变量和自定义变量。</p>
<p>拷贝
bucket := &quot;your bucket name&quot;</p>
<p>putPolicy := storage.PutPolicy{
Scope: bucket,
ReturnBody: <code v-pre>{&quot;key&quot;:&quot;$(key)&quot;,&quot;hash&quot;:&quot;$(etag)&quot;,&quot;fsize&quot;:$(fsize),&quot;bucket&quot;:&quot;$(bucket)&quot;,&quot;name&quot;:&quot;$(x:name)&quot;}</code>,
}
mac := qbox.NewMac(accessKey, secretKey)
upToken := putPolicy.UploadToken(mac)</p>
<p>则文件上传到七牛之后，收到的回复内容格式如下：</p>
<p>拷贝
{&quot;key&quot;:&quot;github-x.png&quot;,&quot;hash&quot;:&quot;FqKXVdTvIx_mPjOYdjDyUSy_H1jr&quot;,&quot;fsize&quot;:6091,&quot;bucket&quot;:&quot;if-pbl&quot;,&quot;name&quot;:&quot;github logo&quot;}</p>
<p>对于上面的自定义返回值，我们需要自定义结构体来解析这个回复，例如下面提供了一个解析结果的方法：</p>
<p>拷贝
// 自定义返回值结构体
type MyPutRet struct {
Key string
Hash string
Fsize int
Bucket string
Name string
}</p>
<p>localFile := &quot;your local file path&quot;
bucket := &quot;your bucket name&quot;
key := &quot;your file save key&quot;</p>
<p>// 使用 returnBody 自定义回复格式
putPolicy := storage.PutPolicy{
Scope: bucket,
ReturnBody: <code v-pre>{&quot;key&quot;:&quot;$(key)&quot;,&quot;hash&quot;:&quot;$(etag)&quot;,&quot;fsize&quot;:$(fsize),&quot;bucket&quot;:&quot;$(bucket)&quot;,&quot;name&quot;:&quot;$(x:name)&quot;}</code>,
}
mac := qbox.NewMac(accessKey, secretKey)
upToken := putPolicy.UploadToken(mac)</p>
<p>cfg := storage.Config{}
formUploader := storage.NewFormUploader(&amp;cfg)
ret := MyPutRet{}
putExtra := storage.PutExtra{
Params: map[string]string{
&quot;x:name&quot;: &quot;github logo&quot;,
},
}
err := formUploader.PutFile(context.Background(), &amp;ret, upToken, key, localFile, &amp;putExtra)
if err != nil {
fmt.Println(err)
return
}
fmt.Println(ret.Bucket, ret.Key, ret.Fsize, ret.Hash, ret.Name)</p>
</div></template>


