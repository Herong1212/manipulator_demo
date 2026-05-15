#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
机械臂齐次坐标变换可视化 - Web 服务器
使用 Python 标准库 http.server，无需安装额外依赖

用法：
    python3 server.py
    然后在浏览器中访问 http://localhost:8080
"""

import http.server
import socketserver
import os
import sys
import json
import urllib.parse
from pathlib import Path

# ──────────────────────────────────────────────
# 配置
# ──────────────────────────────────────────────
PORT = 1264
# 服务器根目录：server.py 所在的文件夹
BASE_DIR = Path(__file__).parent.resolve()


class RobotArmHandler(http.server.SimpleHTTPRequestHandler):
    """自定义请求处理器，支持静态文件服务和简单 API"""

    def __init__(self, *args, **kwargs):
        # 将 web 根目录设置为 server.py 所在目录
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    # ──────────────────────────────────────────
    # MIME 类型扩展（确保 JS/CSS 正确识别）
    # ──────────────────────────────────────────
    extensions_map = {
        "": "application/octet-stream",
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
    }

    def do_GET(self):
        """处理 GET 请求：静态文件服务 + 可选 API 端点"""
        parsed = urllib.parse.urlparse(self.path)

        # API 路由：/api/matrix  —— 后端矩阵计算（可选，前端也可独立完成）
        if parsed.path == "/api/matrix":
            self._handle_matrix_api(parsed.query)
            return

        # 根路径重定向到 index.html
        if parsed.path == "/":
            self.path = "/index.html"

        # 静态文件服务（交给父类处理）
        super().do_GET()

    def _handle_matrix_api(self, query_string: str):
        """
        可选后端 API：计算 4×4 齐次变换矩阵
        参数（URL query）：
            rx, ry, rz  —— 绕 X/Y/Z 轴旋转角度（度）
            tx, ty, tz  —— 沿 X/Y/Z 轴平移量
            order       —— 旋转顺序，默认 'xyz'
        返回 JSON：{ "matrix": [[...],[...],[...],[...]] }
        """
        import math

        params = urllib.parse.parse_qs(query_string)

        def _get(key, default=0.0):
            return float(params.get(key, [default])[0])

        rx = math.radians(_get("rx"))
        ry = math.radians(_get("ry"))
        rz = math.radians(_get("rz"))
        tx = _get("tx")
        ty = _get("ty")
        tz = _get("tz")

        # ── 基础旋转矩阵（列主序，与前端 Three.js 一致）──
        def rot_x(a):
            c, s = math.cos(a), math.sin(a)
            return [
                [1, 0,  0, 0],
                [0, c, -s, 0],
                [0, s,  c, 0],
                [0, 0,  0, 1],
            ]

        def rot_y(a):
            c, s = math.cos(a), math.sin(a)
            return [
                [ c, 0, s, 0],
                [ 0, 1, 0, 0],
                [-s, 0, c, 0],
                [ 0, 0, 0, 1],
            ]

        def rot_z(a):
            c, s = math.cos(a), math.sin(a)
            return [
                [c, -s, 0, 0],
                [s,  c, 0, 0],
                [0,  0, 1, 0],
                [0,  0, 0, 1],
            ]

        def mat_mul(A, B):
            """4×4 矩阵乘法"""
            n = 4
            C = [[0.0] * n for _ in range(n)]
            for i in range(n):
                for j in range(n):
                    C[i][j] = sum(A[i][k] * B[k][j] for k in range(n))
            return C

        # 复合旋转：R = Rz · Ry · Rx（外旋 XYZ = 内旋 ZYX）
        R = mat_mul(rot_z(rz), mat_mul(rot_y(ry), rot_x(rx)))

        # 写入平移量
        R[0][3] = tx
        R[1][3] = ty
        R[2][3] = tz

        result = {"matrix": R}
        body = json.dumps(result, ensure_ascii=False).encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        """自定义日志格式（比默认的更简洁）"""
        print(f"  [{self.log_date_time_string()}] {fmt % args}")


# ──────────────────────────────────────────────
# 启动服务器
# ──────────────────────────────────────────────
def main():
    os.chdir(BASE_DIR)  # 确保工作目录正确

    # 允许端口快速重用（避免 TIME_WAIT 状态阻塞）
    socketserver.TCPServer.allow_reuse_address = True

    with socketserver.TCPServer(("", PORT), RobotArmHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 55)
        print("  🤖  机械臂齐次坐标变换可视化")
        print("=" * 55)
        print(f"  服务器已启动：{url}")
        print(f"  根目录：      {BASE_DIR}")
        print("  按 Ctrl+C 停止服务器")
        print("=" * 55)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  服务器已停止。")
            sys.exit(0)


if __name__ == "__main__":
    main()
