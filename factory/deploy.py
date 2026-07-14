from pathlib import Path
from .adsense_manager import run_adsense_lock

def deployment_status(project_root:Path)->dict:
    lock=run_adsense_lock(project_root.resolve(),execute_repair=False,block_on_error=True)
    safe=bool(lock.get("pass"))
    return {
      "provider":"Cloudflare Pages",
      "mode":"git_push_auto_deploy",
      "git_connected":(project_root/".git").exists(),
      "manual_deploy_required":False,
      "safe_to_deploy":safe,
      "publisher_lock":lock,
      "instruction":("Publisher LOCK PASS. 선택 커밋 스크립트 실행 후 Cloudflare Pages 자동 배포." if safe
                     else "Publisher LOCK FAIL. 배포가 차단되었습니다."),
    }
