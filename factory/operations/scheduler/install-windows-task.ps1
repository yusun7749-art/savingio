$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c \"/mnt/data/savingio_v2035_real_work/savingio-live/factory/operations/scheduler/run-daily-analytics.bat\""
$Trigger = New-ScheduledTaskTrigger -Daily -At "04:30"
Register-ScheduledTask -TaskName "SavingioFactoryDailyAnalytics" -Action $Action -Trigger $Trigger -Description "Savingio Factory daily analytics" -Force
