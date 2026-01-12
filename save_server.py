# pip install fastapi uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from datetime import datetime

app = FastAPI()

# 允许跨域，因为插件运行在 x.com
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "twitter_training_data.jsonl"

@app.post("/save")
async def save_data(request: Request):
    """接收并保存推文分析数据"""
    data = await request.json()
    analysis_result = data.get("analysis_result")
    
    # 检查是否有错误，有错误就不保存
    if analysis_result.get("error"):
        return {"status": "skipped", "reason": "analysis contains error"}
    
    # 构建简洁的训练数据格式，analysis只包含4个字段
    analysis_clean = {
        "rhetoric_score": analysis_result.get("rhetoric_score"),
        "manipulation_score": analysis_result.get("manipulation_score"),
        "label": analysis_result.get("label"),
        "reason": analysis_result.get("reason")
    }
    
    record = {
        "text": data.get("tweet_content"),
        "analysis": json.dumps(analysis_clean, ensure_ascii=False)
    }

    # 以 JSONL 格式追加写入文件
    with open(DATA_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

    # 统计总条数
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        total = sum(1 for _ in f)

    return {"status": "saved", "total_records": total}

@app.get("/stats")
async def get_stats():
    """获取数据统计"""
    if not os.path.exists(DATA_FILE):
        return {"total_records": 0, "file_size": 0}

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        total = sum(1 for _ in f)

    file_size = os.path.getsize(DATA_FILE)

    return {
        "total_records": total,
        "file_size": file_size,
        "file_path": os.path.abspath(DATA_FILE)
    }

@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "ok", "service": "rhetoric-lens-data-collector"}

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("🚀 Rhetoric Lens 数据收集服务已启动")
    print(f"📁 数据将保存至: {os.path.abspath(DATA_FILE)}")
    print(f"🌐 服务地址: http://127.0.0.1:8881")
    print(f"📊 统计接口: http://127.0.0.1:8881/stats")
    print("=" * 60)
    uvicorn.run(app, host="127.0.0.1", port=8881)
