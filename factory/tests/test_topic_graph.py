from pathlib import Path
import json
from factory.topic_graph import expand_topics


def test_expand_topics_builds_connected_queue(tmp_path: Path):
    config = tmp_path / "factory" / "config"
    config.mkdir(parents=True)
    (config / "life_money_taxonomy.json").write_text(json.dumps({
        "version": "1",
        "brand_headline": "생활 속 돈 문제, 여기서 한 번에 해결하세요.",
        "categories": {"집·아파트": {"situations": {"누수": ["윗집 누수 책임", "누수 보험 확인"]}}}
    }, ensure_ascii=False), encoding="utf-8")
    report = expand_topics(tmp_path)
    assert report["pass"] is True
    assert report["topic_count"] == 2
    assert (tmp_path / report["topics_file"]).is_file()
    graph = json.loads((tmp_path / report["graph_file"]).read_text(encoding="utf-8"))
    assert any(edge["type"] == "next_question" for edge in graph["edges"])
