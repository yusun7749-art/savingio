from pathlib import Path

import factory.factory_core_runner as core


def test_core_runner_executes_all_stages_and_verifies_files(tmp_path, monkeypatch):
    calls=[]
    items=[{"slug":"sample","qa2_pass":True}]
    article=tmp_path/'articles'/'sample.html'
    article.parent.mkdir(parents=True)
    article.write_text('<html>ok</html>',encoding='utf-8')

    def runner(name):
        def _run(root,count,upstream):
            calls.append(name)
            if name=='cms':
                return {"pass":True,"items":[{"slug":"sample","article_path":"articles/sample.html"}]}
            return {"pass":True,"items":items}
        return _run

    monkeypatch.setattr(core,'STAGES',tuple(core.Stage(name,runner(name)) for name in core.DEFAULT_STAGES))
    report=core.run_factory_core(tmp_path,count=1,resume=False)
    assert report['pass'] is True
    assert calls==list(core.DEFAULT_STAGES)
    assert report['verified_articles']==['articles/sample.html']


def test_core_runner_stops_and_persists_failed_stage(tmp_path, monkeypatch):
    def ok(root,count,upstream): return {"pass":True,"items":[]}
    def bad(root,count,upstream): return {"pass":False,"status":"failed"}
    monkeypatch.setattr(core,'STAGES',(core.Stage('planning',ok),core.Stage('research',bad),core.Stage('writing',ok)))
    report=core.run_factory_core(tmp_path,count=1,resume=False)
    assert report['pass'] is False
    assert report['failed_stage']=='research'
    assert report['completed_stages']==['planning']


def test_core_runner_resumes_completed_stage(tmp_path, monkeypatch):
    calls=[]
    core.save_json(tmp_path/core.STATE_PATH,{"completed_stages":["planning"],"results":{"planning":{"pass":True,"items":[]}}})
    def planning(root,count,upstream): calls.append('planning'); return {"pass":True,"items":[]}
    def research(root,count,upstream): calls.append('research'); return {"pass":True,"items":[]}
    monkeypatch.setattr(core,'STAGES',(core.Stage('planning',planning),core.Stage('research',research)))
    report=core.run_factory_core(tmp_path,count=1,resume=True)
    assert report['pass'] is True
    assert calls==['research']


def test_cms_existing_article_is_protected(tmp_path):
    from factory.cms_hq import run_cms_queue
    draft=tmp_path/'factory/output/drafts/sample.html'
    draft.parent.mkdir(parents=True)
    draft.write_text('new',encoding='utf-8')
    article=tmp_path/'articles/sample.html'
    article.parent.mkdir(parents=True)
    article.write_text('old',encoding='utf-8')
    item={"topic":"sample","slug":"sample","qa2_pass":True,"draft_path":"factory/output/drafts/sample.html"}
    report=run_cms_queue(tmp_path,source_items=[item],overwrite=False)
    assert report['pass'] is False
    assert article.read_text(encoding='utf-8')=='old'


def test_manager_delegates_topic_runs_to_official_executor(tmp_path, monkeypatch):
    captured = {}

    def fake_executor(root, topics, *, evidence_files=None, limit=None):
        captured["root"] = root
        captured["topics"] = list(topics)
        captured["evidence_files"] = evidence_files
        captured["limit"] = limit
        return {
            "pass": True,
            "status": "content_ready",
            "blocked_stage": None,
            "stages": [{"name": "planning"}, {"name": "cms"}],
            "article_paths": ["articles/sample.html"],
        }

    import factory.core_factory_runner as executor
    monkeypatch.setattr(executor, "run_core_factory", fake_executor)

    report = core.run_factory_core(
        tmp_path,
        count=1,
        resume=False,
        topics=[" 전기요금  절약 "],
    )

    assert report["pass"] is True
    assert report["mode"] == "manager_executor"
    assert report["completed_stages"] == ["planning", "cms"]
    assert report["article_paths"] == ["articles/sample.html"]
    assert captured["topics"] == ["전기요금 절약"]
    assert captured["limit"] == 1
    assert (tmp_path / core.STATE_PATH).is_file()
    assert (tmp_path / core.REPORT_PATH).is_file()
