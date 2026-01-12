"""
数据预处理脚本
用于清洗和准备训练数据
"""
import json
from collections import defaultdict
from datetime import datetime

INPUT_FILE = "twitter_training_data.jsonl"
OUTPUT_FILE = "cleaned_data.jsonl"


def load_data(filename):
    """加载 JSONL 数据"""
    records = []
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                try:
                    record = json.loads(line.strip())
                    records.append(record)
                except json.JSONDecodeError as e:
                    print(f"⚠️  行 {line_num} JSON 解析错误: {e}")
    except FileNotFoundError:
        print(f"❌ 文件不存在: {filename}")
        return []

    return records


def clean_data(records):
    """数据清洗"""
    print("\n📋 开始数据清洗...")

    # 统计信息
    stats = {
        'total': len(records),
        'duplicates': 0,
        'empty_input': 0,
        'invalid_output': 0,
        'errors': 0
    }

    # 去重 - 基于 input 内容
    seen = set()
    cleaned = []

    # 按标签分类统计
    label_counts = defaultdict(int)

    for record in records:
        # 检查必要字段
        if not record.get('input'):
            stats['empty_input'] += 1
            continue

        # 去重
        input_text = record['input']
        if input_text in seen:
            stats['duplicates'] += 1
            continue

        # 验证 output 格式
        try:
            output_data = json.loads(record.get('output', '{}'))

            # 检查是否有错误
            if output_data.get('error', False):
                stats['errors'] += 1
                continue

            # 检查必要字段
            if 'rhetoric_score' not in output_data or 'manipulation_score' not in output_data:
                stats['invalid_output'] += 1
                continue

            # 统计标签分布
            label = output_data.get('label', 'unknown')
            label_counts[label] += 1

        except json.JSONDecodeError:
            stats['invalid_output'] += 1
            continue

        seen.add(input_text)
        cleaned.append(record)

    print(f"✅ 原始记录: {stats['total']}")
    print(f"❌ 移除重复: {stats['duplicates']}")
    print(f"❌ 移除空输入: {stats['empty_input']}")
    print(f"❌ 移除无效输出: {stats['invalid_output']}")
    print(f"❌ 移除错误记录: {stats['errors']}")
    print(f"✅ 清洗后记录: {len(cleaned)}")

    print(f"\n📊 标签分布:")
    for label, count in sorted(label_counts.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / len(cleaned)) * 100 if cleaned else 0
        print(f"  {label}: {count} ({percentage:.1f}%)")

    return cleaned


def save_data(records, filename):
    """保存清洗后的数据"""
    with open(filename, 'w', encoding='utf-8') as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + '\n')
    print(f"\n💾 已保存至: {filename}")


def analyze_scores(records):
    """分析分数分布"""
    print("\n📈 分数分布分析:")

    rhetoric_scores = []
    manipulation_scores = []

    for record in records:
        try:
            output = json.loads(record['output'])
            rhetoric_scores.append(output.get('rhetoric_score', 0))
            manipulation_scores.append(output.get('manipulation_score', 0))
        except:
            continue

    if rhetoric_scores:
        print(f"\n修辞密度 (Rhetoric Score):")
        print(f"  平均值: {sum(rhetoric_scores) / len(rhetoric_scores):.2f}")
        print(f"  最小值: {min(rhetoric_scores)}")
        print(f"  最大值: {max(rhetoric_scores)}")
        print(f"  中位数: {sorted(rhetoric_scores)[len(rhetoric_scores)//2]}")

    if manipulation_scores:
        print(f"\n操纵指数 (Manipulation Score):")
        print(f"  平均值: {sum(manipulation_scores) / len(manipulation_scores):.2f}")
        print(f"  最小值: {min(manipulation_scores)}")
        print(f"  最大值: {max(manipulation_scores)}")
        print(f"  中位数: {sorted(manipulation_scores)[len(manipulation_scores)//2]}")

    # 风险等级分布
    risk_levels = defaultdict(int)
    for r, m in zip(rhetoric_scores, manipulation_scores):
        max_score = max(r, m)
        if max_score >= 8:
            risk_levels['高风险'] += 1
        elif max_score >= 5:
            risk_levels['中风险'] += 1
        else:
            risk_levels['低风险'] += 1

    print(f"\n风险等级分布:")
    for level, count in risk_levels.items():
        percentage = (count / len(rhetoric_scores)) * 100 if rhetoric_scores else 0
        print(f"  {level}: {count} ({percentage:.1f}%)")


def main():
    print("=" * 60)
    print("🔍 Rhetoric Lens 数据预处理工具")
    print("=" * 60)

    # 加载数据
    records = load_data(INPUT_FILE)
    if not records:
        print("❌ 没有找到数据，请先运行插件收集数据")
        return

    # 清洗数据
    cleaned = clean_data(records)

    if not cleaned:
        print("❌ 清洗后没有有效数据")
        return

    # 分析分数分布
    analyze_scores(cleaned)

    # 保存清洗后的数据
    save_data(cleaned, OUTPUT_FILE)

    print("\n" + "=" * 60)
    print("✅ 数据预处理完成！")
    print(f"💡 下一步: 使用 {OUTPUT_FILE} 进行模型训练")
    print("=" * 60)


if __name__ == "__main__":
    main()
