from __future__ import annotations
from pathlib import Path
import os
from .utils import now_iso

def build_service_readiness(project_root:Path):
    services={
      'wordpress':{'ready':all(os.getenv(x) for x in ['WORDPRESS_URL','WORDPRESS_USER','WORDPRESS_APP_PASSWORD']),'required_env':['WORDPRESS_URL','WORDPRESS_USER','WORDPRESS_APP_PASSWORD']},
      'cloudflare_api':{'ready':all(os.getenv(x) for x in ['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN','CLOUDFLARE_PAGES_PROJECT']),'required_env':['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN','CLOUDFLARE_PAGES_PROJECT']},
      'image_provider':{'ready':bool(os.getenv('OPENAI_API_KEY')),'required_env':['OPENAI_API_KEY']},
      'git_repository':{'ready':(project_root/'.git').exists(),'required_env':[]},
    }
    return {'services':services,'ready_count':sum(1 for x in services.values() if x['ready']),'total_count':len(services),'created_at':now_iso()}
