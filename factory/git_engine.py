from pathlib import Path
import subprocess, shlex

def build_selective_commands(files:list[str],message:str)->list[str]:
    clean=[x for x in dict.fromkeys(files) if x and x!='.']
    if not clean: raise ValueError('선택 파일이 없습니다.')
    quoted=' '.join('"'+x.replace('"','')+'"' for x in clean)
    return [f'git add -- {quoted}',f'git commit -m "{message.replace(chr(34),"")}"','git push']

def status(project_root:Path)->dict:
    p=subprocess.run(['git','status','--porcelain'],cwd=project_root,capture_output=True,text=True,check=False)
    return {'available':p.returncode==0,'changed':[x[3:].strip() for x in p.stdout.splitlines() if len(x)>=4]}

def write_script(project_root:Path,commands:list[str],name='factory-commit.cmd')->str:
    path=project_root/'factory'/'output'/name
    path.write_text('@echo off\n'+'\n'.join(commands)+'\n',encoding='utf-8')
    return path.relative_to(project_root).as_posix()
