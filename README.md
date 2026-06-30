# OPPO 商城 Quantumult X Cookie 抓取

用于抓取 OPPO 商城 APP 和 OPPO 商城小程序签到脚本所需变量。

## 远程重写资源

Quantumult X 添加这个资源：

```txt
https://raw.githubusercontent.com/pangpangyunshu/oppo-qx-cookie/main/oppo_cookie.conf
```

更新后应显示：

```txt
1 条重写规则已更新
1 主机名已更新
```

不要把 `oppo_cookie.js` 当重写资源导入。`oppo_cookie.js` 是脚本文件，`oppo_cookie.conf` 才是重写资源。

## 手动配置

```ini
[rewrite_local]
^https:\/\/hd\.opposhop\.cn\/ url script-request-header https://raw.githubusercontent.com/pangpangyunshu/oppo-qx-cookie/main/oppo_cookie.js

[mitm]
hostname = hd.opposhop.cn
```

## 变量格式

APP：

```txt
OPPO_APP=Cookie#User-Agent#会员等级
```

小程序：

```txt
OPPO_MINI=Cookie
```

会员等级只能手动配置：

```txt
普卡
银卡会员
金钻会员
```

脚本默认 `普卡`，需要其他等级请修改 `oppo_cookie.js` 里的：

```js
const DEFAULT_LEVEL = "普卡";
```

## 使用方法

1. Quantumult X 开启 MitM 并信任证书。
2. 添加上方重写配置。
3. 打开 OPPO 商城 APP，进入 `我的 - 签到任务`。
4. 或打开 OPPO 商城小程序，进入签到任务页。
5. 等待通知，复制通知里的变量值。

## 多账号

默认覆盖旧值。

需要自动追加多账号，修改：

```js
const AUTO_APPEND = true;
```

多账号最终格式：

```txt
OPPO_APP=账号1Cookie#UA#普卡@账号2Cookie#UA#金钻会员
OPPO_MINI=账号1Cookie@账号2Cookie
```

## 注意

不要把真实 Cookie 提交到公开仓库。
