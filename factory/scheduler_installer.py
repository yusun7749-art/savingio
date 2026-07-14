from __future__ import annotations
from pathlib import Path
from .utils import now_iso

def generate_scheduler_files(root: Path, hour: int=4, minute: int=30) -> dict:
    scripts=root/'factory'/'operations'/'scheduler'; scripts.mkdir(parents=True,exist_ok=True)
    run_path=(root/'factory'/'run.py').as_posix(); bat=scripts/'run-daily-analytics.bat'
    bat.write_text('@echo off\r\n'+f'cd /d "{root}"\r\n'+f'python "{run_path}" analytics-daily --execute-external\r\n',encoding='utf-8')
    ps1=scripts/'install-windows-task.ps1'; task_time=f'{hour:02d}:{minute:02d}'
    ps1.write_text('$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c \\"'+str(bat)+'\\""\n'+f'$Trigger = New-ScheduledTaskTrigger -Daily -At "{task_time}"\n'+'Register-ScheduledTask -TaskName "SavingioFactoryDailyAnalytics" -Action $Action -Trigger $Trigger -Description "Savingio Factory daily analytics" -Force\n',encoding='utf-8')
    cron=scripts/'cron.example'; cron.write_text(f'{minute} {hour} * * * cd {root} && python factory/run.py analytics-daily --execute-external\n',encoding='utf-8')
    return {'windows_bat':bat.relative_to(root).as_posix(),'windows_installer':ps1.relative_to(root).as_posix(),'cron_example':cron.relative_to(root).as_posix(),'time':task_time,'created_at':now_iso()}
