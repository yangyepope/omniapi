# joern-runner — Joern CLI 的 HTTP 包装
#
# 暴露三个端点：
#   GET  /health
#   POST /analyze       接收 src_dir + service_name，跑 joern-parse + 导出节点
#   POST /clear-cache   清理目标 service 的 CPG 缓存
#
# 与 aisec-worker 共享 /var/cache/aisec 卷。
FROM ghcr.io/joernio/joern:nightly

ENV JOERN_RUNNER_PORT=8090
ENV JOERN_HEAP_SIZE=4g

# joern 基镜像（AlmaLinux 9）已内置 python3，用 microdnf 补 pip 即可
RUN microdnf install -y python3-pip wget && microdnf clean all

WORKDIR /app

RUN python3 -m venv /app/.venv \
 && /app/.venv/bin/pip install --upgrade pip
COPY requirements.txt /app/requirements.txt
RUN /app/.venv/bin/pip install --no-cache-dir -r /app/requirements.txt

COPY server.py /app/server.py
COPY scripts /app/scripts

RUN mkdir -p /var/cache/aisec/cpg

EXPOSE 8090

CMD ["/app/.venv/bin/uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8090"]
