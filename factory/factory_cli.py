import argparse,json
from pipeline import execute
ap=argparse.ArgumentParser()
ap.add_argument("topic")
ap.add_argument("--project-root",default=".")
args=ap.parse_args()
print(json.dumps(execute(args.topic,args.project_root),indent=2))
