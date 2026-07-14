
import unittest
from factory.department_board import status
class T(unittest.TestCase):
    def test_status(self):
        self.assertEqual(len(status()),8)
