from pathlib import Path

def deployment_status(project_root:Path)->dict:
    return {'provider':'Cloudflare Pages','mode':'git_push_auto_deploy','git_connected':(project_root/'.git').exists(),
      'manual_deploy_required':False,'safe_to_deploy':True,
      'instruction':'Factory가 생성한 선택 커밋 스크립트를 검토한 뒤 실행하면 Cloudflare Pages가 자동 배포합니다.'}
