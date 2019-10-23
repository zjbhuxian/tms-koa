# tms-koa

基于`koa`的轻量级快速开发框架，包含 MVC 中的 M 和 C 两部分，适合于实现 API 服务和前后端彻底分离的应用。

内置基于 access_token 的访问鉴权机制，更容易实现 API 调用的负载分担。

内置通过连接池访问 MySQL 数据库，支持进行读写分离。内置 SQL 语句的封装，内置 escape 防止 sql 注入。目前 where 条件中，exists，and，or 形成的 sql 不会进行 escape 处理，需要在外部自行处理。select 中的 fields 和 table 未进行 escape 处理，不能够直接使用用户输入的内容作为字段名和表名。orderby 和 groupby 未做 escape 处理，不能够直接使用用户输入。

内置支持上传文件。

# 安装

`npm install tms-koa --save`

为了运行系统需要安装 MySQL 和 Redis

# 测试

安装`pm2`（如果没装过）

```
cnpm i pm2 -g
```

通过`pm2`启动

```
npm run pm2
```

发送获得 token 的请求

```
http://localhost:3001/auth/token?userid=&name=
```

发送调用 api 的请求

```
http://localhost:3001/api/tryGet?access_token=&value=hello
```

# 配置信息

在项目的根目录下建立文件`/config/app.js`，指定下列信息：

```javascript
module.exports = {
  port: 3000,
  name: 'tms-koa-0',
  router: {
    auth: {
      prefix: '' // 接口调用url的前缀
    },
    controllers: {
      prefix: '' // 接口调用url的前缀
    }
  },
  tmsTransaction: false
}
```

参考：https://www.npmjs.com/package/koa-router

在项目的根目录下建立文件`/config/redis.js`，指定下列 Redis 连接信息：

```javascript
module.exports = {
  host: '127.0.0.1',
  port: '6379'
}
```

https://www.npmjs.com/package/redis

在项目的根目录下建立文件`/config/db.js`，指定下列 MySQL 或 Sqlite 数据库（可选）连接信息：

```javascript
module.exports = {
  mysql: {
    master: {
      connectionLimit: 10,
      host: '',
      port: '',
      user: '',
      password: '',
      database: ''
    },
    write: {
      connectionLimit: 10,
      host: '',
      port: '',
      user: '',
      password: '',
      database: ''
    }
  },
  sqlite: {
    path: ''
  }
}
```

参考：https://www.npmjs.com/package/mysql

参考：https://github.com/JoshuaWise/better-sqlite3/blob/HEAD/docs/api.md

文件管理，例如：保存上传文件

```javascript
module.exports = {
  local: {
    rootDir: 'files' // 指定保存文件的根目录
    database: {
      dialect: 'sqlite',
      file_table: 'upload_files'
    },
    schemas: [
      { id: 's1', type: 'shorttext', title: '信息1' },
      { id: 's2', type: 'longtext', title: '信息2' },
      {
        id: 's3',
        type: 'single',
        title: '信息3',
        ops: [{ v: 'v1', l: '选项1' }, { v: 'v2', l: '选项2' }, { v: 'v3', l: '选项3' }]
      },
      {
        id: 's4',
        type: 'multiple',
        title: '信息4',
        ops: [{ v: 'v1', l: '选项1' }, { v: 'v2', l: '选项2' }, { v: 'v3', l: '选项3' }]
      }
    ]
  }
}
```

tms-koa 支持保存上传文件的扩展信息。可以指定将信息保存在数据库中，例如：sqlite。指定的数据库需要在/config/db.js 中指定。tms-koa 启动时，如果指定的`file_table`表不存在，系统会自动创建，字段包括：id，userid，path 和扩展信息字段中的 id，所有以 id 命名的字段类型都是`text`。

# 鉴权机制

在项目的根目录下建立文件`/auth/client.js`，实现一个根据 http 请求 返回`Clinet`对象的方法。

通过调用`/auth/token`获得`access_token`，它的值和`client.js`返回的对象存在一一对应的关系。

获得的`access_token`会存储在 Redis 中，有效期是`7200`秒。格式为`应用名称`（app.js 中的 name），`内容名AccessToken`，`token字符串`，`用户id字符串`（来源于 client.js 中指定的 id），中间用`:`分隔。

`tms-koa-0:AccessToken:c89d35281105456babd15d94831424c7:userid`

> 利用这个机制可以用`tms-koa`实现一个基于 token 的 api 鉴权中心。

# 控制器（API）

项目根目录下创建`controllers`目录，路径和 url 匹配

需要从 Ctrl 类继承。

```javascript
const { Ctrl, ResultData } = require('tms-koa')

class Main extends Ctrl {
  tmsRequireTransaction() {
    return {
      get: true
    }
  }
  get() {
    return new ResultData('I am an api.')
  }
}
module.exports = Main
```

# 模型（model）

项目根目录下创建`models`目录。

模型必须从 DbModel 继承。

必须在导出包中提供一个用户创建实例的`create`方法。`DbModel`类中已经内置一个创建实例的方法的`create`方法，它的子类可参照下面的例子进行调用。

```javascript
const { DbModel } = require('tms-koa')

class Template extends DbModel {
  constructor({ db = null, debug = false } = {}) {
    super('template', { db, debug })
  }
}

module.exports = { Template, create: Template.create.bind(Template) }
```

已经在 model 层中进行 escape 处理，防止 sql 注入。关于 escape 请参考：tms_db。

# 静态文件

项目根目录下创建`public`目录。

# 记录控制器事物

在连接的数据库中执行下面的脚本。

```sql
CREATE TABLE `tms_transaction` (
 `id` bigint(20) NOT NULL AUTO_INCREMENT,
 `begin_at` double(13,3) NOT NULL,
 `end_at` double(13,3) NOT NULL DEFAULT '0.000',
 `request_uri` text,
 `user_agent` text,
 `referer` text,
 `remote_addr` text,
 `userid` varchar(40) NOT NULL DEFAULT '',
 PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8
```

在`app.js`文件中将`tmsTransaction`设置为`true`

在控制器类（Ctrl）中添加方法，说明需要支持事物的接口。

```javascript
tmsRequireTransaction() {
    return {
        get: true
    }
}
```

在控制器类（Ctrl）中添加方法，说明需要在调用接口前执行的代码。

```javascript
async tmsBeforeEach(method) {
  // 返回ResultFault及其子类的对象，终止接口调用
  // return new ResultFault('发生错误')

  return true
}
```

# 文件上传和下载

需要在部署阶段创建程序运行后用到的`domain`，例如在`files`目录下创建`tests`目录，用于保存单元测试产生的文件。
