<script>
export default {
  onLaunch() {
    // 初始化数据库 - 确保默认数据存在
    const db = require('./utils/db.js').default
    db.initDefaults()
  },
  onShow() {
    // 检查到期合同预警
    this.checkContractExpiry()
  },
  onHide() {
    console.log('App Hide')
  },
  methods: {
    checkContractExpiry() {
      // 在首页显示时检查，这里只做标记，首页页面会读取
    }
  }
}
</script>

<style>
/* 全局样式 */
@import './uni.scss';

page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  color: #333333;
}

/* 通用卡片样式 */
.card {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px;
  margin: 12px 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* 状态颜色 */
.status-vacant { color: #999999; }
.status-occupied { color: #34C759; }
.status-reserved { color: #FF9500; }
.status-checkout { color: #FF3B30; }

/* 大按钮样式（需求文档：按钮越大越好） */
.btn-big {
  height: 48px;
  line-height: 48px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 8px;
  text-align: center;
}

.btn-primary {
  background-color: #007AFF;
  color: #ffffff;
}

.btn-danger {
  background-color: #FF3B30;
  color: #ffffff;
}

.btn-success {
  background-color: #34C759;
  color: #ffffff;
}

.btn-warning {
  background-color: #FF9500;
  color: #ffffff;
}

/* 标签样式 */
.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.tag-red { background-color: #FFEAEA; color: #FF3B30; }
.tag-green { background-color: #E8F5E9; color: #34C759; }
.tag-orange { background-color: #FFF3E0; color: #FF9500; }
.tag-gray { background-color: #F5F5F5; color: #999999; }
.tag-blue { background-color: #E3F2FD; color: #007AFF; }

/* 金额样式 */
.amount { font-weight: 700; color: #333333; }
.amount-red { font-weight: 700; color: #FF3B30; }
.amount-green { font-weight: 700; color: #34C759; }

/* 分隔线 */
.divider {
  height: 1px;
  background-color: #EEEEEE;
  margin: 8px 0;
}
</style>
