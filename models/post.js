var Db = require('./db');
var poolModule = require('generic-pool');
var pool = poolModule.Pool({
  name     : 'mongoPool',
  create   : function(callback) {
    var mongodb = Db();
    mongodb.open(function (err, db) {
      callback(err, db);
    })
  },
  destroy  : function(mongodb) {
    mongodb.close();
  },
  max      : 100,
  min      : 5,
  idleTimeoutMillis : 30000,
  log      : true
});


var ObjectID = require('mongodb').ObjectID;
var Config = require('../config');
var config = new Config();


function Post(name, avatar, title, tags, post) {
  this.name = name;
  this.avatar = avatar;
  this.title = title;
  this.tags = tags;
  this.post = post;
}

module.exports = Post;

//存储一篇文章及其相关信息
Post.prototype.save = function(callback) {
  var date = new Date();
//  存储各种时间格式，方便以后扩展
  var time = {
      date: date,
      year : date.getFullYear(),
      month : date.getFullYear() + "-" + (date.getMonth() + 1),
      day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
      minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
      date.getHours() + ":" + (date.getMinutes() < config.pageSize() ? '0' + date.getMinutes() : date.getMinutes()) 
  }
//  要存入数据库的文
  var post = {
      name: this.name,
      avatar: this.avatar,
      time: time,
      title: this.title,
      tags: this.tags,
      post: this.post,
      comments: [],
      pv:0
  };
  console.log(post.avatar);
//  打开数据库
  pool.acquire(function (err, mongodb) {
    if (err) {
      return callback(err);
    }
//    读取 posts 集合
    mongodb.collection('posts', function (err, collection) {
      if (err) {
         pool.release(mongodb);
        return callback(err);
      }
//      将文档插入 posts 集合
      collection.insert(post, {
        safe: true
      }, function (err) {
         pool.release(mongodb);
        if (err) {
          return callback(err);//失败！返回 err
        }
        callback(null);//返回 err 为 null
      });
    });
  });
};


Post.getSome = function(name, page, callback) {
  //打开数据库
  pool.acquire(function (err, mongodb) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    mongodb.collection('posts', function (err, collection) {
      if (err) {
        pool.release(mongodb);       
        return callback(err);
      }
      var query = {};
      if (name) {
        query.name = name;
      }
      //使用 count 返回特定查询的文档数 total
      collection.count(query, function (err, total) {
        //根据 query 对象查询，并跳过前 (page-1)*10 个结果，返回之后的 10 个结果
        collection.find(query, {
          skip: (page - 1)*config.pageSize(),
          limit: config.pageSize()
        }).sort({
          time: -1
        }).toArray(function (err, docs) {
            pool.release(mongodb);
          if (err) {
            return callback(err);
          }
          //解析 markdown 为 html
         // docs.forEach(function (doc) {
          //  doc.post = markdown.toHTML(doc.post);
         // });  
          callback(null, docs, total);
        });
      });
    });
  });
};

//获取一篇文章
Post.getOne = function(_id, callback) {
  //打开数据库
  pool.acquire(function (err, mongodb) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    mongodb.collection('posts', function (err, collection) {
      if (err) {
        pool.release(mongodb);
        return callback(err);
      }
      //根据用户名、发表日期及文章名进行查询
      collection.findOne({
        "_id" : new ObjectID(_id)        
      }, function (err, doc) {
        if (err) {
          pool.release(mongodb);
          return callback(err);
        }
        if (doc) {
          //每访问 1 次，pv 值增加 1
          collection.update({
            "_id": new ObjectID(_id)
            }, {
            $inc: {"pv": 1}
          }, function (err) {
            pool.release(mongodb);
            if (err) {
              return callback(err);
            }
          });
         
          callback(null, doc);//返回查询的一篇文章
        }
      });
    });
  });
};

// 返回原始发表的内容（markdown 格式）
Post.edit = function(_id, callback) {
//   打开数据库
  pool.acquire(function (err, mongodb) {
    if (err) {
      return callback(err);
    }
// 读取 posts 集合
    mongodb.collection('posts', function (err, collection) {
      if (err) {
        pool.release(mongodb);
        return callback(err);
      }
//       根据用户名、发表日期及文章名进行查询
      collection.findOne({
        "_id" : new ObjectID(_id)
      }, function (err, doc) {
        pool.release(mongodb);
        if (err) {
          return callback(err);
        }
        callback(null, doc);//返回查询的一篇文章（markdown 格式）
      });
    });
  });
};

// 更新一篇文章及其相关信息
Post.update = function(_id, post, callback) {
//  打开数据库
  pool.acquire(function (err, mongodb) {
    if (err) {
      return callback(err);
    }
  //  读取 posts 集合
    mongodb.collection('posts', function (err, collection) {
      if (err) {
        pool.release(mongodb);
        return callback(err);
      }
  //    更新文章内容
      collection.update({
        "_id": new ObjectID(_id)
      }, {
        $set: {post: post}
      }, function (err) {
        pool.release(mongodb);
        if (err) {
          return callback(err);
        }
        callback(null);
      });
    });
  });
};

//删除一篇文章
Post.remove = function(_id, callback) {
  //打开数据库
  pool.acquire(function (err, mongodb) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    mongodb.collection('posts', function (err, collection) {
      if (err) {
        pool.release(mongodb);
        return callback(err);
      }
     //根据用户名、日期和标题查找并删除一篇文章
      collection.remove({
        "_id": new ObjectID(_id)
      }, {
        w: 1
      }, function (err) {
        pool.release(mongodb);
        if (err) {
          return callback(err);
        }
        callback(null);
      });
    });
  });
};

//返回所有文章存档信息
Post.getArchive = function(callback) {
  //打开数据库
  pool.acquire(function (err, mongodb) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    mongodb.collection('posts', function (err, collection) {
      if (err) {
        pool.release(mongodb);
        return callback(err);
      }
      //返回只包含 name、time、title 属性的文档组成的存档数组
      collection.find({}, {
        "name": 1,
        "time": 1,
        "title": 1
      }).sort({
        time: -1
      }).toArray(function (err, docs) {
        pool.release(mongodb);
        if (err) {
          return callback(err);
        }
        callback(null, docs);
      });
    });
  });
};

//返回所有标签
Post.getTags = function(callback) {
  pool.acquire(function (err, mongodb) {
    if (err) {
      return callback(err);
    }
    mongodb.collection('posts', function (err, collection) {
      if (err) {
        pool.release(mongodb);
        return callback(err);
      }
      //distinct 用来找出给定键的所有不同值
      collection.distinct("tags", function (err, docs) {
        pool.release(mongodb);
        if (err) {
          return callback(err);
        }
        callback(null, docs);
      });
    });
  });
};

//返回含有特定标签的所有文章
Post.getTag = function(tag, callback) {
  pool.acquire(function (err, mongodb) {
    if (err) {
      return callback(err);
    }
    mongodb.collection('posts', function (err, collection) {
      if (err) {
        pool.release(mongodb);
        return callback(err);
      }
      //查询所有 tags 数组内包含 tag 的文档
      //并返回只含有 name、time、title 组成的数组
      collection.find({
        "tags": tag
      }, {
        "name": 1,
        "time": 1,
        "title": 1
      }).sort({
        time: -1
      }).toArray(function (err, docs) {
        pool.release(mongodb);
        if (err) {
          return callback(err);
        }
        callback(null, docs);
      });
    });
  });
};

//返回通过标题关键字查询的所有文章信息
Post.search = function(keyword, callback) {
  pool.acquire(function (err, mongodb) {
    if (err) {
      return callback(err);
    }
    mongodb.collection('posts', function (err, collection) {
      if (err) {
        pool.release(mongodb);
        return callback(err);
      }
      var pattern = new RegExp(keyword, "i");
      collection.find({
        "title": pattern
      }, {
        "name": 1,
        "time": 1,
        "title": 1
      }).sort({
        time: -1
      }).toArray(function (err, docs) {
        pool.release(mongodb);
        if (err) {
         return callback(err);
        }
        callback(null, docs);
      });
    });
  });
};
