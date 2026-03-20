# upyun-web

## 特性

- 切换「列表/缩略图」
- 重命名目录、移动目录

## 生产部署（LNMP / Nginx）

```shell
git clone https://github.com/dogeow/upyun-web.git
cd upyun-web && yarn && yarn build
pm2 start server/index.js --name upyun-web
```

对应的 Nginx 只需要把所有请求转发给 Node：

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 技术栈

- React 19
- Vite 8
- shadcn/ui
- Tailwind CSS 4
- Express 5
- basic-ftp

## 开发

安装依赖后启动开发环境：

```bash
yarn
yarn dev
```

默认地址：

- 前端: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:3001`
