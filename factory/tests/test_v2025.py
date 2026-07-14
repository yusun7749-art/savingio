import sys, tempfile, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))

from factory.message_bus import DepartmentMessageBus
from factory.task_dispatcher import TaskDispatcher
from factory.rework_manager import ReworkManager
from factory.workflow_state import WorkflowStateManager
from factory.event_log import DepartmentEventLog
from factory.approval_checklist import build_final_checklist
from factory.operation_board import build_operation_board

class V2025Tests(unittest.TestCase):
    def test_message_bus(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            bus=DepartmentMessageBus(root)
            msg=bus.publish('planning','research','task.handoff',{'x':1},'wf')
            self.assertEqual(len(bus.pending('research')),1)
            ack=bus.acknowledge('research',msg['id'],{'ok':True})
            self.assertEqual(ack['status'],'acknowledged')

    def test_dispatcher(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            d=TaskDispatcher(root)
            task=d.create_workflow('전기요금')
            task=d.advance(task['workflow_id'],'planning',{'ok':True})
            self.assertEqual(task['current_department'],'research')

    def test_rework_routing(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            report=ReworkManager(root).assign('wf',['title_length','evidence_safety'])
            owners={x['department'] for x in report['requests']}
            self.assertEqual(owners,{'seo','research'})

    def test_workflow_state(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            m=WorkflowStateManager(root)
            m.create('wf','topic')
            m.transition('wf','running')
            m.transition('wf','waiting_approval')
            self.assertEqual(m.load('wf')['status'],'waiting_approval')
            with self.assertRaises(ValueError):
                m.transition('wf','completed')

    def test_approval_checklist(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            report=build_final_checklist({
                'plan':{'topic':'x'},
                'research':{'ready_for_publish':True},
                'qa':{'pass':True,'score':100},
                'image':{'ready':True},
                'supervisor':{'pass':True},
                'cms':{'article_path':'a.html'},
                'deploy':{'ready':True},
            },root)
            self.assertTrue(report['pass'])

    def test_operation_board(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            DepartmentEventLog(root).append('planning','done')
            board=build_operation_board(root)
            self.assertIn('departments',board)
            self.assertIn('recent_events',board)

if __name__=='__main__':
    unittest.main()
